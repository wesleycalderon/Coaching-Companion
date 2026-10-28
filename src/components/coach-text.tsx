// Renders a coach's reply. BiTSy writes Markdown; this handles the parts it uses (paragraphs,
// lists, headings, bold, italics, links) as React elements, so nothing is ever injected as HTML.
// BiTSy's `video:` links play only in BiTSy, so they show as a note instead.

import type { ReactNode } from 'react';

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const key = `${keyBase}-${k++}`;
    if (t.startsWith('**') || t.startsWith('__')) out.push(<strong key={key}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('[')) {
      const [, label, url] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t)!;
      if (url.startsWith('video:')) out.push(<span key={key}>{label} (video, available in BiTSy)</span>);
      else if (/^https?:\/\//.test(url)) out.push(<a key={key} href={url} target="_blank" rel="noopener noreferrer">{label}</a>);
      else out.push(label);
    } else out.push(<em key={key}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function CoachText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${blocks.length}`} className="coach-text__p">{inline(para.join(' '), `p${blocks.length}`)}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{inline(it, `l${blocks.length}-${i}`)}</li>);
    blocks.push(list.ordered ? <ol key={`l${blocks.length}`} className="coach-text__list">{items}</ol> : <ul key={`l${blocks.length}`} className="coach-text__list">{items}</ul>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = /^([-*•o])\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (!line) { flushPara(); flushList(); continue; }
    if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ? bullet[2] : numbered![1]));
      continue;
    }
    flushList();
    if (heading) { flushPara(); blocks.push(<p key={`h${blocks.length}`} className="coach-text__p strong">{inline(heading[1], `h${blocks.length}`)}</p>); continue; }
    para.push(line);
  }
  flushPara();
  flushList();
  return <div className="coach-text">{blocks}</div>;
}
