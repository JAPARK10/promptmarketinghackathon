import QuickCheck from '@/app/quick-check';
import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
export default async function SellerPage(){
 const seller=await getChatGPTUser();
 if(!seller)return <main className="buyer-login"><a className="brand" href="/">mergero<span className="brand-dot">.</span></a><section><span className="eyebrow">SELLER ACCOUNT</span><h1>Keep your profile on record.</h1><p>Sign in to manage the business profiles you saved, including visibility and contact choices.</p><a className="link-button" href={chatGPTSignInPath('/seller')} target="_top">Create or sign in to your account</a></section></main>;
 return <QuickCheck signedIn initialTab="profiles"/>;
}
