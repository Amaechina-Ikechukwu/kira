import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { type GameInterface } from '../services/gemini';

// Session data interface for application use
export interface SessionData {
  id: string;
  email?: string;
  topic?: string;
  currentStage: number;
  lessonPlan: GameInterface;
  personalityTone: string;
  isChallenge?: boolean;
  createdAt: Date;
}

/**
 * Get a session from the database
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    const session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.id, sessionId),
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      email: session.email || undefined,
      topic: session.topic || undefined,
      currentStage: session.currentStage,
      lessonPlan: session.lessonPlan as GameInterface,
      personalityTone: session.personalityTone,
      isChallenge: session.isChallenge === 'true',
      createdAt: session.createdAt,
    };
  } catch (error) {
    console.error('[SessionStore] Error getting session:', error);
    return null;
  }
}

/**
 * Create or update a session in the database
 */
export async function setSession(sessionId: string, session: SessionData): Promise<void> {
  try {
    await db.insert(schema.sessions).values({
      id: sessionId,
      email: session.email,
      topic: session.topic,
      currentStage: session.currentStage,
      lessonPlan: session.lessonPlan,
      personalityTone: session.personalityTone,
      isChallenge: session.isChallenge ? 'true' : 'false',
      createdAt: session.createdAt,
    }).onConflictDoUpdate({
      target: schema.sessions.id,
      set: {
        currentStage: session.currentStage,
        lessonPlan: session.lessonPlan,
        updatedAt: new Date(),
      },
    });
    console.log(`[SessionStore] Session ${sessionId} saved to database`);
  } catch (error) {
    console.error('[SessionStore] Error saving session:', error);
    throw error;
  }
}

/**
 * Update specific fields of a session
 */
export async function updateSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
  try {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.currentStage !== undefined) {
      updateData.currentStage = updates.currentStage;
    }
    if (updates.lessonPlan !== undefined) {
      updateData.lessonPlan = updates.lessonPlan;
    }

    await db.update(schema.sessions)
      .set(updateData)
      .where(eq(schema.sessions.id, sessionId));

    console.log(`[SessionStore] Session ${sessionId} updated`);
    return true;
  } catch (error) {
    console.error('[SessionStore] Error updating session:', error);
    return false;
  }
}

/**
 * Delete a session from the database
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    await db.delete(schema.sessions)
      .where(eq(schema.sessions.id, sessionId));
    console.log(`[SessionStore] Session ${sessionId} deleted`);
    return true;
  } catch (error) {
    console.error('[SessionStore] Error deleting session:', error);
    return false;
  }
}

// Also export a Map-like interface for backwards compatibility with in-memory usage
// This is deprecated and should be phased out
export const sessionStore = {
  async get(sessionId: string): Promise<SessionData | null> {
    return getSession(sessionId);
  },
  async set(sessionId: string, session: SessionData): Promise<void> {
    return setSession(sessionId, session);
  },
  async delete(sessionId: string): Promise<boolean> {
    return deleteSession(sessionId);
  },
};
