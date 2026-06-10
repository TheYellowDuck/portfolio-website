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
