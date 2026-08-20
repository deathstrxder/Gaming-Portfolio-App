/**
 * Content for the STEM resume ("technical datasheet") section, transcribed from
 * "Eddie Zeng Resume (11).pdf". Wording is lightly compressed for the web, but
 * every fact, name, number, and award matches the PDF — lib/resume.test.ts pins
 * the invariants. The PDF's phone number is deliberately absent (privacy).
 */

export const RESUME_META = {
  name: "Eddie Zeng",
  role: "STEM Profile",
  docCode: "EZ-STEM-2026",
  revision: "REV 11",
  date: "2026.08",
  email: "eddie.y.zeng@gmail.com",
  pdfHref: "/eddie-zeng-stem-resume.pdf",
} as const;

export const RESUME_HEADLINE = {
  eyebrow: "Technical Datasheet",
  title: "The engineering side.",
  sub: "When I'm not queuing up, I'm building robots, wrangling data, and teaching kids to do both.",
} as const;

export const ROBOTICS = {
  designator: "B1",
  title: "FRC Robotics",
  roles: [
    { role: "Sub-Team Leader", detail: "Team 8567 (2022–2023) · Team 246 (2023–present)" },
    { role: "Scouting & Strategy Lead", detail: "2024–present" },
  ],
  bullets: [
    "Helped program the robot's shooter, intake, and elevator in Java.",
    "Designed robot parts in Onshape CAD; machined and assembled portions of the robot.",
    "Managed a rotating group of scouters at competitions.",
    "Talked strategy with our drive coach and other teams before matches.",
    "Curated the pick-list for alliance selection.",
  ],
  awards: [
    { season: "2023–24", names: ["Quality", "Judges", "Innovation in Control"] },
    { season: "2024–25", names: ["Gracious Professionalism", "Excellence in Engineering", "Team Spirit"] },
  ],
} as const;

export const EDUCATION = {
  designator: "A1",
  title: "Education",
  school: "Boston University Academy",
  status: "Senior · coursework by Summer 2026",
  inSchool: [
    "Multivariable Calculus",
    "Calculus I & II",
    "Foundations of Data Science (CDSDS 120)",
    "General Physics I & II (CASPY 211 & 212)",
    "Chemistry",
    "Biology",
    "Computer Science",
    "Robotics",
    "Woodworking",
  ],
  selfStudied: [
    "Stanford ML: Regression and Classification",
    "Stanford: Advanced Learning Algorithms",
    "Stanford: Unsupervised Learning, Recommenders, and Reinforcement Learning",
    "Stanford: Introduction to Statistics",
    "MIT Beaverworks: Python, GitHub & Autonomous Underwater Vehicles",
    "AoPS: Physics I, Algebra 3, Number Theory, Counting & Probability, Geometry",
  ],
} as const;

export const PROJECTS = [
  {
    designator: "C1",
    title: "Injury Data Tracker",
    year: "2024",
    summary: "A website that web-scrapes NFL injury data and visualizes it with a series of graphs and tables.",
    tech: ["Python", "Web scraping"],
  },
  {
    designator: "C2",
    title: "Vocabifier",
    year: "2024",
    summary: "Generates parsed definitions for vocabulary lists through the Merriam-Webster API, formatted for seamless import into Quizlet flashcards.",
    tech: ["Python", "Merriam-Webster API"],
  },
] as const;

export const PROGRAMS = {
  designator: "D1",
  title: "Programs & Teaching",
  items: [
    {
      name: "GEMS",
      when: "August 2022",
      detail: "Student and mentor-in-training — STEM experiments from pig-heart dissection to soldering electronics.",
    },
    {
      name: "MIT Full STEAM Ahead",
      when: "July–August 2020",
      detail: "A series of STEM classes and projects; built a working pop rocket on my own.",
    },
    {
      name: "gbSTEM Lego Robotics Instructor",
      when: "Fall 2025",
      detail: "Taught 5th–8th graders to build and code LEGO robots with FIRST LEGO League materials.",
    },
    { name: "Davidson Institute Young Scholar", when: "", detail: "" },
  ],
} as const;

export const SKILLS = {
  designator: "E1",
  title: "Technical Skills",
  groups: [
    { label: "Code", items: ["Python", "Matplotlib", "Pandas", "Java"] },
    { label: "Design & Fabrication", items: ["Onshape CAD", "Mechanical tools"] },
    { label: "Media", items: ["After Effects", "Photoshop", "Premiere Pro", "Procreate"] },
  ],
} as const;
