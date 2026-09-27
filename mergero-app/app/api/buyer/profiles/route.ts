import { database, identity, json, failure } from '@/lib/server';
import { estimate, type ProfileInput } from '@/lib/assessment';
export const dynamic='force-dynamic';
type Stored = ProfileInput & { id:string; createdAt:string; updatedAt:string; modelVersion:string };
export async function GET(req:Request) {
  try {
    const buyer=await identity();
    if(!buyer)return json({error:'Sign in to access the buyer portal.'},401);
    const url=new URL(req.url); const industry=url.searchParams.get('industry')?.slice(0,80).trim().toLowerCase()||'';
    const location=url.searchParams.get('location')?.slice(0,100).trim().toLowerCase()||'';
    const minRevenue=Number(url.searchParams.get('minRevenue')||0);
    const {results}=await database().prepare('SELECT id,data,model_version,created_at,updated_at FROM profiles ORDER BY updated_at DESC LIMIT 250').all<{id:string;data:string;model_version:string;created_at:string;updated_at:string}>();
    const profiles=results.map(r=>({...(JSON.parse(r.data) as ProfileInput),id:r.id,modelVersion:r.model_version,createdAt:r.created_at,updatedAt:r.updated_at}) as Stored)
      .filter(p=>p.buyerVisible && (!industry||p.assessment.industry.toLowerCase()===industry) && (!location||p.assessment.location.toLowerCase().includes(location)) && (Number.isFinite(minRevenue)?p.assessment.revenue>=minRevenue:true))
      .map(p=>({id:p.id,company:p.company,industry:p.assessment.industry,location:p.assessment.location,revenue:p.assessment.revenue,profit:p.assessment.profit,employees:p.assessment.employees,year:p.assessment.year,estimate:estimate(p.assessment),successorPriorities:p.successorPriorities??null,culture:p.cultureShareConsent?p.culture:null,contact:p.contactConsent?{email:p.email}:null,updatedAt:p.updatedAt}));
    return json({profiles});
  }catch(e){return failure(e);}
}
