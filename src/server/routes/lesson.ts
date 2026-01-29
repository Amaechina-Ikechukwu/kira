import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getStudentQuizData } from '../services/sheets';
import { generateLessonPlan, generateExploratoryLesson } from '../services/gemini';
import { sendLessonInviteEmail } from '../services/email';
import { getSession, setSession, updateSession } from '../stores/sessionStore';
import { requireAuth, optionalAuth } from './auth';

const router = Router();

// Note: Auth is applied per-route below
// /explore uses optionalAuth to allow public access from landing page
// All other routes require authentication

// Send lesson invite email to student (requires auth)
router.post('/invite', requireAuth, async (req: Request, res: Response) => {
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

    // Store session in database
    await setSession(sessionId, {
      id: sessionId,
      email,
      currentStage: 1,
      lessonPlan,
      personalityTone,
      isChallenge,
      createdAt: new Date(),
    });
    console.log(`[Session] ${sessionId} stored in database`);

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

// Explore a topic (public - no auth required for landing page demo)
router.post('/explore', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { topic, personalityTone = 'Hype Man' } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ error: 'topic is required' });
    }

    const sessionId = uuidv4();
    
    console.log(`[Explore] Generating lesson for topic: "${topic}"`);

    const { lessonPlan } = await generateExploratoryLesson(topic.trim(), personalityTone);

    // Store session in database
    await setSession(sessionId, {
      id: sessionId,
      topic: topic.trim(),
      currentStage: 1,
      lessonPlan,
      personalityTone,
      createdAt: new Date(),
    });
    console.log(`[Session] Explore session ${sessionId} stored in database`);

    const firstStage = lessonPlan.stages[0];

    res.json({
      sessionId,
      topic: topic.trim(),
      currentStage: 1,
      totalStages: lessonPlan.stages.length,
      personalityTone: lessonPlan.personalityTone,
      stage: firstStage,
    });

  } catch (error) {
    console.error('[Explore] Error generating lesson:', error);
    res.status(500).json({ 
      error: 'Failed to generate lesson',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new lesson session (requires auth)
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const { email, personalityTone = 'Hype Man' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const sessionId = uuidv4();
    const quizData = await getStudentQuizData(email);

    const { lessonPlan, isChallenge } = await generateLessonPlan(quizData.attempts, personalityTone, quizData.topic);

    // Store session in database
    await setSession(sessionId, {
      id: sessionId,
      email,
      currentStage: 1,
      lessonPlan,
      personalityTone,
      isChallenge,
      createdAt: new Date(),
    });
    console.log(`[Session] ${sessionId} stored in database`);

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

// Get current lesson state (requires auth)
router.get('/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    console.log(`[Lesson] GET session: ${sessionId}`);

    const session = await getSession(sessionId);

    if (!session) {
      console.log(`[Lesson] Session not found: ${sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }

    const lessonPlan = session.lessonPlan;
    const currentStageIndex = session.currentStage - 1;
    const currentStage = lessonPlan.stages[currentStageIndex];

    console.log(`[Lesson] Session found, stage ${session.currentStage}/${lessonPlan.stages.length}`);

    if (!currentStage) {
      console.error(`[Lesson] Stage not found at index ${currentStageIndex}`);
      return res.status(500).json({ error: 'Stage not found' });
    }

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

// Advance to next stage (requires auth)
router.post('/:sessionId/progress', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const lessonPlan = session.lessonPlan;
    const nextStage = session.currentStage + 1;

    // Update session in database
    await updateSession(sessionId, { currentStage: nextStage });

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
