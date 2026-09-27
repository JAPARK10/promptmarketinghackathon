"""Local YouTube discovery and review engine. Python 3.11+, no dependencies."""
import argparse
import getpass
import json
import os
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


def now():
    return datetime.now(timezone.utc).isoformat()


def connect(path):
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.executescript("""
      CREATE TABLE IF NOT EXISTS creators (
        id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'candidate',
        reason TEXT NOT NULL DEFAULT '', reviewed_at TEXT,
        channel_json TEXT, fetched_at TEXT);
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY, creator_id TEXT NOT NULL,
        data_json TEXT NOT NULL, fetched_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS discoveries (
        creator_id TEXT NOT NULL, video_id TEXT NOT NULL, query TEXT NOT NULL,
        fetched_at TEXT NOT NULL, PRIMARY KEY(creator_id, video_id, query));
      CREATE TABLE IF NOT EXISTS reviews (
        creator_id TEXT NOT NULL, status TEXT NOT NULL,
        reason TEXT NOT NULL, reviewed_at TEXT NOT NULL);
    """)
    # Conservative expiration for cached API material. Human review decisions persist.
    cutoff = (datetime.now(timezone.utc) - timedelta(days=29)).isoformat()
    with db:
        db.execute('DELETE FROM videos WHERE fetched_at < ?', (cutoff,))
        db.execute('DELETE FROM discoveries WHERE fetched_at < ?', (cutoff,))
        db.execute('UPDATE creators SET channel_json=NULL, fetched_at=NULL WHERE fetched_at < ?', (cutoff,))
    return db


class YouTube:
    def __init__(self, key, max_requests=40):
        self.key = key
        self.max_requests = max_requests
        self.requests = 0

    def get(self, endpoint, **params):
        for attempt in range(3):
            if self.requests >= self.max_requests:
                raise RuntimeError('Request budget reached. Saved results remain available.')
            self.requests += 1
            url = 'https://www.googleapis.com/youtube/v3/' + endpoint + '?' + urllib.parse.urlencode(params)
            request = urllib.request.Request(url, headers={'X-Goog-Api-Key': self.key})
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    return json.load(response)
            except urllib.error.HTTPError as exc:
                if exc.code in (429, 500, 502, 503, 504) and attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                # Never print response URLs, credentials, or arbitrary remote errors.
                raise RuntimeError(f'YouTube HTTP {exc.code}. Check API enablement, key restrictions and quota in Google Cloud.') from None
            except (urllib.error.URLError, TimeoutError):
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                raise RuntimeError('Could not reach YouTube after three attempts. Check network access.') from None
        raise RuntimeError('YouTube request failed.')


def batches(values, size=50):
    values = list(values)
    for start in range(0, len(values), size):
        yield values[start:start + size]


def enrich(db, api, channel_ids, video_ids):
    for ids in batches(channel_ids):
        result = api.get('channels', part='snippet,statistics', id=','.join(ids))
        stamp = now()
        with db:
            # A successful response omitting an ID means its old data is unavailable.
            db.executemany('UPDATE creators SET channel_json=NULL, fetched_at=NULL WHERE id=?', [(i,) for i in ids])
            for item in result.get('items', []):
                db.execute('UPDATE creators SET channel_json=?, fetched_at=? WHERE id=?',
                           (json.dumps(item, ensure_ascii=False), stamp, item['id']))
    for ids in batches(video_ids):
        result = api.get('videos', part='snippet,statistics,contentDetails', id=','.join(ids))
        stamp = now()
        with db:
            db.executemany('DELETE FROM videos WHERE id=?', [(i,) for i in ids])
            for item in result.get('items', []):
                db.execute('INSERT OR REPLACE INTO videos VALUES (?,?,?,?)',
                           (item['id'], item['snippet']['channelId'], json.dumps(item, ensure_ascii=False), stamp))


def discover(db, api, queries, language, region, pages=1, days=180):
    after = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace('+00:00', 'Z')
    for query in queries:
        token = None
        for _ in range(pages):
            params = dict(part='snippet', type='video', q=query, maxResults=25,
                          relevanceLanguage=language, regionCode=region,
                          publishedAfter=after, order='relevance')
            if token:
                params['pageToken'] = token
            result = api.get('search', **params)
            channels, videos = set(), set()
            with db:
                for item in result.get('items', []):
                    channel = item['snippet']['channelId']
                    video = item['id'].get('videoId')
                    if not video:
                        continue
                    existing = db.execute('SELECT status FROM creators WHERE id=?', (channel,)).fetchone()
                    if existing and existing['status'] == 'blocked':
                        continue
                    db.execute('INSERT OR IGNORE INTO creators(id) VALUES (?)', (channel,))
                    db.execute('INSERT OR REPLACE INTO discoveries VALUES (?,?,?,?)', (channel, video, query, now()))
                    channels.add(channel)
                    videos.add(video)
            enrich(db, api, channels, videos)
            print(f'Saved results for query: {query}', file=sys.stderr)
            token = result.get('nextPageToken')
            if not token:
                break


def review(db, creator_id, status, reason):
    if not reason.strip():
        raise ValueError('A review reason is required.')
    if status not in ('candidate', 'approved', 'blocked'):
        raise ValueError('Invalid review status.')
    stamp = now()
    with db:
        cursor = db.execute('UPDATE creators SET status=?,reason=?,reviewed_at=? WHERE id=?', (status, reason, stamp, creator_id))
        if not cursor.rowcount:
            raise ValueError('Unknown channel ID. Run discovery or list first.')
        db.execute('INSERT INTO reviews VALUES (?,?,?,?)', (creator_id, status, reason, stamp))
        if status == 'blocked':
            db.execute('DELETE FROM videos WHERE creator_id=?', (creator_id,))
            db.execute('DELETE FROM discoveries WHERE creator_id=?', (creator_id,))
            db.execute('UPDATE creators SET channel_json=NULL, fetched_at=NULL WHERE id=?', (creator_id,))


def records(db, status):
    where = '' if status == 'all' else ' WHERE status=?'
    rows = db.execute('SELECT * FROM creators' + where + ' ORDER BY id', () if status == 'all' else (status,))
    for row in rows:
        record = dict(row)
        record['youtube_url'] = 'https://www.youtube.com/channel/' + row['id']
        record['source'] = 'YouTube; raw API data, no derived score'
        record['channel'] = json.loads(record.pop('channel_json') or 'null')
        record['evidence'] = [dict(v) for v in db.execute('SELECT video_id, query, fetched_at FROM discoveries WHERE creator_id=?', (row['id'],))]
        record['videos'] = [dict(data=json.loads(v['data_json']), fetched_at=v['fetched_at']) for v in db.execute('SELECT data_json, fetched_at FROM videos WHERE creator_id=?', (row['id'],))]
        yield record


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', default='prenew.sqlite3')
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ('discover', 'refresh'):
        p = sub.add_parser(name)
        p.add_argument('--max-requests', type=int, default=40, choices=range(1, 501), metavar='1..500')
        if name == 'discover':
            p.add_argument('--config', default='queries.json')
    p = sub.add_parser('list')
    p.add_argument('--status', choices=['candidate', 'approved', 'blocked', 'all'], default='candidate')
    p = sub.add_parser('review')
    p.add_argument('channel_id')
    p.add_argument('status', choices=['candidate', 'approved', 'blocked'])
    p.add_argument('--reason', required=True)
    args = parser.parse_args(argv)
    db = connect(args.db)
    try:
        if args.command == 'list':
            print(json.dumps(list(records(db, args.status)), ensure_ascii=False, indent=2))
        elif args.command == 'review':
            review(db, args.channel_id, args.status, args.reason)
            print('Review saved.')
        else:
            config = None
            if args.command == 'discover':
                config = json.loads(Path(args.config).read_text(encoding='utf-8'))
                queries = config['queries']
                if not isinstance(queries, list) or not queries or any(not isinstance(q, str) or not q.strip() for q in queries):
                    raise ValueError('queries must be a nonempty list of search strings.')
                if not re.fullmatch('[A-Z]{2}', config['region']) or not re.fullmatch('[a-z]{2}(?:-[A-Za-z]+)?', config['language']):
                    raise ValueError('Use a two-letter uppercase region and supported language code.')
                if not 1 <= config.get('pages', 1) <= 5 or not 1 <= config.get('days', 180) <= 3650:
                    raise ValueError('pages must be 1..5; days must be 1..3650.')
            key = os.environ.get('YOUTUBE_API_KEY') or getpass.getpass('YouTube API key (hidden, not saved): ')
            if not key.strip():
                raise ValueError('A YouTube API key is required for live discovery or refresh.')
            api = YouTube(key.strip(), args.max_requests)
            try:
                if config:
                    discover(db, api, queries, config['language'], config['region'], config.get('pages', 1), config.get('days', 180))
                else:
                    ids = [r['id'] for r in db.execute("SELECT id FROM creators WHERE status != 'blocked'")]
                    video_ids = [r[0] for r in db.execute("SELECT DISTINCT d.video_id FROM discoveries d JOIN creators c ON c.id=d.creator_id WHERE c.status != 'blocked'")]
                    enrich(db, api, ids, video_ids)
            finally:
                print(f'HTTP requests attempted: {api.requests}. This is not a quota-unit estimate.', file=sys.stderr)
    finally:
        db.close()


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, sqlite3.Error) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        sys.exit(1)
