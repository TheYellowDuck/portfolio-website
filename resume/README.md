# Résumé sources

Three role-targeted variants, single-column and ATS-safe. Same header, education,
experience, and awards — they differ only in **which projects lead** and the **skills emphasis**.

| File | Target | Leads with |
|------|--------|-----------|
| `resume-swe.tex`   | General SWE / big tech | Portfolio engine, RAG, Limit Order Book, Web Agent |
| `resume-quant.tex` | Quant / trading        | Limit Order Book (C++), then rigor + competitive programming |
| `resume-ai.tex`    | AI / ML                | RAG, RLHF, Web Agent + the CV research |

## Compile

**Overleaf:** upload the one `.tex` you want → it builds on open (pdfLaTeX).

**Local:**
```sh
pdflatex resume-swe.tex      # or resume-quant.tex / resume-ai.tex
```

All three are tuned to fit exactly one page. If you add a bullet and it spills, trim
elsewhere or drop the Kumon line — it's the lowest-value entry for a technical résumé.

## Accent color

The whole résumé is themed off one hex value near the top of each `.tex`:

```latex
\definecolor{accent}{HTML}{6F2436}   % Oxblood (default)
```

Swap that hex to restyle the name, section headings, rules, and links in one edit:

| Accent | Hex | Feel |
|--------|-----|------|
| **Oxblood** (default) | `6F2436` | warm, editorial, premium — on-brand |
| Navy | `1F3B5B` | classic, safe, most conventional |
| Teal | `155E52` | modern, fresh, professional |
| Indigo | `35386B` | rich, contemporary |
| Near-black | `2B2B2B` | ultra-conservative (e.g. traditional finance) |

## How the site uses these

This folder IS the source of truth for the résumé on the site. Every `*.tex` here becomes a
selectable **variant tab** in the on-site résumé popup, ordered `swe`, `quant`, `ai`, then any
others alphabetically (the first is the default and is also mirrored at the top level of the JSON
for `/llms.txt` + `/linkedin.txt`). The tab **label** is the text in each file's first comment line,
`Résumé (… variant)`; the tab **id** is the filename (`resume-swe.tex` → `swe`).

Pipeline (`npm run sync:docs`, also run by the daily GitHub Action):

1. `scripts/sync-docs.mts` parses every `resume/*.tex` via `src/lib/resume-tex.ts` (pure JS, no
   LaTeX needed in CI) into `src/data/resume.generated.json`.
2. If no `.tex` are present, it falls back to parsing the first PDF in `public/assets/resume/` with
   the hardened `src/lib/resume-parser.ts`.

After editing a `.tex`:

1. Recompile its PDF into `../public/assets/resume/` (the popup's "Download PDF" link):
   `pdflatex -output-directory=../public/assets/resume resume-swe.tex`
2. Run `npm run sync:docs` to regenerate the JSON.
