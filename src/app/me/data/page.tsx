import { CoacheeShell, MyDataSection } from '@/components/coachee';
import { allow, WrongRole } from '@/components/ui';

export default function MyDataPage() {
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path="/me/data" />;
  return (
    <CoacheeShell userId={persona.userId} current="/me/data">
      <MyDataSection userId={persona.userId} />
    </CoacheeShell>
  );
}
