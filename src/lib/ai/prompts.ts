// Loads /prompts/<task>.md and fills {{placeholders}}. Read on every call, so edits to a
// prompt file apply on the next upload without a restart.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type TaskName = 'speaker-roles' | 'session-summary' | 'action-extraction' | 'action-follow-up' | 'nudge-writer' | 'ask-the-ai' | 'next-session-plan' | 'practice-feedback' | 'work-meeting-check' | 'coach-meeting-practice';

const dir = () => join(process.cwd(), 'prompts');

export function renderPrompt(task: TaskName, vars: Record<string, string>) {
  const raw = readFileSync(join(dir(), `${task}.md`), 'utf8');
  const rules = readFileSync(join(dir(), '_rules.md'), 'utf8').trim();
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    if (k === 'rules') return rules;
    if (!(k in vars)) throw new Error(`Prompt ${task} needs a value for {{${k}}}`);
    return vars[k];
  });
  const system = raw.split(/^## System\s*$/m)[1]?.split(/^## User\s*$/m)[0];
  const user = raw.split(/^## User\s*$/m)[1];
  if (!system || !user) throw new Error(`Prompt ${task} needs "## System" and "## User" sections`);
  return { system: fill(system).trim(), user: fill(user).trim() };
}
