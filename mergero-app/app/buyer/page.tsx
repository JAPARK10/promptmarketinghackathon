import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import BuyerPortal from './portal';
export const dynamic='force-dynamic';
export default async function BuyerPage(){
  const buyer=await getChatGPTUser();
  if(!buyer)return <main className="buyer-login"><a className="brand" href="/">mergero<span className="brand-dot">.</span></a><section><span className="eyebrow">BUYER PORTAL</span><h1>Find the right next chapter.</h1><p>Browse profiles that business owners have chosen to share with buyers.</p><a className="link-button" href={chatGPTSignInPath('/buyer')} target="_top">Sign in as a buyer</a><small>Access should be restricted to approved buyers before public launch.</small></section></main>;
  return <BuyerPortal buyerName={buyer.displayName}/>;
}
