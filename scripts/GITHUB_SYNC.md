# GitHub → website sync

Your repos auto-populate the site's Projects + Skills (both the web portfolio and
the museum game). A scan reads each repo's languages, dependency files, tool/config
files, README (for the description), and any demo videos / store links in the README.

## How it runs

- **Automatically** — `.github/workflows/sync-github.yml` runs **daily** (and on the
  manual "Run workflow" button). It uses the built-in `GITHUB_TOKEN`, so **there's no
  secret to set up**. It commits `src/data/github.generated.ts` when anything changed,
  which triggers your normal deploy.
- **Locally** — `npm run sync:github`. Unauthenticated GitHub allows 60 requests/hour,
  which isn't enough for a full deep scan, so for local runs pass a token:
  ```bash
  GH_TOKEN=ghp_your_token npm run sync:github
  ```
  Create one at github.com → Settings → Developer settings → **fine-grained token**
  with *Public repositories (read-only)* — or a classic token with the `public_repo`
  scope. The token is only ever read from the environment; it never ships to the browser.

## What you can tune — `scripts/github-sync.config.mjs`

| Knob | Does |
|---|---|
| `ignore` | repo names / globs to hide (e.g. forks you don't want) |
| `skipForks` / `skipArchived` | blanket filters |
| `featured` / `featuredThreshold` | force-feature named repos / auto-feature any repo scoring ≥ threshold (Main Hall vs Archive) |
| `overrides` | per-repo escape hatch: `title`, `description`, `tech`, `videoUrl`, `embedUrl`, `featured`, `order`, `hidden` |
| `linkRules` | URL substring → button label (Google Play, App Store, Live Demo…) — **add your own** |
| `DEP_SKILLS` | dependency/package name → skill (React, FastAPI, Tailwind…) |
| `TOOL_SIGNS` | config file present → tool (Docker, GitHub Actions, Vite…) |
| `DOMAIN_RULES` | keyword → higher-level domain (Computer Vision, Game Dev, Web…) |
| `softSkills` | curated soft skills to always show (can't be read from code) |
| `inferSoftSkills` | add evidence-based soft skills (multi-contributor → Collaboration; well-documented → Technical Writing) |
| `SKILL_CATEGORY` | how detected skills group in the Skills section |

## What the skill scan looks at

Languages (GitHub byte breakdown) · frameworks & libraries (dependency manifests:
`package.json`, `requirements.txt`, `Cargo.toml`, …) · tools (config files in the
tree: `Dockerfile`, `.github/workflows`, `vite.config`, …) · the README's
"Tech Stack / Built With" section (catches things with no manifest, e.g. SDL2) ·
and **domains** inferred from all of the above (Computer Vision, Game Development,
Web, Mobile, Algorithms…). Soft skills aren't in the code, so they're a curated list
plus a couple of evidence-based ones — see `softSkills` / `inferSoftSkills`.

## Data flow

```
GitHub API ──> scripts/sync-github.mjs ──> src/data/github.generated.ts
                                              │  (generatedMainHall / Archive / Skills)
                                              ▼
                          src/data/projects.ts  (re-exports them)
                                              ▼
                        web portfolio  +  museum game (rooms auto-size to count)
```

`github.generated.ts` is committed so the site builds without network access; the
Action just keeps it fresh. Don't hand-edit it — use `overrides` instead.
