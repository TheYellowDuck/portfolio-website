// Live competitive-programming stats — pulled from LeetCode's public GraphQL endpoint and DMOJ's
// official API, normalized into one shape. Cached and revalidated daily (no manual sync), and each
// source fails independently to null so one being down/blocked never breaks the other or the page.
const LC_USER = "georgezhang006";
const DMOJ_USER = "georgezhang006";
const DAY = 86400;

export const revalidate = 86400;

interface LeetCode {
  total: number; easy: number; medium: number; hard: number;
  ranking: number | null; contestRating: number | null; contestBadge: string | null; url: string;
}
interface Dmoj {
  solved: number; points: number | null; rating: number | null; url: string;
}

async function leetcode(): Promise<LeetCode | null> {
  const query = `query($u:String!){
    matchedUser(username:$u){ profile{ ranking } submitStatsGlobal{ acSubmissionNum{ difficulty count } } }
    userContestRanking(username:$u){ rating badge{ name } }
  }`;
  // Browser-like headers reduce the chance of LeetCode bot-blocking server-side requests.
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      referer: `https://leetcode.com/u/${LC_USER}/`,
      origin: "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables: { u: LC_USER } }),
    next: { revalidate: DAY },
  });
  if (!res.ok) return null;
  const data = (await res.json())?.data;
  const m = data?.matchedUser;
  if (!m) return null;
  const by: Record<string, number> = Object.fromEntries(
    (m.submitStatsGlobal?.acSubmissionNum ?? []).map((x: { difficulty: string; count: number }) => [x.difficulty, x.count]),
  );
  const contest = data?.userContestRanking;
  return {
    total: by.All ?? 0, easy: by.Easy ?? 0, medium: by.Medium ?? 0, hard: by.Hard ?? 0,
    ranking: m.profile?.ranking ?? null,
    contestRating: typeof contest?.rating === "number" ? Math.round(contest.rating) : null,
    contestBadge: contest?.badge?.name ?? null,
    url: `https://leetcode.com/u/${LC_USER}/`,
  };
}

async function dmoj(): Promise<Dmoj | null> {
  const res = await fetch(`https://dmoj.ca/api/v2/user/${DMOJ_USER}`, { next: { revalidate: DAY } });
  if (!res.ok) return null;
  const o = (await res.json())?.data?.object;
  if (!o) return null;
  return {
    solved: o.problem_count ?? 0,
    points: o.points != null ? Math.round(o.points) : null,
    rating: o.rating ?? null,
    url: `https://dmoj.ca/user/${DMOJ_USER}`,
  };
}

export async function GET(): Promise<Response> {
  const [lc, dm] = await Promise.all([
    leetcode().catch(() => null),
    dmoj().catch(() => null),
  ]);
  return Response.json(
    { leetcode: lc, dmoj: dm, fetchedAt: new Date().toISOString() },
    { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
