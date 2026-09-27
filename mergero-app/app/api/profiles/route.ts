import { database, identity, json, readBody, failure } from '@/lib/server';
import { profileSchema, DEMO_MODEL } from '@/lib/assessment';
export const dynamic='force-dynamic';
export async function GET(){
 try {
  const owner=await identity();if(!owner)return json({error:'Sign in to view saved profiles.'},401);
  const {results}=await database().prepare('SELECT id,data,model_version,view_count,created_at,updated_at FROM profiles WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 100').bind(owner).all<{id:string;data:string;model_version:string;view_count:number;created_at:string;updated_at:string}>();
  return json({profiles:results.map(r=>({...JSON.parse(r.data),id:r.id,modelVersion:r.model_version,viewCount:r.view_count,createdAt:r.created_at,updatedAt:r.updated_at}))});
 }catch(e){return failure(e);}
}
export async function POST(req:Request){
 try {
  const owner=await identity();if(!owner)return json({error:'Sign in to save a profile.'},401);
  const parsed=profileSchema.safeParse(await readBody(req));
  if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Please check your entries.'},400);
  const data=parsed.data, id=crypto.randomUUID(), stamp=new Date().toISOString();
  await database().prepare('INSERT INTO profiles (id,owner_id,data,model_version,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(id,owner,JSON.stringify(data),DEMO_MODEL.version,stamp,stamp).run();
  return json({profile:{...data,id,modelVersion:DEMO_MODEL.version,createdAt:stamp,updatedAt:stamp}},201);
 }catch(e){return failure(e);}
}
