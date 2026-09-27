import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export function database() { if(!env.DB) throw new Error('Profile storage is unavailable.'); return env.DB; }
export async function identity() { const user = await getChatGPTUser(); return user?.userId ?? null; }
export function json(data: unknown, status=200) { return Response.json(data,{status,headers:{'Cache-Control':'no-store'}}); }
export async function readBody(req: Request) {
  const origin=req.headers.get('origin');
  if(!origin || origin !== new URL(req.url).origin) throw new Error('ORIGIN');
  if(!req.headers.get('content-type')?.includes('application/json')) throw new Error('CONTENT');
  if(Number(req.headers.get('content-length')||0)>30000) throw new Error('SIZE');
  const reader=req.body?.getReader(); if(!reader) throw new Error('CONTENT');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>30000){await reader.cancel();throw new Error('SIZE');}chunks.push(value);}
  const joined=new Uint8Array(size);let offset=0;for(const c of chunks){joined.set(c,offset);offset+=c.length;}
  return JSON.parse(new TextDecoder().decode(joined));
}
export function failure(error: unknown) {
  const code=error instanceof Error?error.message:'';
  if(['ORIGIN','CONTENT','SIZE'].includes(code)||error instanceof SyntaxError)return json({error:'Invalid request. Please reload and try again.'},400);
  console.error('Profile operation unavailable');
  return json({error:'We could not access profile storage. Your entries are still here. Please try again.'},503);
}
