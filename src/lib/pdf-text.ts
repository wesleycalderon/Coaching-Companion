// Text extraction from PDF transcripts, done locally with Mozilla's pdf.js (pdfjs-dist), so
// redaction still happens before anything is stored or sent to the AI.
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const PAGE_FURNITURE = /^(page \d+( of \d+)?|\d+ ?\/ ?\d+)$/i;

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  const task = pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false });
  const doc = await task.promise;
  const lines: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      let line = '';
      let lastY: number | null = null;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        // A new baseline starts a new line, even when the PDF doesn't mark the line end.
        if (lastY !== null && Math.abs(y - lastY) > 2 && line.trim()) {
          lines.push(line.trim());
          line = '';
        }
        line += item.str;
        lastY = y;
        if (item.hasEOL && line.trim()) {
          lines.push(line.trim());
          line = '';
          lastY = null;
        }
      }
      if (line.trim()) lines.push(line.trim());
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return lines.filter((l) => !PAGE_FURNITURE.test(l)).join('\n');
}
