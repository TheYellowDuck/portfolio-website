// Ghost trails — anonymous visitor movement paths. Visitors POST their walk; the GET returns the
// most-recent few (capped at 15) for the next visitors to replay as drifting "ghosts". Stored in
// Upstash Redis via its REST API (no SDK dependency). If Upstash isn't configured, this degrades
// gracefully: GET returns nothing and the client falls back to procedural wanderers. The GET is
// cached ~daily (CDN), so the pool "updates daily" and a just-submitted path won't show same-session.
// POSTs are rate-limited per IP (see rateLimited) so the small pool can't be flooded with junk paths.
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "ghosts:v1";
const MAX = 15;
const RL_MAX = 8;          // max POSTs per IP per window — a real visitor submits ~once per session
const RL_WINDOW = 3600;    // rate-limit window, seconds

export const dynamic = "force-dynamic";

async function redis(cmd: (string | number)[]): Promise<unknown> {
  if (!URL || !TOKEN) return null;
  const res = await fetch(URL, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json())?.result ?? null;
}

async function redisPipe(cmds: (string | number)[][]): Promise<void> {
  if (!URL || !TOKEN) return;
  await fetch(`${URL}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  }).catch(() => {});
}

// Per-IP fixed-window rate limit (only active when Redis is configured — without it POST is a no-op
// anyway). Stops a script from flooding the 15-slot pool with junk paths, while the small cap still
// leaves a genuine visitor room to reload a few times.
async function rateLimited(request: Request): Promise<boolean> {
  if (!URL || !TOKEN) return false;
  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `ghosts:rl:${ip}`;
  const count = (await redis(["INCR", key])) as number | null;
  if (count === 1) await redis(["EXPIRE", key, String(RL_WINDOW)]);
  return typeof count === "number" && count > RL_MAX;
}

export async function GET(): Promise<Response> {
  const raw = (await redis(["LRANGE", KEY, "0", String(MAX - 1)])) as string[] | null;
  const recordings = (raw ?? [])
    .map((s) => { try { return JSON.parse(s); } catch { return null; } })
    .filter((r): r is { id: string; pts: number[] } => !!r && typeof r.id === "string" && Array.isArray(r.pts));
  return Response.json(
    { recordings },
    { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (await rateLimited(request)) return new Response("rate limited", { status: 429 });

  let body: { id?: unknown; pts?: unknown };
  try { body = await request.json(); } catch { return new Response("bad request", { status: 400 }); }

  const id = typeof body.id === "string" ? body.id.slice(0, 64) : null;
  const pts = Array.isArray(body.pts) ? (body.pts as unknown[]) : null;
  // Validate: an [x,y, x,y, …] path of reasonable, finite size (the client also caps it).
  if (
    !id || !pts || pts.length < 6 || pts.length > 2400 || pts.length % 2 !== 0 ||
    !pts.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) < 100000)
  ) {
    return new Response("invalid", { status: 400 });
  }

  const rec = JSON.stringify({ id, pts: (pts as number[]).map((n) => Math.round(n)) });
  await redisPipe([["LPUSH", KEY, rec], ["LTRIM", KEY, "0", String(MAX - 1)]]);
  return new Response(null, { status: 204 });
}
