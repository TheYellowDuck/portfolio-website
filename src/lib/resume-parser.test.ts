import { describe, it, expect } from "vitest";
import { parseResumeText } from "@/lib/resume-parser";

// Synthetic résumé text in the tab-separated shape pdf-parse produces.
const RESUME = [
  "Jane Doe",
  "(555) 123-4567 | jane@example.com | linkedin.com/in/janedoe | github.com/janedoe",
  "SKILLS",
  "• Languages: Python, Java, C++",
  "• Tools: Git, Docker",
  "WORK EXPERIENCE",
  "Acme Corp | React | TypeScript\tJan 2025 - Apr 2025",
  "Software Intern\tRemote",
  "• Built a thing that did stuff.",
  "• Did another thing",
  "  that wrapped to a second line.",
  "PROJECTS",
  "Cool Project\tSep 2024 - Dec 2024",
  "• Made it.",
  "AWARDS AND ACHIEVEMENTS",
  "• Won something\tOct 2024",
].join("\n");

describe("parseResumeText", () => {
  const r = parseResumeText(RESUME);

  it("parses name and contact", () => {
    expect(r.name).toBe("Jane Doe");
    expect(r.contact.phone).toBe("(555) 123-4567");
    expect(r.contact.email).toBe("jane@example.com");
    expect(r.contact.linkedin).toContain("linkedin");
    expect(r.contact.github).toContain("github");
  });

  it("parses a skills bullet section", () => {
    const skills = r.sections.find((s) => s.title === "SKILLS");
    expect(skills?.bullets).toEqual(["Languages: Python, Java, C++", "Tools: Git, Docker"]);
  });

  it("parses an experience entry with tech, subtitle, location, and wrapped bullets", () => {
    const work = r.sections.find((s) => s.title === "WORK EXPERIENCE");
    expect(work?.entries).toHaveLength(1);
    const e = work!.entries![0];
    expect(e).toMatchObject({
      title: "Acme Corp",
      tech: ["React", "TypeScript"],
      period: "Jan 2025 - Apr 2025",
      subtitle: "Software Intern",
      location: "Remote",
    });
    expect(e.bullets).toEqual([
      "Built a thing that did stuff.",
      "Did another thing that wrapped to a second line.",
    ]);
  });

  it("parses a project entry without tech", () => {
    const projects = r.sections.find((s) => s.title === "PROJECTS");
    expect(projects?.entries?.[0]).toMatchObject({ title: "Cool Project", period: "Sep 2024 - Dec 2024" });
    expect(projects?.entries?.[0].tech).toBeUndefined();
  });

  it("strips a trailing year stamp from award bullets", () => {
    const awards = r.sections.find((s) => s.title === "AWARDS AND ACHIEVEMENTS");
    expect(awards?.bullets).toEqual(["Won something"]);
  });
});

// The current LaTeX export: single-spaced columns (no tabs), mixed-case/reworded headers,
// "Present" dates, project lines ending in a URL, skills rows without bullet markers.
// This is verbatim what pdf-parse extracts from resume-swe.pdf.
const NEW_FORMAT = [
  "George Zhang",
  "(778) 682-9123 | gzhang06@outlook.com | linkedin.com/in/iamgeorgezhang | github.com/TheYellowDuck | georgezhang.ca",
  "Education",
  "University of Waterloo Waterloo, ON",
  "Bachelor of Computer Science (Co-op) Sep 2024 – May 2029",
  "Experience",
  "Ford Motor Company Waterloo, ON",
  "Software Developer Intern — Android Automotive OS May 2026 – Present",
  "• Build features for the in-vehicle Car Dialer app on Android Automotive OS (AAOS), part of Ford’s production",
  "system, across a multi-module Java/Kotlin codebase.",
  "Projects",
  "Code-Aware RAG System | Python github.com/TheYellowDuck/RAG-codebase",
  "• Built a retrieval-augmented-generation system.",
  "Technical Skills",
  "Languages C++, Python, Java",
  "Awards & Competitive Programming",
  "• ICPC Local Competition (Waterloo) — Rank 28 / ∼100; 470+ LeetCode and 220+ DMOJ problems solved (1,497 points)",
].join("\n");

describe("parseResumeText (new LaTeX export)", () => {
  const r = parseResumeText(NEW_FORMAT);

  it("normalizes reworded/mixed-case section headers", () => {
    expect(r.sections.map((s) => s.title)).toEqual([
      "EDUCATION", "WORK EXPERIENCE", "PROJECTS", "SKILLS", "AWARDS AND ACHIEVEMENTS",
    ]);
  });

  it("fixes a relative github URL to an absolute one", () => {
    expect(r.contact.github).toBe("https://github.com/TheYellowDuck");
  });

  it("splits org/location then role/date with no tabs", () => {
    const edu = r.sections.find((s) => s.title === "EDUCATION")!.entries![0];
    expect(edu).toMatchObject({
      title: "University of Waterloo",
      location: "Waterloo, ON",
      subtitle: "Bachelor of Computer Science (Co-op)",
      period: "Sep 2024 – May 2029",
    });
  });

  it("handles a 'Present' date range and wrapped bullets", () => {
    const ford = r.sections.find((s) => s.title === "WORK EXPERIENCE")!.entries![0];
    expect(ford).toMatchObject({ title: "Ford Motor Company", period: "May 2026 – Present", location: "Waterloo, ON" });
    expect(ford.bullets[0]).toContain("multi-module Java/Kotlin codebase.");
  });

  it("reads a project's tech + URL (no date)", () => {
    const proj = r.sections.find((s) => s.title === "PROJECTS")!.entries![0];
    expect(proj).toMatchObject({
      title: "Code-Aware RAG System",
      tech: ["Python"],
      link: "github.com/TheYellowDuck/RAG-codebase",
    });
    expect(proj.period).toBeUndefined();
  });

  it("keeps marker-less skills rows as bullets", () => {
    const skills = r.sections.find((s) => s.title === "SKILLS");
    expect(skills?.bullets).toEqual(["Languages C++, Python, Java"]);
  });
});
