// Reads an uploaded transcript file into text for parseTranscript. Shared by the coaching-session
// and work-meeting uploads. PDFs are read locally (pdf-text.ts), so redaction still happens before
// anything is stored or sent to the AI.
import { extractPdfText } from './pdf-text';
import { TRANSCRIPT_TYPES } from './transcript-types';
const MAX_BYTES = 10_000_000;

export async function readTranscriptFile(file: FormDataEntryValue | null): Promise<{ content: string; fileName: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a transcript file to upload.' };
  if (file.size > MAX_BYTES) return { error: `The file must be a ${TRANSCRIPT_TYPES} transcript under 10 MB. Please choose a different file.` };
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return { content: await file.text(), fileName: file.name };
  let content: string;
  try {
    content = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    console.error('PDF text extraction failed', e);
    return { error: "We couldn't read text from this PDF. If it's a scanned image, export the transcript as text, Markdown or VTT instead." };
  }
  if (!content.trim()) return { error: 'This PDF has no text layer, so it may be a scanned image. Export the transcript as text, Markdown or VTT instead.' };
  return { content, fileName: `${file.name}.txt` };
}
