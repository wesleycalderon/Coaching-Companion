// Sample mode: pre-written coach replies used when BiTSy isn't configured, so the flow can be
// demonstrated offline. Synthetic and generic; they don't reproduce BiTSy's prompts. Labelled
// "Sample output" wherever they appear.

const SCRIPTS: Record<string, string[]> = {
  listening_skills_coach: [
    "Thanks for the context. When you think about the moment just before you shared your view, what was happening for you?",
    "That pull to give the answer is common for leaders who are used to solving things. One practice: before you speak, ask one more question than feels natural, then summarise what you heard before adding your view. Which meeting this week could you try that in?",
    "Good choice. A simple cue can help: write the questions you want to ask on the agenda before the meeting starts, and tick each one off as you ask it. What would tell you afterwards that it worked?",
    "That's a clear way to check it. To sum up: ask before advising, summarise before you add your view, and use the agenda as your cue. If you'd like to make this a new action, propose it to your coach below in your own words.",
  ],
  delegate_coach: [
    "Thanks for sharing that. This handover is a good place to practise delegating. What outcome does the work need to achieve, in a sentence?",
    "That's clear. Delegating well usually means agreeing the outcome, the decisions the other person can make, and when you'll check in. Which decisions could they make on their own?",
    "That gives them real ownership. How will you resist checking every detail before it goes out?",
    "A planned check-in instead of a line-by-line review sounds right. If you'd like to make this a new action, propose it to your coach below in your own words.",
  ],
  give_feedback_coach: [
    "Thanks for the context. Before the conversation, it helps to be specific about what you observed. What did the person do, in a sentence, without interpretation?",
    "Good, that's factual. Next, what impact did it have on the team or the work?",
    "That's the heart of it. How could you invite their view before agreeing what happens next?",
    "You have the outline of a clear conversation. If you'd like to make this a new action, propose it to your coach below in your own words.",
  ],
  prioritise_coach: [
    "A busy week can push everything out. Let's look at what's on your plate. What are the three things taking most of your time right now?",
    "Of those, which one only you can do, and which could wait or move to someone else?",
    "That frees some room. Where in the next few days could this action fit, given that?",
    "That sounds realistic. If you'd like to change your action to fit, propose it to your coach below in your own words.",
  ],
};

const GENERIC = [
  "Thanks for the context. What's the most important part of this for you right now?",
  "That helps. What have you already tried, and what happened?",
  "What's one small thing you could try in the next few days?",
  "That's a concrete step. If you'd like to make it a new action, propose it to your coach below in your own words.",
];

export function sampleReply(agentName: string, coachTurnsSoFar: number): string {
  const script = SCRIPTS[agentName] ?? GENERIC;
  return script[Math.min(coachTurnsSoFar, script.length - 1)];
}

export function sampleInsights(agentName: string) {
  const topics: Record<string, string[]> = {
    listening_skills_coach: ['Asking before advising', 'Using the agenda as a cue'],
    delegate_coach: ['Agreeing the outcome', 'Planned check-ins instead of reviews'],
    give_feedback_coach: ['Describing what you observed', 'Inviting the other view'],
    prioritise_coach: ['What only you can do', 'Making room for the action'],
  };
  return { keyTopics: topics[agentName] ?? ['Next steps'], insights: [] as string[] };
}
