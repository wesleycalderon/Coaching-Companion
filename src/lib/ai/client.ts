// Runs one AI task. With Anthropic credentials it calls Claude with structured outputs; without
// them it returns pre-written sample output for the seeded demo transcript only, and the
// review screen says so. Never used for anything but synthetic transcripts.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { z } from 'zod';
import { ANTHROPIC_MODEL } from '@/config';
import { renderPrompt, type TaskName } from './prompts';

export type AiProvider = 'anthropic' | 'sample';

export class AiError extends Error {}

/** "sample" when no Anthropic credentials are set, or when AI_MODE=sample forces it. */
export function aiProvider(): AiProvider {
  if (process.env.AI_MODE === 'sample') return 'sample';
  return process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? 'anthropic' : 'sample';
}

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

type Effort = 'low' | 'medium' | 'high';

export interface TaskResult<T> {
  output: T;
  provider: AiProvider;
  model: string;
}

export async function runTask<S extends z.ZodType>(
  task: TaskName,
  vars: Record<string, string>,
  schema: S,
  opts: { effort: Effort; transcriptHash: string },
): Promise<TaskResult<z.infer<S>>> {
  if (aiProvider() === 'sample') {
    const sample = findSample(opts.transcriptHash);
    if (!sample) {
      throw new AiError('No Anthropic API key is set, so only the seeded sample transcript can be analyzed. Add ANTHROPIC_API_KEY to .env to analyze other transcripts.');
    }
    return { output: schema.parse(sample[task]), provider: 'sample', model: 'sample output' };
  }

  const { system, user } = renderPrompt(task, vars);
  let response;
  try {
    response = await anthropic().beta.messages.parse({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      // If the model declines, the API reruns the request on its default fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: opts.effort, format: betaZodOutputFormat(schema) },
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new AiError('The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.');
    if (e instanceof Anthropic.RateLimitError) throw new AiError('The AI service is busy. Try the upload again in a minute.');
    if (e instanceof Anthropic.APIError) throw new AiError(`The AI service returned an error (${e.status}). Try again in a few minutes.`);
    throw e;
  }
  // Token use per task, for cost checks in the server log.
  console.log(`[ai] ${task} · ${response.model} · ${response.usage.input_tokens} in / ${response.usage.output_tokens} out · ${response.stop_reason}`);
  if (response.stop_reason === 'refusal') throw new AiError('The AI declined to analyze this transcript. Add your notes to the session instead.');
  if (response.stop_reason === 'max_tokens') throw new AiError('The AI response was cut short. Try again, or upload a shorter transcript.');
  if (!response.parsed_output) throw new AiError("We couldn't read the AI response. Try the upload again.");
  return { output: response.parsed_output as z.infer<S>, provider: 'anthropic', model: response.model };
}

/** Pre-written outputs for a known synthetic transcript, matched by content hash. */
function findSample(transcriptHash: string): Record<TaskName, unknown> | null {
  const dir = join(process.cwd(), 'prisma/seed-data/ai-samples');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (data.transcriptSha256 === transcriptHash) return data.outputs;
  }
  return null;
}
