import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  EDUCATION,
  PROGRAMS,
  PROJECTS,
  RESUME_META,
  ROBOTICS,
  SKILLS,
} from "@/lib/resume";

/**
 * Pins the rendered resume to the source PDF ("Eddie Zeng Resume (11).pdf").
 * Every count and name below is a fact from that document — a drive-by edit
 * that drops a course or misspells an award should fail here, not in review.
 */
describe("resume data integrity", () => {
  it("keeps the exact award set: six awards, split 3/3 across the two seasons", () => {
    expect(ROBOTICS.awards).toHaveLength(2);
    const [s1, s2] = ROBOTICS.awards;
    expect(s1.season).toBe("2023–24");
    expect(s1.names).toEqual(["Quality", "Judges", "Innovation in Control"]);
    expect(s2.season).toBe("2024–25");
    expect(s2.names).toEqual([
      "Gracious Professionalism",
      "Excellence in Engineering",
      "Team Spirit",
    ]);
  });

  it("keeps both FRC roles with their teams and years", () => {
    expect(ROBOTICS.roles.map((r) => r.role)).toEqual([
      "Sub-Team Leader",
      "Scouting & Strategy Lead",
    ]);
    expect(ROBOTICS.roles[0].detail).toContain("8567");
    expect(ROBOTICS.roles[0].detail).toContain("246");
    expect(ROBOTICS.roles[1].detail).toContain("2024");
  });

  it("keeps the PDF's claim strength: helped program, not programmed", () => {
    expect(ROBOTICS.bullets[0]).toMatch(/^Helped program/);
  });

  it("keeps the full coursework lists: 9 in-school entries, 6 self-studied entries", () => {
    expect(EDUCATION.inSchool).toHaveLength(9);
    expect(EDUCATION.inSchool).toContain("Foundations of Data Science (CDSDS 120)");
    expect(EDUCATION.inSchool).toContain("General Physics I & II (CASPY 211 & 212)");
    expect(EDUCATION.selfStudied).toHaveLength(6);
    for (const needle of [
      "Regression and Classification",
      "Advanced Learning Algorithms",
      "Unsupervised Learning, Recommenders, and Reinforcement Learning",
      "Introduction to Statistics",
      "Beaverworks",
      "AoPS",
    ]) {
      expect(EDUCATION.selfStudied.join("\n")).toContain(needle);
    }
  });

  it("keeps both projects with year and Python", () => {
    expect(PROJECTS.map((p) => p.title)).toEqual(["Injury Data Tracker", "Vocabifier"]);
    for (const p of PROJECTS) {
      expect(p.year).toBe("2024");
      expect(p.tech).toContain("Python");
    }
    expect(PROJECTS[1].summary).toContain("Merriam-Webster");
    expect(PROJECTS[1].summary).toContain("Quizlet");
  });

  it("keeps all four programs in PDF order, with Davidson unembellished", () => {
    expect(PROGRAMS.items.map((i) => i.name)).toEqual([
      "GEMS",
      "MIT Full STEAM Ahead",
      "gbSTEM Lego Robotics Instructor",
      "Davidson Institute Young Scholar",
    ]);
    const davidson = PROGRAMS.items[3];
    expect(davidson.detail).toBe("");
  });

  it("keeps the skill groups complete", () => {
    const all = SKILLS.groups.flatMap((g) => g.items).join("\n");
    for (const s of ["Python", "Matplotlib", "Pandas", "Java", "Onshape", "After Effects", "Photoshop", "Premiere Pro", "Procreate"]) {
      expect(all).toContain(s);
    }
  });

  it("exposes the datasheet meta the title block renders", () => {
    expect(RESUME_META.email).toBe("eddie.y.zeng@gmail.com");
    expect(RESUME_META.pdfHref).toBe("/eddie-zeng-stem-resume.pdf");
    expect(RESUME_META.revision).toBe("REV 11");
    expect(RESUME_META.docCode).toBe("EZ-STEM-2026");
  });

  it("never contains a phone-shaped digit run, in any formatting", () => {
    // The PDF carries a mobile number; the site must not (privacy decision in the
    // spec). Deliberately leak-free: the test matches the SHAPE of a US phone
    // number (10 digits with at most two separator chars between digits) rather
    // than the number itself, which would commit the number to the public repo.
    // What keeps the data clear of false positives: year RANGES use en-dashes
    // (– is outside the separator class, so "8567 (2022–2023)" chains only 8
    // digits) and rgba()/list digits are comma-separated (also outside the
    // class). If someone normalizes ranges to ASCII hyphens, this test fails
    // loudly and the range punctuation must be restored — that is by design.
    const source = readFileSync("lib/resume.ts", "utf8");
    expect(source).not.toMatch(/(?:\d[\s.()-]{0,2}){9}\d/);
  });
});
