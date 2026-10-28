// The BiTSy AI coaches (agents, not people) this app offers, by their BiTSy agent id, and which one fits an action.
// Names and one-line descriptions only: each coach's method lives in BiTSy.

export interface Coach {
  id: string;
  name: string;
  /** What the coach helps with, for the coachee choosing one. */
  helps: string;
  /** Words in an action that suggest this coach. */
  cues: RegExp;
}

export const COACHES: Coach[] = [
  { id: 'listening_skills_coach', name: 'Listening', helps: 'Listen and ask before you speak, with practices to try in your next conversation.', cues: /\b(listen|question|curio|ask(ing)? (before|first)|open question)/i },
  { id: 'give_feedback_coach', name: 'Giving feedback', helps: 'Plan feedback that lands, then try it out in a role play.', cues: /\bfeedback\b/i },
  { id: 'delegate_coach', name: 'Delegating', helps: 'Hand work over with clear outcomes and the right amount of support.', cues: /\b(delegat|hand(ing)? (over|off|it|the)|handover|let .* own)/i },
  { id: 'hold_accountable_coach', name: 'Holding others accountable', helps: 'Prepare a conversation about a missed expectation and agree next steps.', cues: /\b(accountab|deadline|missed|follow[- ]through|expectation)/i },
  { id: 'prioritise_coach', name: 'Prioritising', helps: 'Sort what matters when everything feels urgent.', cues: /\b(priorit|time|busy|calendar|focus)/i },
  { id: 'practice_conversation_coach', name: 'Practise a difficult conversation', helps: 'Rehearse a conversation you are dreading, with feedback.', cues: /\b(difficult|tough|hard) conversation/i },
  { id: 'rebuild_trust_coach', name: 'Rebuilding trust', helps: 'Work out what would rebuild trust in a key relationship.', cues: /\btrust\b/i },
  { id: 'influence_coach', name: 'Influencing', helps: 'Bring others with you without overpowering them.', cues: /\b(influenc|persuad|buy-in|convinc)/i },
  { id: 'lead_coaching_coach', name: 'Coaching your team', helps: 'Run coaching conversations that help others find their own answers.', cues: /\b(coach(ing)? (my|the|a) (team|report|direct))/i },
  { id: 'craft_story_coach', name: 'Telling a story', helps: 'Shape a story that inspires your team.', cues: /\b(story|inspir|vision)/i },
  { id: 'build_resilience_coach', name: 'Resilience', helps: 'Recover your footing after a setback.', cues: /\b(setback|resilien|confidence)/i },
  { id: 'insight_action_coach', name: 'Think it through', helps: 'Step back, think a situation through and decide what to do next.', cues: /$^/ },
];

export const DEFAULT_COACH = 'insight_action_coach';

export const coachById = (id: string) => COACHES.find((c) => c.id === id) ?? COACHES.find((c) => c.id === DEFAULT_COACH)!;

/** The coach that fits an action best. A set-aside action for lack of time goes to prioritising. */
export function recommendCoach(action: { ifThenText: string; title: string; status?: string; setAsideReason?: string | null } | null): string {
  if (!action) return DEFAULT_COACH;
  if (action.status === 'set_aside' && action.setAsideReason === 'time_pressure') return 'prioritise_coach';
  const text = `${action.title} ${action.ifThenText}`;
  return COACHES.find((c) => c.cues.test(text))?.id ?? DEFAULT_COACH;
}
