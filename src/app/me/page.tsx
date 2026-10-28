import { redirect } from 'next/navigation';
import { allow, WrongRole } from '@/components/ui';
import { latestRecapSessionId } from '@/lib/queries';

export default async function MePage() {
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path="/me" />;
  const id = await latestRecapSessionId(persona.userId);
  redirect(id ? `/me/recap/${id}` : '/me/sessions');
}
