// Derive skills from university coursework DYNAMICALLY — keyword rules applied to each
// course's title + description (the same philosophy as the repo skill-inference). No
// per-course hard-coding: a new course on the transcript maps itself via these rules.
import type { TranscriptData } from "@/types/transcript";

// First-listed → shown first. A course can match several rules; each contributes its skill.
const COURSE_SKILL_RULES: { re: RegExp; skill: string }[] = [
  { re: /data structure|data abstraction/i, skill: "Data Structures" },
  { re: /algorithm/i, skill: "Algorithms & Data Structures" },
  { re: /computational complexity|\bcomplexity\b/i, skill: "Computational Complexity" },
  { re: /object-?oriented/i, skill: "Object-Oriented Design" },
  { re: /functional program/i, skill: "Functional Programming" },
  { re: /\blogic\b|propositional|predicate|formal (?:logic|method)|set theory|computability/i, skill: "Logic & Computation" },
  { re: /assembl|linker|loader|sequential programs|translation of programming|block-structured|parameter passing/i, skill: "Assembly & Compilers" },
  { re: /computer organization|computer architecture|digital logic|pipelin|processor design|memory hierarch|combinational|multiprocessor/i, skill: "Computer Architecture" },
  { re: /concurren|parallel|\bthread/i, skill: "Concurrency" },
  { re: /linear algebra/i, skill: "Linear Algebra" },
  { re: /calculus/i, skill: "Calculus" },
  { re: /combinatoric|graph theory/i, skill: "Combinatorics & Graph Theory" },
  { re: /optimization|linear programming|duality/i, skill: "Optimization" },
  { re: /probabilit/i, skill: "Probability" },
  { re: /statistic|maximum likelihood|regression|hypothesis|confidence interval|empirical (?:problem|study)/i, skill: "Statistics" },
  { re: /proof|\balgebra\b|integers|modulo|number theory|polynomial|complex numbers/i, skill: "Discrete Math & Proofs" },
  { re: /version control/i, skill: "Version Control (Git)" },
  { re: /linux|command line|\bshell\b/i, skill: "Linux / Shell" },
  { re: /\btest case|\btesting\b|\bdebug/i, skill: "Testing & Debugging" },
];

/** Distinct, ordered skills implied by the courses on the transcript (title + description). */
export function deriveCourseworkSkills(transcript: TranscriptData): string[] {
  const hay = (transcript.groups || [])
    .flatMap((g) => g.courses || [])
    .map((c) => `${c.title} ${c.description ?? ""}`);
  const out: string[] = [];
  for (const { re, skill } of COURSE_SKILL_RULES) {
    if (!out.includes(skill) && hay.some((h) => re.test(h))) out.push(skill);
  }
  return out;
}
