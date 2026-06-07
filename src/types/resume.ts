// Shared resume types — produced by the /api/resume route, consumed by the
// ResumePopup component. Kept here (rather than in the route file) so client
// components don't import from a server route module.

export interface ContactInfo {
  phone?: string;
  email?: string;
  linkedin?: string;
  github?: string;
}

export interface ResumeEntry {
  title: string;
  subtitle?: string;
  period?: string;
  location?: string;
  tech?: string[];
  bullets: string[];
}

export interface ResumeSection {
  title: string;
  bullets?: string[];
  entries?: ResumeEntry[];
}

export interface ResumeData {
  name: string;
  contact: ContactInfo;
  sections: ResumeSection[];
  pdfPath: string;
}
