import { pgTable, text, timestamp, uuid, jsonb, boolean, integer, real, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { schools, classes } from './schools';
import { lessons } from './lessons';
import { meetings } from './meetings';

/**
 * Quizzes - Assessments for students
 */
export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'set null' }),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  
  // Quiz details
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { 
    enum: ['practice', 'graded', 'diagnostic', 'mastery_check', 'review'] 
  }).notNull().default('practice'),
  
  // Configuration
  questions: jsonb('questions').$type<QuizQuestion[]>().notNull().default([]),
  passingScore: integer('passing_score').default(70), // Percentage
  timeLimit: integer('time_limit'), // Minutes, null = no limit
  maxAttempts: integer('max_attempts').default(3), // null = unlimited
  shuffleQuestions: boolean('shuffle_questions').default(false),
  shuffleAnswers: boolean('shuffle_answers').default(true),
  showCorrectAnswers: boolean('show_correct_answers').default(true),
  showExplanations: boolean('show_explanations').default(true),
  
  // Scheduling
  availableFrom: timestamp('available_from'),
  availableUntil: timestamp('available_until'),
  
  // Status
  status: text('status', { 
    enum: ['draft', 'published', 'archived'] 
  }).notNull().default('draft'),
  
  // AI generation metadata
  aiGenerated: boolean('ai_generated').default(false),
  aiPrompt: text('ai_prompt'),
  sourceDocumentId: uuid('source_document_id'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Quiz Attempts - Student attempts at quizzes
 */
export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Attempt tracking
  attemptNumber: integer('attempt_number').notNull().default(1),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
  
  // Responses and scoring
  answers: jsonb('answers').$type<QuizAnswer[]>().notNull().default([]),
  score: real('score'), // Percentage 0-100
  pointsEarned: integer('points_earned'),
  pointsPossible: integer('points_possible'),
  
  // Analysis
  correctCount: integer('correct_count').default(0),
  incorrectCount: integer('incorrect_count').default(0),
  skippedCount: integer('skipped_count').default(0),
  timeSpent: integer('time_spent'), // Seconds
  
  // Results
  passed: boolean('passed'),
  feedback: text('feedback'),
  weakAreas: jsonb('weak_areas').$type<string[]>(),
  strongAreas: jsonb('strong_areas').$type<string[]>(),
  
  // Status
  status: text('status', { 
    enum: ['in_progress', 'submitted', 'graded', 'expired'] 
  }).notNull().default('in_progress'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Review Sessions - Targeted review for areas where students struggled
 */
export const reviewSessions = pgTable('review_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizAttemptId: uuid('quiz_attempt_id').references(() => quizAttempts.id, { onDelete: 'set null' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  
  // Session details
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { 
    enum: ['remediation', 'enrichment', 'practice', 'mastery'] 
  }).notNull().default('remediation'),
  
  // Focus areas (topics/concepts to review)
  topics: jsonb('topics').$type<ReviewTopic[]>().notNull().default([]),
  
  // AI-generated content
  content: jsonb('content').$type<ReviewContent>(),
  
  // Progress
  status: text('status', { 
    enum: ['pending', 'in_progress', 'completed', 'skipped'] 
  }).notNull().default('pending'),
  progress: integer('progress').default(0), // Percentage complete
  
  // Completion
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  timeSpent: integer('time_spent'), // Seconds
  
  // Follow-up quiz
  followUpQuizId: uuid('follow_up_quiz_id').references(() => quizzes.id, { onDelete: 'set null' }),
  
  // Priority (higher = more urgent)
  priority: integer('priority').default(1),
  dueDate: timestamp('due_date'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Quiz Question Pool - Reusable questions for generating quizzes
 */
export const questionPool = pgTable('question_pool', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  
  // Question content
  question: text('question').notNull(),
  type: text('type', { 
    enum: ['multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'matching', 'ordering'] 
  }).notNull(),
  options: jsonb('options').$type<QuestionOption[]>(),
  correctAnswer: jsonb('correct_answer').$type<string | string[] | Record<string, string>>().notNull(),
  explanation: text('explanation'),
  
  // Metadata
  subject: text('subject'),
  topic: text('topic'),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).default('medium'),
  points: integer('points').default(1),
  
  // Tags for filtering
  tags: jsonb('tags').$type<string[]>().default([]),
  
  // Usage tracking
  timesUsed: integer('times_used').default(0),
  correctRate: real('correct_rate'), // Percentage of students who got it right
  
  // AI metadata
  aiGenerated: boolean('ai_generated').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// Types
// ============================================================================

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer: string | string[] | Record<string, string>;
  explanation?: string;
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  imageUrl?: string;
  hints?: string[];
}

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
  isCorrect?: boolean; // Used during grading, not exposed to students
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[] | Record<string, string>;
  isCorrect?: boolean;
  pointsEarned?: number;
  timeSpent?: number; // Seconds on this question
}

export interface ReviewTopic {
  topic: string;
  description?: string;
  masteryLevel: number; // 0-100
  priority: number;
  relatedQuestionIds?: string[];
}

export interface ReviewContent {
  summary: string;
  keyPoints: string[];
  examples?: { title: string; content: string }[];
  practiceQuestions?: QuizQuestion[];
  resources?: { title: string; url: string; type: string }[];
}

export type QuizType = 'practice' | 'graded' | 'diagnostic' | 'mastery_check' | 'review';
export type QuizStatus = 'draft' | 'published' | 'archived';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching' | 'ordering';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'expired';
export type ReviewSessionType = 'remediation' | 'enrichment' | 'practice' | 'mastery';
export type ReviewSessionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;
export type ReviewSession = typeof reviewSessions.$inferSelect;
export type NewReviewSession = typeof reviewSessions.$inferInsert;
export type PoolQuestion = typeof questionPool.$inferSelect;
export type NewPoolQuestion = typeof questionPool.$inferInsert;
