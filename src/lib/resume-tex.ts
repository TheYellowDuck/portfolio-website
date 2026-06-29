// Parses the LaTeX résumé sources (resume/*.tex) into the structured ResumeData the site renders.
// This is the PRIMARY résumé pipeline (path "A"): the .tex files use a small, regular set of macros
// (\section, \entry, \project, the `bullets` env, and a skills `tabularx`), so we parse them
// deterministically with pure JS — no LaTeX toolchain, no fragile PDF text-extraction. The hardened
// PDF parser in resume-parser.ts is the fallback (path "B") for when only a PDF is available.

import type { ContactInfo, ResumeEntry, ResumeSection } from "@/types/resume";

export interface ParsedTexResume {
  name: string;
  contact: ContactInfo;
  sections: ResumeSection[];
  label: string;
}

// ── LaTeX → plain text ───────────────────────────────────────────────────────
export function delatex(input: string): string {
  let s = input;
  // \href{url}{text} → text ; \textcolor{c}{text} → text
  s = s.replace(/\\href\{[^}]*\}\{([^}]*)\}/g, "$1");
  s = s.replace(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, "$1");
  // Font/shape wrappers → inner text
  s = s.replace(/\\(?:textbf|textit|emph|textsc|texttt|underline)\{([^}]*)\}/g, "$1");
  // Active-tie "~" → space FIRST (before we mint "~" from $\sim$ below)
  s = s.replace(/~/g, " ");
  // Math snippets used in the résumé
  s = s.replace(/\$\\sim\$/g, "~");
  s = s.replace(/\$<\$/g, "<").replace(/\$>\$/g, ">");
  s = s.replace(/\$\\ast\$/g, "*").replace(/\$\\cdot\$/g, "·");
  // Symbol macros
  s = s.replace(/\\textbar(?:\{\})?/g, "|");
  s = s.replace(/\\textbullet(?:\{\})?/g, "•");
  s = s.replace(/\\(?:LaTeX|TeX)\b/g, (m) => m.slice(1));
  // Dashes (em before en) and ellipsis
  s = s.replace(/---/g, "—").replace(/--/g, "–").replace(/\\ldots|\\dots/g, "…");
  // Quotes: ``...'' → "..." ; lone ` ' → ' '
  s = s.replace(/``/g, "“").replace(/''/g, "”");
  // Spacing macros → a normal space
  s = s.replace(/\\(?:,|;|:|!|enspace|quad|qquad|thinspace|space)/g, " ");
  // Escaped specials
  s = s.replace(/\\([&%#$_{}])/g, "$1");
  // Drop any leftover \command (no args) and brace grouping
  s = s.replace(/\\[a-zA-Z]+\*?/g, "");
  s = s.replace(/[{}]/g, "");
  // Tidy whitespace
  return s.replace(/[ \t]+/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
}

// Read `count` consecutive {...} groups starting at the first "{" at/after `from`.
// Brace-depth aware, so nested groups in an argument are kept intact.
function takeGroups(src: string, from: number, count: number): { args: string[]; end: number } | null {
  const args: string[] = [];
  let i = from;
  for (let g = 0; g < count; g++) {
    while (i < src.length && src[i] !== "{") {
      if (!/\s/.test(src[i])) return null; // non-space before the next group → not our macro shape
      i++;
    }
    if (src[i] !== "{") return null;
    let depth = 0;
    const start = i + 1;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    args.push(src.slice(start, i));
    i++; // past closing brace
  }
  return { args, end: i };
}

// Pull the `bullets` itemize that immediately follows `pos` (only whitespace between) → list of items.
function takeBulletsAfter(body: string, pos: number): { items: string[]; end: number } | null {
  const m = /^\s*\\begin\{bullets\}/.exec(body.slice(pos));
  if (!m) return null;
  const start = pos + m[0].length;
  const close = body.indexOf("\\end{bullets}", start);
  const inner = body.slice(start, close === -1 ? undefined : close);
  const items = inner
    .split(/\\item\b/)
    .map((x) => delatex(x))
    .filter(Boolean);
  return { items, end: close === -1 ? body.length : close + "\\end{bullets}".length };
}

function parseEntriesSection(body: string): ResumeEntry[] {
  const entries: ResumeEntry[] = [];
  const re = /\\(entry|project)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const kind = m[1];
    const grabbed = takeGroups(body, m.index + m[0].length, kind === "entry" ? 4 : 3);
    if (!grabbed) continue;
    const a = grabbed.args.map(delatex);
    let entry: ResumeEntry;
    if (kind === "entry") {
      entry = { title: a[0], location: a[1] || undefined, subtitle: a[2] || undefined, period: a[3] || undefined, bullets: [] };
    } else {
      const tech = a[1] ? a[1].split(/\s*,\s*/).filter(Boolean) : undefined;
      entry = { title: a[0], tech, link: a[2] || undefined, bullets: [] };
    }
    const bul = takeBulletsAfter(body, grabbed.end);
    if (bul) {
      entry.bullets = bul.items;
      re.lastIndex = bul.end; // skip the consumed itemize
    } else {
      re.lastIndex = grabbed.end;
    }
    entries.push(entry);
  }
  return entries;
}

// Skills section is a tabularx whose rows are "\textbf{Label} & comma list \\".
// Rendered as "Label: comma list" bullets so the popup's styled BulletList shows them as chips.
function parseSkillsSection(body: string): string[] {
  const out: string[] = [];
  const re = /\\textbf\{([^}]*)\}\s*&\s*([\s\S]*?)\\\\/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const label = delatex(m[1]);
    const items = delatex(m[2]);
    if (label && items) out.push(`${label}: ${items}`);
  }
  return out;
}

function parseContact(centerBlock: string): ContactInfo {
  const hrefs = [...centerBlock.matchAll(/\\href\{([^}]*)\}\{([^}]*)\}/g)].map((h) => ({ url: h[1], text: h[2] }));
  const phoneMatch = centerBlock.match(/\(\d{3}\)[\d\s–—-]{6,}/);
  const linkedin = hrefs.find((h) => /linkedin/i.test(h.url));
  const github = hrefs.find((h) => /github/i.test(h.url));
  const mail = hrefs.find((h) => /^mailto:/i.test(h.url));
  return {
    phone: phoneMatch ? phoneMatch[0].trim() : undefined,
    email: mail ? mail.url.replace(/^mailto:/i, "") : hrefs.find((h) => h.text.includes("@"))?.text,
    linkedin: linkedin ? linkedin.url.replace(/^https?:\/\//, "") : undefined,
    github: github ? github.url : undefined,
  };
}

export function parseResumeTex(tex: string): ParsedTexResume {
  // Strip the document down to between \begin{document} and \end{document}, but keep the leading
  // comment block for the label.
  const labelMatch = tex.match(/Résumé\s*\(([^)]*)\)/);
  const label = labelMatch ? labelMatch[1].replace(/\s*variant\s*$/i, "").trim() : "";

  const nameMatch = tex.match(/\\textls\[[^\]]*\]\{([^}]+)\}/);
  const name = nameMatch ? delatex(nameMatch[1]) : "";

  const centerMatch = tex.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
  const contact = parseContact(centerMatch ? centerMatch[1] : tex);

  // Section slices: from each \section{..} to the next \section or \end{document}.
  const body = tex.split(/\\end\{document\}/)[0];
  const headers = [...body.matchAll(/\\section\{([^}]*)\}/g)];
  const sections: ResumeSection[] = [];
  for (let i = 0; i < headers.length; i++) {
    const title = delatex(headers[i][1]);
    const start = headers[i].index! + headers[i][0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index! : body.length;
    const slice = body.slice(start, end);

    if (/\\(?:entry|project)\b/.test(slice)) {
      sections.push({ title, entries: parseEntriesSection(slice) });
    } else if (/\\begin\{tabularx\}/.test(slice)) {
      sections.push({ title, bullets: parseSkillsSection(slice) });
    } else if (/\\begin\{bullets\}/.test(slice)) {
      const bul = takeBulletsAfter(slice, slice.indexOf("\\begin{bullets}"));
      sections.push({ title, bullets: bul ? bul.items : [] });
    }
  }

  return { name, contact, sections, label };
}
