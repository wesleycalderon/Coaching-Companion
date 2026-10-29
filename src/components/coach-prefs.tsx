import type { CoachPreferences } from '@/lib/domain';

/** The coach's companion preferences, used on the welcome and settings screens. */
export function CoachPrefsFields({ prefs }: { prefs: Partial<CoachPreferences> }) {
  return (
    <>
      <div className="grid grid--2">
        <div className="field"><label className="ecb-form-label" htmlFor="rev">Remind me to review summaries</label><select id="rev" name="reviewReminder" className="ecb-form-select" defaultValue={prefs.reviewReminder ?? '24h'}><option value="24h">Within 24 hours</option><option value="48h">Within 48 hours</option></select></div>
        <div className="field"><label className="ecb-form-label" htmlFor="rem">Where the companion messages me</label><select id="rem" name="reminderChannel" className="ecb-form-select" defaultValue={prefs.reminderChannel === 'slack' ? 'slack' : 'email'}><option value="slack">BTS Slack</option><option value="email">Email</option></select></div>
      </div>
      <label className="check"><input type="checkbox" role="switch" name="showPracticeFeedback" defaultChecked={prefs.showPracticeFeedback ?? true} /> Show practice feedback on my sessions</label>
      <label className="check"><input type="checkbox" role="switch" name="draftPlans" defaultChecked={prefs.draftPlans ?? true} /> Draft a plan before each session</label>
    </>
  );
}
