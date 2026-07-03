// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// ── LeetCode + DMOJ → static data sync ─────────────────────────────────────────
// Writes src/data/cp-stats.generated.json so the site serves competitive-programming
// stats statically instead of fetching LeetCode at runtime from Vercel's datacenter
// IPs (which Cloudflare intermittently challenges). Runs in the daily GitHub Action
// (GitHub's IPs) and locally via `npm run sync:cp-stats`. On a fetch failure it keeps
// the previous value, so a transient block never wipes the numbers.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./github-sync.config.mjs";

const LC_USER = config.leetcode;
const DMOJ_USER = config.dmoj;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "src", "data", "cp-stats.generated.json");

// A real browser User-Agent. LeetCode and DMOJ both sit behind Cloudflare, which 403s requests with a
// bot-looking UA (Node's default) — especially from datacenter IPs like the GitHub Action runner.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function leetcode() {
  const query = `query($u:String!){
    matchedUser(username:$u){ profile{ ranking } submitStatsGlobal{ acSubmissionNum{ difficulty count } } }
    userContestRanking(username:$u){ rating badge{ name } }
  }`;
  // Browser-like headers reduce the chance of bot-blocking.
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": UA,
      referer: `https://leetcode.com/u/${LC_USER}/`,
      origin: "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables: { u: LC_USER } }),
  });
  if (!res.ok) throw new Error(`LeetCode HTTP ${res.status}`);
  const data = (await res.json())?.data;
  const m = data?.matchedUser;
  if (!m) throw new Error("LeetCode: user not found");
  const by = Object.fromEntries((m.submitStatsGlobal?.acSubmissionNum ?? []).map((x) => [x.difficulty, x.count]));
  const contest = data?.userContestRanking;
  return {
    total: by.All ?? 0, easy: by.Easy ?? 0, medium: by.Medium ?? 0, hard: by.Hard ?? 0,
    ranking: m.profile?.ranking ?? null,
    contestRating: typeof contest?.rating === "number" ? Math.round(contest.rating) : null,
    contestBadge: contest?.badge?.name ?? null,
    url: `https://leetcode.com/u/${LC_USER}/`,
  };
}

async function dmoj() {
  const res = await fetch(`https://dmoj.ca/api/v2/user/${DMOJ_USER}`, {
    headers: { "user-agent": UA, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`DMOJ HTTP ${res.status}`);
  const o = (await res.json())?.data?.object;
  if (!o) throw new Error("DMOJ: user not found");
  return {
    solved: o.problem_count ?? 0,
    points: o.points != null ? Math.round(o.points) : null,
    rating: o.rating ?? null,
    url: `https://dmoj.ca/user/${DMOJ_USER}`,
  };
}

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const [lc, dm] = await Promise.allSettled([leetcode(), dmoj()]);

if (lc.status !== "fulfilled") console.warn(`  ⚠ LeetCode fetch failed — keeping last-good (${lc.reason?.message})`);
if (dm.status !== "fulfilled") console.warn(`  ⚠ DMOJ fetch failed — keeping last-good (${dm.reason?.message})`);

const out = {
  leetcode: lc.status === "fulfilled" ? lc.value : (prev.leetcode ?? null),
  dmoj: dm.status === "fulfilled" ? dm.value : (prev.dmoj ?? null),
  fetchedAt: new Date().toISOString(),
};

// LeetCode's contest endpoint is flakier than the profile — if the rating came back null this time
// but we had one before, keep the prior rating/badge so a transient miss doesn't blank the badge.
if (out.leetcode && out.leetcode.contestRating == null && prev.leetcode?.contestRating != null) {
  out.leetcode.contestRating = prev.leetcode.contestRating;
  out.leetcode.contestBadge = prev.leetcode.contestBadge;
}

// Don't clobber a good file with all-nulls if BOTH sources failed and we have nothing prior.
if (!out.leetcode && !out.dmoj && !fs.existsSync(OUT)) {
  console.error("  ✗ Both sources failed and no prior data — not writing an empty file.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`✓ Wrote ${path.relative(path.join(__dirname, ".."), OUT)} — leetcode:${out.leetcode ? "ok" : "—"} dmoj:${out.dmoj ? "ok" : "—"}`);
