// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import { describe, it, expect } from "vitest";
import { parseTranscript } from "@/lib/transcript-parser";

// Synthetic transcript text in the shape pdf-parse produces from the UW PDF.
const TRANSCRIPT = [
  "Program: Computer Science, Honours, Co-operative Program",
  "Fall 2024",
  "Level: 1A Form Of Study: Enrolment",
  "CS 135 Designing Functional Programs 0.50 0.50 95",
  "MATH 135 Algebra for Honours Mathematics 0.50 0.50 88",
  "Spring 2026",
  "Level: 3A Form Of Study: Co-op Work Term",
  "CS 246 Object-Oriented Software Development",
].join("\n");

describe("parseTranscript", () => {
  const t = parseTranscript(TRANSCRIPT);

  it("parses program, terms, level, and form of study", () => {
    expect(t.program).toBe("Computer Science, Honours, Co-operative Program");
    expect(t.startTerm).toBe("Fall 2024");
    expect(t.currentTerm).toBe("Spring 2026");
    expect(t.currentLevel).toBe("3A");
    expect(t.currentFormOfStudy).toBe("Co-op Work Term");
  });

  it("groups courses by subject with priority ordering (CS before MATH)", () => {
    expect(t.groups.map((g) => g.subject)).toEqual(["CS", "MATH"]);
    expect(t.groups[0].fullName).toBe("Computer Science");
  });

  it("parses completed courses with credits and term", () => {
    const cs = t.groups.find((g) => g.subject === "CS")!;
    expect(cs.courses.map((c) => c.code)).toEqual(["CS 135", "CS 246"]);
    const cs135 = cs.courses.find((c) => c.code === "CS 135")!;
    expect(cs135).toMatchObject({ title: "Designing Functional Programs", credits: 0.5, term: "Fall 2024" });
    const math = t.groups.find((g) => g.subject === "MATH")!;
    expect(math.courses[0]).toMatchObject({ code: "MATH 135", title: "Algebra for Honours Mathematics", credits: 0.5 });
  });

  it("marks an ungraded course as in progress", () => {
    const cs = t.groups.find((g) => g.subject === "CS")!;
    const cs246 = cs.courses.find((c) => c.code === "CS 246")!;
    expect(cs246.inProgress).toBe(true);
    expect(cs246.term).toBe("Spring 2026");
  });
});

describe("parseTranscript — specialization & minor", () => {
  it("captures a specialization line printed under Program: for a later term", () => {
    const text = [
      "Program: Computer Science, Honours, Co-operative Program",
      "Fall 2024",
      "Level: 1A Form Of Study: Enrolment",
      "CS 135 Designing Functional Programs 0.50 0.50 95",
      "Program: Computer Science, Honours, Co-operative Program",
      "Artificial Intelligence Specialization",
      "Fall 2026",
      "Level: 3A Form Of Study: Enrolment",
      "CS 341 Algorithms",
    ].join("\n");
    const t = parseTranscript(text);
    expect(t.specializations).toEqual(["Artificial Intelligence"]);
    expect(t.minors).toBeUndefined();
  });

  it("captures a minor line and doesn't swallow the following Level line", () => {
    const text = [
      "Program: Computer Science, Honours, Co-operative Program",
      "Statistics Minor",
      "Fall 2026",
      "Level: 3A Form Of Study: Enrolment",
      "CS 341 Algorithms",
    ].join("\n");
    const t = parseTranscript(text);
    expect(t.minors).toEqual(["Statistics"]);
    expect(t.currentLevel).toBe("3A");
  });
});

describe("parseTranscript — page break mid-course", () => {
  it("doesn't glue the reprinted letterhead onto an in-progress course title at a page break", () => {
    const text = [
      "Program: Computer Science, Honours, Co-operative Program",
      "Fall 2026",
      "Level: 3A Form Of Study: Enrolment",
      "Course Description Attempted Earned Grade",
      "CS 341 Algorithms",
      "MATH 235 Linear Algebra 2 for Honours Mathematics",
      "-- 2 of 3 --",
      "University of Waterloo",
      "200 University Ave. West",
      "Waterloo Ontario Canada N2L3G1",
      "Page 3 of 3",
      "09/05/2026",
      "Undergraduate Unofficial Transcript",
      "Name: Zhang, George",
      "Student ID: 21120909",
      "Ontario Education Nbr: 918019258",
      "Milestones",
    ].join("\n");
    const t = parseTranscript(text);
    const math = t.groups.find((g) => g.subject === "MATH")!;
    expect(math.courses[0]).toMatchObject({
      code: "MATH 235",
      title: "Linear Algebra 2 for Honours Mathematics",
      inProgress: true,
    });
  });
});
