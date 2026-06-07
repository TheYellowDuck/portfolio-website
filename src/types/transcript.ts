// Shared transcript types — produced by the /api/transcript route, consumed by
// the TranscriptPopup component. Kept here (rather than in the route file) so
// client components don't import from a server route module.

export interface CourseEntry {
  code: string;
  title: string;
  credits?: number;
  inProgress?: boolean;
  term?: string; // e.g. "Spring 2025"
  description?: string;
}

export interface SubjectGroup {
  subject: string;
  fullName: string;
  courses: CourseEntry[];
}

export interface TranscriptData {
  program?: string;
  startTerm?: string;
  currentTerm?: string;
  currentLevel?: string;
  currentFormOfStudy?: string;
  groups: SubjectGroup[];
  pdfPath: string;
}
