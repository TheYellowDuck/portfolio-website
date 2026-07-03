// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import { describe, it, expect } from "vitest";
import { parseResumeTex, delatex } from "@/lib/resume-tex";

// A miniature résumé in the exact macro shape resume/*.tex uses.
const TEX = String.raw`% George Zhang — Résumé (Demo / Example variant)
\begin{document}
\begin{center}
  {\Huge\bfseries\color{accent}\textls[40]{George Zhang}}\\[5pt]
  {\footnotesize
  (778) 682-9123 \sep
  \href{mailto:gzhang06@outlook.com}{gzhang06@outlook.com} \sep
  \href{https://linkedin.com/in/iamgeorgezhang}{linkedin.com/in/iamgeorgezhang} \sep
  \href{https://github.com/TheYellowDuck}{github.com/TheYellowDuck} \sep
  \href{https://georgezhang.ca}{georgezhang.ca}}
\end{center}

\section{Education}
\entry{University of Waterloo}{Waterloo, ON}{Bachelor of Computer Science (Co-op)}{Sep 2024 -- May 2029}

\section{Experience}
\entry{Ford Motor Company}{Waterloo, ON}{Software Developer Intern --- Android Automotive OS}{May 2026 -- Present}
\begin{bullets}
  \item Build features at $\sim$90\% reliability with $<$100\,ms latency.
  \item Ship tests \& builds in an Agile team.
\end{bullets}

\section{Projects}
\project{Limit Order Book \& Matching Engine}{C++20}{github.com/TheYellowDuck/limit-order-book}
\begin{bullets}
  \item Built a lock-free engine.
\end{bullets}

\section{Technical Skills}
\begin{tabularx}{\textwidth}{@{}l X@{}}
  \textbf{Languages} & C++, Python, Java\\
  \textbf{Concepts} & Data Structures \& Algorithms, OOP \& Design Patterns\\
\end{tabularx}

\section{Awards \& Competitive Programming}
\begin{bullets}
  \item ICPC (Waterloo) --- Rank 28 / $\sim$100; 1{,}497 points
\end{bullets}
\end{document}`;

describe("parseResumeTex", () => {
  const r = parseResumeTex(TEX);

  it("reads the variant label from the header comment", () => {
    expect(r.label).toBe("Demo / Example");
  });

  it("parses name and contact", () => {
    expect(r.name).toBe("George Zhang");
    expect(r.contact.phone).toBe("(778) 682-9123");
    expect(r.contact.email).toBe("gzhang06@outlook.com");
    expect(r.contact.linkedin).toBe("linkedin.com/in/iamgeorgezhang");
    expect(r.contact.github).toBe("https://github.com/TheYellowDuck");
  });

  it("maps an \\entry to org/role/dates/location and de-escapes bullets", () => {
    const exp = r.sections.find((s) => s.title === "Experience");
    expect(exp?.entries).toHaveLength(1);
    expect(exp!.entries![0]).toMatchObject({
      title: "Ford Motor Company",
      location: "Waterloo, ON",
      subtitle: "Software Developer Intern — Android Automotive OS",
      period: "May 2026 – Present",
    });
    expect(exp!.entries![0].bullets).toEqual([
      "Build features at ~90% reliability with <100 ms latency.",
      "Ship tests & builds in an Agile team.",
    ]);
  });

  it("maps a \\project to title/tech/link", () => {
    const proj = r.sections.find((s) => s.title === "Projects");
    expect(proj?.entries?.[0]).toMatchObject({
      title: "Limit Order Book & Matching Engine",
      tech: ["C++20"],
      link: "github.com/TheYellowDuck/limit-order-book",
    });
  });

  it("turns the skills tabularx into 'Label: items' bullets (incl. rows with \\&)", () => {
    const skills = r.sections.find((s) => s.title === "Technical Skills");
    expect(skills?.bullets).toEqual([
      "Languages: C++, Python, Java",
      "Concepts: Data Structures & Algorithms, OOP & Design Patterns",
    ]);
  });

  it("preserves $\\sim$ and {,} in awards", () => {
    const awards = r.sections.find((s) => s.title === "Awards & Competitive Programming");
    expect(awards?.bullets).toEqual(["ICPC (Waterloo) — Rank 28 / ~100; 1,497 points"]);
  });
});

describe("delatex", () => {
  it("handles escapes, dashes, math, and quotes", () => {
    expect(delatex(String.raw`A \& B`)).toBe("A & B");
    expect(delatex(String.raw`x --- y -- z`)).toBe("x — y – z");
    expect(delatex(String.raw`$\sim$90\% and $<$100\,ms`)).toBe("~90% and <100 ms");
    expect(delatex("a ``quoted'' word")).toBe("a “quoted” word");
  });
});
