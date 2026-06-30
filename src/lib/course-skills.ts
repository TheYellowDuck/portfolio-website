// Derive skills from university coursework DYNAMICALLY — keyword rules applied to each
// course's title + description (the same philosophy as the repo skill-inference). No
// per-course hard-coding: a new course on the transcript maps itself via these rules.
import type { TranscriptData } from "@/types/transcript";

// First-listed → shown first. A course can match several rules; each contributes its skill. Each
// skill also carries the Skills-wing CATEGORY it belongs to, so coursework merges into the shared
// category orbs (Algorithms & DS, Mathematics, …) alongside project + work-experience skills.
const COURSE_SKILL_RULES: { re: RegExp; skill: string; category: string }[] = [
  { re: /data structure|data abstraction/i, skill: "Data Structures", category: "Algorithms & DS" },
  { re: /algorithm/i, skill: "Algorithms & Data Structures", category: "Algorithms & DS" },
  { re: /computational complexity|\bcomplexity\b/i, skill: "Computational Complexity", category: "Algorithms & DS" },
  { re: /object-?oriented/i, skill: "Object-Oriented Design", category: "Concepts & Practices" },
  { re: /functional program/i, skill: "Functional Programming", category: "Concepts & Practices" },
  { re: /\blogic\b|propositional|predicate|formal (?:logic|method)|set theory|computability/i, skill: "Logic & Computation", category: "Concepts & Practices" },
  { re: /assembl|linker|loader|sequential programs|translation of programming|block-structured|parameter passing/i, skill: "Assembly & Compilers", category: "Compilers & Languages" },
  { re: /computer organization|computer architecture|digital logic|pipelin|processor design|memory hierarch|combinational|multiprocessor/i, skill: "Computer Architecture", category: "Systems & Embedded" },
  { re: /concurren|parallel|\bthread/i, skill: "Concurrency", category: "Concurrency & Networking" },
  { re: /linear algebra/i, skill: "Linear Algebra", category: "Mathematics" },
  { re: /calculus/i, skill: "Calculus", category: "Mathematics" },
  { re: /combinatoric|graph theory/i, skill: "Combinatorics & Graph Theory", category: "Mathematics" },
  { re: /optimization|linear programming|duality/i, skill: "Optimization", category: "Mathematics" },
  { re: /probabilit/i, skill: "Probability", category: "Statistics & Evaluation" },
  { re: /statistic|maximum likelihood|regression|hypothesis|confidence interval|empirical (?:problem|study)/i, skill: "Statistics", category: "Statistics & Evaluation" },
  { re: /proof|\balgebra\b|integers|modulo|number theory|polynomial|complex numbers/i, skill: "Discrete Math & Proofs", category: "Mathematics" },
  { re: /version control/i, skill: "Version Control (Git)", category: "Tools" },
  { re: /linux|command line|\bshell\b/i, skill: "Linux / Shell", category: "Tools" },
  { re: /\btest case|\btesting\b|\bdebug/i, skill: "Testing & Debugging", category: "Testing & Delivery" },
];

/** Distinct, ordered skills implied by the courses on the transcript (title + description), each
 *  tagged with the Skills-wing category it belongs to. */
export function deriveCourseworkSkills(transcript: TranscriptData): { skill: string; category: string }[] {
  const hay = (transcript.groups || [])
    .flatMap((g) => g.courses || [])
    .map((c) => `${c.title} ${c.description ?? ""}`);
  const out: { skill: string; category: string }[] = [];
  for (const { re, skill, category } of COURSE_SKILL_RULES) {
    if (!out.some((o) => o.skill === skill) && hay.some((h) => re.test(h))) out.push({ skill, category });
  }
  return out;
}
