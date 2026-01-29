import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getStudentQuizData } from '../services/sheets';
import { generateLessonPlan, type GameInterface } from '../services/gemini';
import { sendLessonInviteEmail } from '../services/email';

const router = Router();

// In-memory session store for mock mode (no database required)
interface SessionData {
  id: string;
  email: string;
  currentStage: number;
  lessonPlan: GameInterface;
  personalityTone: string;
  isChallenge?: boolean;
  createdAt: Date;
}

const mockSessionStore = new Map<string, SessionData>();

// Conditionally import database (only if not in mock mode)
let db: any = null;
let schema: any = null;
let eq: any = null;

const isMockMode = process.env.MOCK_MODE === 'true';

if (!isMockMode) {
  import('../db').then((dbModule) => {
    db = dbModule.db;
    schema = dbModule.schema;
  });
  import('drizzle-orm').then((drizzleModule) => {
    eq = drizzleModule.eq;
  });
}

// Send lesson invite email to student (email-only, no studentId)
router.post('/invite', async (req: Request, res: Response) => {
  try {
    const { email, studentName, personalityTone = 'Hype Man' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Fetch student quiz data (attempts, topic from sheet name)
    const quizData = await getStudentQuizData(email);
    
    // Generate session ID
    const sessionId = uuidv4();

    // Generate lesson plan (Gemini now handles grading and challenge detection)
    let lessonPlan, isChallenge;
    try {
      const result = await generateLessonPlan(quizData.attempts, personalityTone, quizData.topic);
      lessonPlan = result.lessonPlan;
      isChallenge = result.isChallenge;
    } catch (aiError) {
      console.error('[Lesson] AI generation failed, not sending email:', aiError);
      return res.status(500).json({ 
        error: 'AI lesson generation failed', 
        details: aiError instanceof Error ? aiError.message : 'Unknown error',
        emailSent: false 
      });
    }

    // Store session
    if (isMockMode) {
      mockSessionStore.set(sessionId, {
        id: sessionId,
        email,
        currentStage: 1,
        lessonPlan,
        personalityTone,
        isChallenge,
        createdAt: new Date(),
      });
      console.log(`[Mock] Session ${sessionId} stored in memory`);
    } else {
      await db.insert(schema.sessions).values({
        id: sessionId,
        studentId: email, // Using email as identifier
        currentStage: 1,
        lessonPlan: lessonPlan as unknown as Record<string, unknown>,
        // We don't really have "failedQuestions" in the DB schema same way anymore, 
        // but we can store the attempts or just an empty array if strictly typed.
        // For now, let's assume valid attempts = failed for DB purposes or just ignore.
        failedQuestions: [] as unknown as Record<string, unknown>[], 
        personalityTone,
        isChallenge,
      });
    }

    // Use name from Sheet (most accurate), then fallback to webhook, then email
    const recipientName = quizData.studentName || studentName || email.split('@')[0];

    // Send email
    const emailSent = await sendLessonInviteEmail({
      to: email,
      studentName: recipientName,
      sessionId,
      topic: quizData.topic,
      lowestScore: quizData.lowestScore,
      isChallenge,
    });

    res.json({
      success: true,
      sessionId,
      emailSent,
      sentTo: email,
      lowestScore: quizData.lowestScore,
      topic: quizData.topic,
      questionsCount: quizData.attempts.length, // Total attempts found
      lessonUrl: `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/lesson/${sessionId}`,
      isChallenge,
    });

  } catch (error) {
    console.error('[Lesson] Error sending invite:', error);
    res.status(500).json({ error: 'Failed to send lesson invite' });
  }
});

// Create a new lesson session (for direct access, still uses email)
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { email, personalityTone = 'Hype Man' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const sessionId = uuidv4();
    const quizData = await getStudentQuizData(email);

    const { lessonPlan, isChallenge } = await generateLessonPlan(quizData.attempts, personalityTone, quizData.topic);

    if (isMockMode) {
      mockSessionStore.set(sessionId, {
        id: sessionId,
        email,
        currentStage: 1,
        lessonPlan,
        personalityTone,
        isChallenge,
        createdAt: new Date(),
      });
      console.log(`[Mock] Session ${sessionId} stored in memory`);
    } else {
      await db.insert(schema.sessions).values({
        id: sessionId,
        studentId: email,
        currentStage: 1,
        lessonPlan: lessonPlan as unknown as Record<string, unknown>,
        failedQuestions: [] as unknown as Record<string, unknown>[],
        personalityTone,
        isChallenge,
      });
    }

    const firstStage = lessonPlan.stages[0];

    res.json({
      sessionId,
      currentStage: 1,
      totalStages: lessonPlan.stages.length,
      personalityTone: lessonPlan.personalityTone,
      stage: firstStage,
      isChallenge,
    });

  } catch (error) {
    console.error('[Lesson] Error starting lesson:', error);
    res.status(500).json({ error: 'Failed to start lesson' });
  }
});

// Get current lesson state
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    let session: SessionData | null = null;

    if (isMockMode) {
      session = mockSessionStore.get(sessionId) || null;
    } else {
      const dbSession = await db.query.sessions.findFirst({
        where: eq(schema.sessions.id, sessionId),
      });
      if (dbSession) {
        session = {
          id: dbSession.id,
          email: dbSession.studentId,
          currentStage: dbSession.currentStage,
          lessonPlan: dbSession.lessonPlan as unknown as GameInterface,
          personalityTone: dbSession.personalityTone,
          isChallenge: dbSession.isChallenge, // Ensure your DB schema has this column if needed, or ignore
          createdAt: dbSession.createdAt,
        };
      }
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const lessonPlan = session.lessonPlan;
    const currentStageIndex = session.currentStage - 1;
    const currentStage = lessonPlan.stages[currentStageIndex];

    res.json({
      sessionId,
      currentStage: session.currentStage,
      totalStages: lessonPlan.stages.length,
      personalityTone: lessonPlan.personalityTone,
      stage: currentStage,
      isComplete: session.currentStage > lessonPlan.stages.length,
    });

  } catch (error) {
    console.error('[Lesson] Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Advance to next stage
router.post('/:sessionId/progress', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    let session: SessionData | null = null;

    if (isMockMode) {
      session = mockSessionStore.get(sessionId) || null;
    } else {
      const dbSession = await db.query.sessions.findFirst({
        where: eq(schema.sessions.id, sessionId),
      });
      if (dbSession) {
        session = {
          id: dbSession.id,
          email: dbSession.studentId,
          currentStage: dbSession.currentStage,
          lessonPlan: dbSession.lessonPlan as unknown as GameInterface,
          personalityTone: dbSession.personalityTone,
          createdAt: dbSession.createdAt,
        };
      }
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const lessonPlan = session.lessonPlan;
    const nextStage = session.currentStage + 1;

    if (isMockMode) {
      session.currentStage = nextStage;
      mockSessionStore.set(sessionId, session);
    } else {
      await db.update(schema.sessions)
        .set({
          currentStage: nextStage,
          updatedAt: new Date(),
        })
        .where(eq(schema.sessions.id, sessionId));
    }

    if (nextStage > lessonPlan.stages.length) {
      return res.json({
        sessionId,
        currentStage: nextStage,
        isComplete: true,
        message: 'Congratulations! You completed the lesson!',
      });
    }

    const nextStageData = lessonPlan.stages[nextStage - 1];

    res.json({
      sessionId,
      currentStage: nextStage,
      totalStages: lessonPlan.stages.length,
      stage: nextStageData,
      isComplete: false,
    });

  } catch (error) {
    console.error('[Lesson] Error progressing lesson:', error);
    res.status(500).json({ error: 'Failed to progress lesson' });
  }
});

export default router;
