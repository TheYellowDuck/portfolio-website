// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

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
  link?: string;
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

// One selectable résumé in the popup's variant tabs (e.g. SWE / Quant / AI).
export interface ResumeVariant extends ResumeData {
  id: string;     // slug from the source filename, e.g. "swe"
  label: string;  // human tab label, e.g. "General SWE / Big Tech"
}

// What /api/resume serves and resume.generated.json holds. Backward-compatible: the top-level
// ResumeData fields mirror the DEFAULT variant (variants[0]) so existing consumers (llms.txt,
// linkedin.txt) keep working, while the popup reads `variants` to offer the tab switcher.
export interface ResumeCollection extends ResumeData {
  variants: ResumeVariant[];
}
