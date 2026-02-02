import { pgTable, text, timestamp, uuid, jsonb, integer, real, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { documents } from './documents';
import { lessons } from './lessons';

/**
 * Document Embeddings - Vector embeddings for document chunks
 * 
 * Note: This schema assumes pgvector extension is enabled.
 * The 'embedding' column would ideally be vector(1536) for OpenAI embeddings
 * or vector(768) for other models, but we use jsonb for compatibility.
 * 
 * When Cloud SQL has pgvector enabled, change:
 * embedding: vector('embedding', { dimensions: 1536 }),
 */
export const documentEmbeddings = pgTable('document_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  
  // Chunk information
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  chunkTokens: integer('chunk_tokens'),
  
  // Embedding (stored as JSON array for now, migrate to vector type later)
  embedding: jsonb('embedding').$type<number[]>().notNull(),
  embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),
  embeddingDimensions: integer('embedding_dimensions').default(1536),
  
  // Metadata
  metadata: jsonb('metadata').$type<ChunkMetadata>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Index for document lookup
  index('doc_embedding_doc_idx').on(table.documentId),
  // Index for chunk ordering
  index('doc_embedding_chunk_idx').on(table.documentId, table.chunkIndex),
]);

/**
 * Lesson Embeddings - Vector embeddings for lesson content
 */
export const lessonEmbeddings = pgTable('lesson_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  
  // Content segment
  segmentType: text('segment_type', { 
    enum: ['teaching', 'example', 'key_point', 'quiz_question', 'full_lesson'] 
  }).notNull(),
  segmentIndex: integer('segment_index').default(0),
  segmentText: text('segment_text').notNull(),
  
  // Embedding
  embedding: jsonb('embedding').$type<number[]>().notNull(),
  embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),
  
  // Topic for retrieval
  topic: text('topic'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('lesson_embedding_lesson_idx').on(table.lessonId),
  index('lesson_embedding_topic_idx').on(table.topic),
]);

/**
 * User Learning Profiles - Track learning preferences and progress
 */
export const userLearningProfiles = pgTable('user_learning_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  
  // Learning style preferences
  preferredLearningStyle: text('preferred_learning_style', {
    enum: ['visual', 'auditory', 'reading', 'kinesthetic', 'mixed'],
  }).default('mixed'),
  preferredPace: text('preferred_pace', {
    enum: ['slow', 'normal', 'fast'],
  }).default('normal'),
  
  // Topic mastery (topic -> mastery level 0-100)
  topicMastery: jsonb('topic_mastery').$type<Record<string, number>>().default({}),
  
  // Weak areas to focus on
  weakAreas: jsonb('weak_areas').$type<string[]>().default([]),
  strongAreas: jsonb('strong_areas').$type<string[]>().default([]),
  
  // Learning history summary
  totalLessonsCompleted: integer('total_lessons_completed').default(0),
  totalQuizzesTaken: integer('total_quizzes_taken').default(0),
  averageQuizScore: real('average_quiz_score'),
  totalTimeSpentMinutes: integer('total_time_spent_minutes').default(0),
  
  // AI personalization embedding (user's learning profile as a vector)
  profileEmbedding: jsonb('profile_embedding').$type<number[]>(),
  
  // Last activity
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Semantic Search Cache - Cache for common searches
 */
export const searchCache = pgTable('search_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Query
  queryText: text('query_text').notNull(),
  queryEmbedding: jsonb('query_embedding').$type<number[]>().notNull(),
  
  // Results (cached document/lesson IDs with scores)
  results: jsonb('results').$type<SearchResult[]>().notNull(),
  
  // Cache metadata
  searchType: text('search_type', { enum: ['documents', 'lessons', 'all'] }).notNull(),
  hitCount: integer('hit_count').default(1),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

// ============================================================================
// Types
// ============================================================================

export interface ChunkMetadata {
  pageNumber?: number;
  section?: string;
  headings?: string[];
  hasImages?: boolean;
  hasCode?: boolean;
  language?: string;
}

export interface SearchResult {
  id: string;
  type: 'document' | 'lesson' | 'chunk';
  score: number;
  title?: string;
  snippet?: string;
  metadata?: Record<string, unknown>;
}

export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
export type LearningPace = 'slow' | 'normal' | 'fast';
export type SegmentType = 'teaching' | 'example' | 'key_point' | 'quiz_question' | 'full_lesson';

export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;
export type NewDocumentEmbedding = typeof documentEmbeddings.$inferInsert;
export type LessonEmbedding = typeof lessonEmbeddings.$inferSelect;
export type NewLessonEmbedding = typeof lessonEmbeddings.$inferInsert;
export type UserLearningProfile = typeof userLearningProfiles.$inferSelect;
export type NewUserLearningProfile = typeof userLearningProfiles.$inferInsert;
