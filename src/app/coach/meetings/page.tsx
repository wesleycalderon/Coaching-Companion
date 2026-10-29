import { redirect } from 'next/navigation';

// Coaches see their own meetings on My practice.
export default function CoachMeetingsIndex() {
  redirect('/coach/practice#meetings');
}
