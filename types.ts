export enum UserRole {
  GUEST = 'GUEST',
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export enum QuestionType {
  TRUE_FALSE = 'True or False',
  MULTIPLE_CHOICE = 'Multiple Choice',
  IDENTIFICATION = 'Identification',
  ENUMERATION = 'Enumeration',
  MATCHING = 'Matching Type',
  ESSAY = 'Essay'
}

export interface Question {
  id: string;
  subject: string;
  type: QuestionType;
  questionText: string;
  imageUrl?: string;
  options?: string[]; // For Multiple Choice
  matchingPairs?: { left: string; right: string }[]; // For Matching
  correctAnswer: string | string[]; // Array for Enumeration
  points: number;
}

export interface Subject {
  name: string;
  description?: string;
  questionCount: number;
}

export interface ExamResult {
  id: string;
  studentName: string; // Since no login, maybe ask for name or just 'Anonymous'
  subject: string;
  score: number;
  totalPoints: number;
  timestamp: string;
  answers: Record<string, any>; // Store student answers for review
  status: 'graded' | 'pending'; // For Essay manual grading
}

export interface AppState {
  role: UserRole;
  currentSubject: string | null;
}

// API Response Shapes
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}
