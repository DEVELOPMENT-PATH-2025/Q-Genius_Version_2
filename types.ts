export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FACULTY = 'FACULTY'
}

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
}

export enum QuestionType {
  MCQ = 'MCQ',
  SHORT_ANSWER = 'SHORT_ANSWER',
  LONG_ANSWER = 'LONG_ANSWER'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  options?: string[]; // For MCQs
  correctAnswer?: string;
  marks: number;
  department?: string;
  bloomLevel?: string;
  courseOutcome?: string;
  imageUrl?: string; // URL or base64 of the image associated with the question
  imageDescription?: string; // AI-generated description of the image if extraction is not possible
  hasImage?: boolean; // Whether the question has an associated image
  alternativeText?: string; // For long answer questions (Part C)
  alternativeAnswer?: string; // For long answer questions (Part C)
  alternativeImageUrl?: string; // URL or base64 of the image for part b (alternative question)
  alternativeImageDescription?: string; // Description of the alternative image for part b
  hasAlternativeImage?: boolean; // Whether part b has an associated image
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in normalized coordinates (0-1000)
  pageNumber?: number; // For PDF extraction, which page the image is on
  section?: string; // e.g., "Part A", "Section 1"
  sectionTitle?: string; // e.g., "Multiple Choice Questions", "Short Answer Questions"
}

export enum PaperStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface QuestionPaper {
  id: string;
  title: string;
  courseCode: string;
  facultyId: string;
  facultyName: string;
  createdAt: string;
  status: PaperStatus;
  questions: Question[];
  totalMarks: number;
  durationMinutes: number;
  department?: string | null;
  adminFeedback?: string | null;
  templateId?: string | null; // ID of the uploaded college format
  instituteName?: string | null;
  examName?: string | null;
  subjectName?: string | null;
  examDate?: string | null;
  maxMarks?: number | null;
  enrollmentNo?: string | null;
  instructions?: string | null;
  format?: string | null;
  logoUrl?: string | null;
  // Course Outcomes (CO) fields
  co1?: string | null;
  co2?: string | null;
  co3?: string | null;
  co4?: string | null;
  co5?: string | null;
}

export interface PaperTemplate {
  id: string;
  name: string;
  fileUrl: string; // Mock URL or base64
  uploadedAt: string;
  facultyId: string; // To support account-specific templates
}

export interface DashboardStats {
  totalPapers: number;
  approved: number;
  rejected: number;
  pending: number;
  topTopics: { name: string; count: number }[];
  difficultyDistribution: { name: string; value: number }[];
  questionDistribution: { name: string; value: number }[];
}

export type ViewType = 
  | 'dashboard' 
  | 'my_papers' 
  | 'templates' 
  | 'review_queue' 
  | 'submit_paper'
  | 'reports' 
  | 'users';