import GuidedQuickCheck from './guided-quick-check';
import { getChatGPTUser } from './chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getChatGPTUser();
  return <GuidedQuickCheck signedIn={!!user} />;
}
