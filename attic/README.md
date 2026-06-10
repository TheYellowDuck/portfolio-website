# Attic

Parked assets that are **not wired into the game** and intentionally live **outside
`public/`** so Next.js no longer serves or bundles them (keeps the deployed build lean).
Everything here is retained in git history and can be moved back under `public/assets/`
if it's ever needed.

## Contents

| Path | Size | Why it's here |
|------|------|---------------|
| `assets/ai-generated/` | ~5.6 MB | AI-generated sprite experiments. Zero references in `src/`. |
| `assets/Cute RPG - Interior/` | ~1.6 MB | Third-party tileset + a 363-file `sprites-old/` export. Zero references in `src/`. |
| `assets/maps/` | empty | Placeholder for Tiled JSON exports — never populated. |
| `assets/sprites/*.png` | small | Unreferenced single sprites (`floor.png`, `pedestal{,-2,-3}.png`, `me.png`) — the engine uses `floor2/3`, `pedestal-book`, and `me-2/me-blink/me-light-off` instead. |

## Verifying nothing references these

```bash
grep -rn "ai-generated\|Cute RPG\|assets/maps" src   # should print nothing
```

## Restoring an item

```bash
git mv "attic/assets/<name>" "public/assets/<name>"
```
