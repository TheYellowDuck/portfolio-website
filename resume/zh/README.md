# 中文简历 (Chinese résumés)

Chinese translations of the four résumé variants in `../`. **Not shown on the website** —
`scripts/sync-docs.mts` reads `resume/` with a non-recursive `readdirSync`, so nothing in
this subfolder becomes a variant tab or a published PDF. Keep them here, not in `resume/`.

| File | Mirrors |
| ---- | ------- |
| `resume-swe-zh.tex` | `../resume-swe.tex` |
| `resume-quant-zh.tex` | `../resume-quant.tex` |
| `resume-ai-zh.tex` | `../resume-ai.tex` |
| `resume-data-zh.tex` | `../resume-data.tex` |

A4 paper (Chinese-market convention), same oxblood accent + layout as the English versions.
Simplified Chinese; technical terms stay in English per Chinese tech-résumé convention.

## Compile

Requires **xelatex** (not pdflatex — Chinese needs xeCJK). Fonts are macOS built-ins
(Songti SC + PingFang SC), so this only builds on a Mac / anywhere those fonts exist.

```sh
xelatex resume-swe-zh.tex
```

## Headshot

Each header embeds `headshot.jpg` (3:4 ID-photo crop) top-right, the conventional
Chinese-résumé placement. To swap the photo, replace `headshot.jpg` (or drop a
`headshot.png`) and recompile — if neither file exists, a placeholder box (照片)
renders instead.

## Keeping in sync

These are manual translations — after editing an English `.tex`, port the change here.
