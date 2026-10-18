import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Minimal safe markdown renderer — no external dependency.
// Supports: ###/##/# headings, **bold**, `inline code`,
// ```fenced blocks```, - bullet lists. All HTML escaped first.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/`([^`\n]+?)`/g, '<code class="md-code">$1</code>');
  return out;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Fenced code block
    const fence = trimmed.match(/^```(\w*)\n([\s\S]*?)```$/);
    if (fence) {
      closeList();
      const lang = fence[1] ? `<span class="md-lang">${escapeHtml(fence[1])}</span>` : "";
      html.push(
        `<pre class="md-pre">${lang}<code>${escapeHtml(fence[2]?.trim() ?? "")}</code></pre>`,
      );
      continue;
    }

    const lines = trimmed.split("\n");
    const allBullets = lines.every((l) => /^\s*[-*•]\s+/.test(l));
    if (allBullets) {
      if (!inList) {
        html.push('<ul class="md-ul">');
        inList = true;
      }
      for (const l of lines) {
        html.push(`<li class="md-li">${inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>`);
      }
      continue;
    }
    closeList();

    // Headings
    const h = trimmed.match(/^(#{1,3})\s+(.*)$/m);
    if (h && trimmed.split("\n").length === 1) {
      const level = h[1]!.length;
      html.push(`<h${level + 1} class="md-h">${inline(h[2]!)}</h${level + 1}>`);
      continue;
    }

    html.push(`<p class="md-p">${lines.map(inline).join("<br />")}</p>`);
  }
  closeList();

  return (
    <div
      className={cn("md-root", className)}
      dangerouslySetInnerHTML={{ __html: html.join("\n") }}
    />
  );
}

export function MarkdownStyles(props: HTMLAttributes<HTMLStyleElement>) {
  return (
    <style
      {...props}
      dangerouslySetInnerHTML={{
        __html: `
.md-root { display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.875rem; line-height: 1.65; color: var(--color-foreground); overflow-wrap: anywhere; }
.md-p { margin: 0; }
.md-h, .md-root h2, .md-root h3, .md-root h4 { margin: 0.25rem 0 0; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.01em; color: var(--color-foreground); }
.md-ul { margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; list-style: none; }
.md-li { position: relative; padding-left: 1rem; }
.md-li::before { content: "•"; position: absolute; left: 0.25rem; color: var(--color-accent); }
.md-code { font-family: var(--font-mono); font-size: 0.78em; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius-xs); padding: 0.05em 0.35em; }
.md-pre { position: relative; margin: 0; overflow-x: auto; border-radius: 8px; background: var(--color-background); border: 1px solid var(--color-border); padding: 0.7rem 0.8rem; font-family: var(--font-mono); font-size: 0.75rem; line-height: 1.6; }
.md-pre code { background: none; border: 0; padding: 0; }
.md-lang { position: absolute; top: 0.4rem; right: 0.6rem; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-subtle); }
.md-root strong { font-weight: 600; }
`,
      }}
    />
  );
}
