import { CompanionChat } from '@/components/companion-chat';
import { db } from '@/lib/db';
import { currentPersona } from '@/lib/persona';

// Artboard 1, now live (milestone 3): the coachee's companion chat, rendered from stored
// messages. Shows the current coachee view, or Priya Raman for other roles; ?coachee=<id> picks one.
export default async function SlackDmPage({ searchParams }: { searchParams: { coachee?: string } }) {
  const persona = currentPersona();
  const wanted = searchParams.coachee ?? (persona.role === 'coachee' ? persona.userId : 'priya');
  const user = await db.user.findFirst({ where: { id: wanted, role: 'coachee' } });
  return <CompanionChat coacheeId={user?.id ?? 'priya'} />;
}
