import { database, identity, json, failure } from '@/lib/server';
import type { ProfileInput } from '@/lib/assessment';
type Context={params:Promise<{id:string}>};
export async function POST(_:Request, context:Context){
 try {
  const buyer=await identity(); if(!buyer)return json({error:'Sign in to view profiles.'},401);
  const {id}=await context.params;
  const profile=await database().prepare('SELECT owner_id,data FROM profiles WHERE id=?').bind(id).first<{owner_id:string;data:string}>();
  if(!profile || !(JSON.parse(profile.data) as ProfileInput).buyerVisible)return json({error:'Profile not found.'},404);
  if(profile.owner_id!==buyer){
   const inserted=await database().prepare('INSERT OR IGNORE INTO profile_views (profile_id,buyer_id,viewed_at) VALUES (?,?,?)').bind(id,buyer,new Date().toISOString()).run();
   if(inserted.meta.changes) await database().prepare('UPDATE profiles SET view_count=view_count+1 WHERE id=?').bind(id).run();
  }
  return json({ok:true});
 }catch(e){return failure(e);}
}
