import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

/**
 * Users table - Core user accounts
 * Supports Google OAuth and magic link authentication
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  
  // Google OAuth
  googleId: text('google_id').unique(),
  
  // Platform role hierarchy: owner > superadmin > admin > support > moderator > user
  platformRole: text('platform_role', {
    enum: ['owner', 'superadmin', 'admin', 'support', 'moderator', 'user']
  }).notNull().default('user'),
  
  // For students: parent/guardian contact info
  guardianEmail: text('guardian_email'),
  guardianPhone: text('guardian_phone'),
  
  // User preferences (theme, notifications, etc.)
  preferences: jsonb('preferences').default({}),
  
  // Magic link fallback authentication
  magicLinkToken: text('magic_link_token'),
  tokenExpiry: timestamp('token_expiry'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PlatformRole = 'owner' | 'superadmin' | 'admin' | 'support' | 'moderator' | 'user';
