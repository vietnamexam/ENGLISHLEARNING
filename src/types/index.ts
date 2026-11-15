export type AppSection =
  | 'home'
  | 'vocabulary'
  | 'grammar'
  | 'translate'
  | 'games'
  | 'exams'
  | 'account'
  | 'admin';

export type AccountType = 'FREE' | 'VIP';
export type AccountStatus = 'active' | 'locked';
export type UserRole = 'teacher' | 'admin';

export interface TeacherProfile {
  uid: string;
  fullName: string;
  phone: string;
  email: string;
  status: AccountStatus;
  accountType: AccountType;
  role: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SystemVipConfig {
  vipModeEnabled: boolean;
  maintenanceMode?: boolean;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface VocabItem {
  id: string;
  teacherId: string;
  topic: string;
  vietnamese: string;
  english: string;
  ipa: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleVi: string;
  mastered: boolean;
  reviewCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VocabGenerationResult {
  vietnamese: string;
  english: string;
  ipa: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleVi: string;
}

export interface GrammarTopic {
  id: string;
  category: string;
  title: string;
  gradeRange: string;
  minGrade: number;
  maxGrade: number;
  formula: string;
  usage: string;
  explanationVi: string;
  examples: {
    en: string;
    vi: string;
  }[];
  commonMistakes: string[];
}

export interface GrammarAnalysisResult {
  englishTranslation: string;
  grammarStructure: string;
  explanationVi: string;
  notes: string;
}

export interface GrammarSampleSentence {
  english: string;
  vietnamese: string;
  analysis: string;
}

export interface TranslationResult {
  translatedText: string;
  difficultWords: {
    word: string;
    ipa: string;
    meaning: string;
    usage: string;
  }[];
  grammarNotes: string;
}

export type GameType =
  | 'match'
  | 'multiple_choice'
  | 'fill_blank'
  | 'sentence_order'
  | 'image_guess'
  | 'listening_choice';

export type GameDifficulty = 'easy' | 'medium' | 'hard';

export interface GameQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
  explanation?: string;
  visualCue?: string;
  audioText?: string;
}

export interface GameRecord {
  id: string;
  teacherId: string;
  title: string;
  gameType: GameType;
  topic: string;
  difficulty: GameDifficulty;
  questionCount: number;
  questions: GameQuestion[];
  isActive: boolean;
  expiresAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ExamQuestionType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'sentence_order'
  | 'reading'
  | 'grammar'
  | 'vocabulary'
  | 'listening'
  | 'other';

export interface ExamQuestion {
  id: string;
  section: string;
  questionType: ExamQuestionType;
  prompt: string;
  passage?: string;
  options: string[];
  correctAnswer: string;
  points: number;
  needsReview?: boolean;
  reviewNote?: string;
}

export interface ExamRecord {
  id: string;
  teacherId: string;
  title: string;
  gradeLevel: number;
  topic: string;
  durationMinutes: number;
  openTime?: string;
  closeTime?: string;
  maxScore: number;
  allowViewAnswers: boolean;
  allowRetake: boolean;
  isActive: boolean;
  sourceFileUrl?: string;
  sourceFileName?: string;
  questions: ExamQuestion[];
  expiresAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SampleQuestionGradeGroup = 'all' | 'primary' | 'secondary' | 'high';

export interface SampleBankQuestion {
  id: string;
  questionType: ExamQuestionType;
  gradeGroup: SampleQuestionGradeGroup;
  topic: string;
  section: string;
  prompt: string;
  passage?: string;
  options: string[];
  correctAnswer: string;
  points: number;
  isActive: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentRecord {
  id: string;
  teacherId: string;
  orderNumber: number;
  fullName: string;
  className: string;
  dateOfBirth: string;
  studentCode: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
