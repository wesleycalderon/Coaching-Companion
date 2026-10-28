import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toVtt, zoomSecret, zoomSimulatorOn } from '@/lib/integrations/zoom';
import { parseTranscript } from '@/lib/transcript';

// Local stand-in for Zoom's transcript download URL. Only when ZOOM_SIMULATOR=true outside
// production. Serves the session's synthetic fixture as a Zoom-style VTT file.
const FIXTURES: Record<string, string> = { 'eng-amara-s2': 'amara-session-2.txt' };

export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  if (!zoomSimulatorOn()) return new Response('Not found', { status: 404 });
  if (req.headers.get('authorization') !== `Bearer sim-${zoomSecret()}`) return new Response('Unauthorized', { status: 401 });
  const file = FIXTURES[params.sessionId];
  if (!file) return new Response('No synthetic transcript for this session', { status: 404 });
  const text = readFileSync(join(process.cwd(), 'prisma/seed-data/transcripts', file), 'utf8');
  return new Response(toVtt(parseTranscript(text, file)), { headers: { 'content-type': 'text/vtt' } });
}
