import { NextResponse } from 'next/server';
import { handleTranscriptCompleted, urlValidationResponse, verifyZoomRequest, zoomSecret, type ZoomEvent } from '@/lib/integrations/zoom';

// Zoom event webhook. Configure in the Zoom app as https://<host>/api/integrations/zoom/webhook
// with the event "recording.transcript_completed".
export async function POST(req: Request) {
  const secret = zoomSecret();
  if (!secret) return NextResponse.json({ error: 'Zoom integration is not configured' }, { status: 503 });
  const raw = await req.text();
  let evt: ZoomEvent;
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!verifyZoomRequest(secret, req.headers.get('x-zm-request-timestamp'), req.headers.get('x-zm-signature'), raw)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  if (evt.event === 'endpoint.url_validation' && evt.payload?.plainToken) {
    return NextResponse.json(urlValidationResponse(secret, evt.payload.plainToken));
  }
  if (evt.event === 'recording.transcript_completed') {
    // Reply straight away; analysis can take a minute. STUB: a queue in production.
    void handleTranscriptCompleted(evt)
      .then((status) => console.log(`[zoom] ${status}`))
      .catch((e) => console.error('[zoom] transcript handling failed', e));
    return NextResponse.json({ received: true });
  }
  return NextResponse.json({ ignored: evt.event });
}
