import { database, identity, json, readBody, failure } from '@/lib/server';
import { permissionsSchema, type ProfileInput } from '@/lib/assessment';
type Context={params:Promise<{id:string}>};
export async function PATCH(req:Request,context:Context){
 try{
  const owner=await identity();if(!owner)return json({error:'Sign in first.'},401);
  const parsed=permissionsSchema.safeParse(await readBody(req));if(!parsed.success)return json({error:'Invalid permissions.'},400);
  const {id}=await context.params;
  const row=await database().prepare('SELECT data FROM profiles WHERE id=? AND owner_id=?').bind(id,owner).first<{data:string}>();
  if(!row)return json({error:'Profile not found.'},404);
  const old=JSON.parse(row.data) as ProfileInput;
  if(parsed.data.cultureShareConsent&&!old.culture)return json({error:'No culture statement is available to share.'},400);
  await database().prepare('UPDATE profiles SET data=?,updated_at=? WHERE id=? AND owner_id=?').bind(JSON.stringify({...old,...parsed.data,buyerVisible:parsed.data.buyerVisible ?? old.buyerVisible}),new Date().toISOString(),id,owner).run();
  return json({ok:true});
 }catch(e){return failure(e);}
}
export async function DELETE(req:Request,context:Context){
 try{
  const owner=await identity();if(!owner)return json({error:'Sign in first.'},401);
  await readBody(req); const {id}=await context.params;
  await database().prepare('DELETE FROM profiles WHERE id=? AND owner_id=?').bind(id,owner).run();
  return json({ok:true});
 }catch(e){return failure(e);}
}
