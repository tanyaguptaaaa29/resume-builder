import { z } from "zod";

// --- Personal Information ---
export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(1, "Phone number is required"),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  location: z.string().optional(),
});

// --- Education ---
export const EducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  cgpa: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  coursework: z.array(z.string()).optional(),
});

// --- Experience ---
export const ExperienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  bullets: z.array(z.string().min(1)),
  location: z.string().optional(),
});

// --- Projects ---
export const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  techStack: z.array(z.string()),
  bullets: z.array(z.string().min(1)),
  link: z.string().optional(),
});

// --- Skills ---
export const SkillsSchema = z.object({
  languages: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
  other: z.array(z.string()).optional(),
});

// --- Achievements ---
export const AchievementSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().optional(),
});

// --- Certifications ---
export const CertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

// --- Positions of Responsibility ---
export const PositionSchema = z.object({
  role: z.string().min(1),
  organization: z.string().min(1),
  bullets: z.array(z.string()),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// --- Full Resume Data Schema ---
export const ResumeDataSchema = z.object({
  personalInfo: PersonalInfoSchema,
  education: z.array(EducationSchema).min(1),
  experience: z.array(ExperienceSchema).optional(),
  projects: z.array(ProjectSchema).optional(),
  skills: SkillsSchema,
  achievements: z.array(AchievementSchema).optional(),
  certifications: z.array(CertificationSchema).optional(),
  positionsOfResponsibility: z.array(PositionSchema).optional(),
});

// --- TypeScript Types (derived from Zod) ---
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Skills = z.infer<typeof SkillsSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type ResumeData = z.infer<typeof ResumeDataSchema>;

// --- Chat Message Type ---
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// --- Builder State Types ---
export type TemplateType = "college" | "offcampus";
export type InputMethod = "upload" | "chat";
export type BuilderStep = 1 | 2 | 3 | 4;
