import React from "react";

/** Tiny, safe renderer for CMS text: paragraphs, ## / ### headings, - lists, [text](https://url) links.
 *  Everything is emitted as React nodes (escaped); raw HTML in content is never interpreted. */
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)|\*\*([^*]+)\*\*/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[3]) out.push(<strong key={`${key}b${i++}`}>{m[3]}</strong>);
    else out.push(<a key={`${key}a${i++}`} href={m[2]} {...(m[2].startsWith("http") ? { rel: "noopener noreferrer" } : {})}>{m[1]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Prose({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        const t = b.trim();
        if (!t) return null;
        if (t.startsWith("### ")) return <h3 key={i}>{inline(t.slice(4), `h${i}`)}</h3>;
        if (t.startsWith("## ")) return <h2 key={i}>{inline(t.slice(3), `h${i}`)}</h2>;
        const lines = t.split("\n");
        if (lines.every((l) => /^[-*] /.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2), `l${i}${j}`)}</li>)}</ul>;
        return <p key={i}>{inline(lines.join(" "), `p${i}`)}</p>;
      })}
    </div>
  );
}
