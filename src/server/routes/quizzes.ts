import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db, schema } from '../db';
import { requireAuth } from './auth';
import { requireSchoolPermission, loadSchool, getSchoolMembership } from '../middleware/rbac';
import { 
  NewQuiz, 
  NewQuizAttempt,
  NewReviewSession,
  QuizQuestion,
  QuizAnswer,
  ReviewTopic,
} from '../db/schema/quizzes';
import { sendReviewSessionAssignedEmail } from '../services/email';

const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Grade a quiz attempt
 */
function gradeQuizAttempt(
  questions: QuizQuestion[],
  answers: QuizAnswer[]
): {
  score: number;
  pointsEarned: number;
  pointsPossible: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  gradedAnswers: QuizAnswer[];
  weakAreas: string[];
  strongAreas: string[];
} {
  const answerMap = new Map(answers.map(a => [a.questionId, a]));
  let pointsEarned = 0;
  let pointsPossible = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;
  const topicCorrect: Record<string, number> = {};
  const topicTotal: Record<string, number> = {};
  const gradedAnswers: QuizAnswer[] = [];

  for (const question of questions) {
    pointsPossible += question.points;
    const topic = question.topic || 'General';
    topicTotal[topic] = (topicTotal[topic] || 0) + 1;

    const answer = answerMap.get(question.id);
    if (!answer || answer.answer === null || answer.answer === undefined || answer.answer === '') {
      skippedCount++;
      gradedAnswers.push({
        questionId: question.id,
        answer: '',
        isCorrect: false,
        pointsEarned: 0,
      });
      continue;
    }

    // Check correctness based on question type
    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      isCorrect = answer.answer === question.correctAnswer;
    } else if (question.type === 'short_answer') {
      // Case-insensitive comparison for short answers
      const correctAnswers = Array.isArray(question.correctAnswer) 
        ? question.correctAnswer 
        : [question.correctAnswer];
      isCorrect = correctAnswers.some(ca => 
        String(ca).toLowerCase().trim() === String(answer.answer).toLowerCase().trim()
      );
    } else if (question.type === 'matching') {
      // Check if all pairs match
      const userAnswer = answer.answer as Record<string, string>;
      const correctAnswer = question.correctAnswer as Record<string, string>;
      isCorrect = Object.entries(correctAnswer).every(
        ([key, value]) => userAnswer[key] === value
      );
    } else if (question.type === 'ordering') {
      // Check if arrays match in order
      const userAnswer = answer.answer as string[];
      const correctAnswer = question.correctAnswer as string[];
      isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
    }

    if (isCorrect) {
      correctCount++;
      pointsEarned += question.points;
      topicCorrect[topic] = (topicCorrect[topic] || 0) + 1;
    } else {
      incorrectCount++;
    }

    gradedAnswers.push({
      ...answer,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
    });
  }

  // Calculate weak and strong areas based on topics
  const weakAreas: string[] = [];
  const strongAreas: string[] = [];
  
  for (const [topic, total] of Object.entries(topicTotal)) {
    const correct = topicCorrect[topic] || 0;
    const rate = total > 0 ? (correct / total) * 100 : 0;
    
    if (rate < 50) {
      weakAreas.push(topic);
    } else if (rate >= 80) {
      strongAreas.push(topic);
    }
  }

  const score = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;

  return {
    score,
    pointsEarned,
    pointsPossible,
    correctCount,
    incorrectCount,
    skippedCount,
    gradedAnswers,
    weakAreas,
    strongAreas,
  };
}

/**
 * Generate review session for failed quiz
 */
async function createReviewSessionForAttempt(
  attempt: typeof schema.quizAttempts.$inferSelect,
  quiz: typeof schema.quizzes.$inferSelect
): Promise<void> {
  if (!attempt.weakAreas || attempt.weakAreas.length === 0) return;

  const topics: ReviewTopic[] = attempt.weakAreas.map((topic, index) => ({
    topic,
    description: `Review material for ${topic}`,
    masteryLevel: 0,
    priority: index + 1,
  }));

  await db.insert(schema.reviewSessions).values({
    studentId: attempt.studentId,
    quizAttemptId: attempt.id,
    lessonId: quiz.lessonId,
    title: `Review: ${quiz.title}`,
    description: `Review session based on your quiz attempt. Focus areas: ${attempt.weakAreas.join(', ')}`,
    type: 'remediation',
    topics,
    priority: 2,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 1 week
  });

  // Send email notification
  const student = await db.query.users.findFirst({
    where: eq(schema.users.id, attempt.studentId),
  });

  if (student && student.email) {
    sendReviewSessionAssignedEmail({
      to: student.email,
      recipientName: student.name || 'Scholar',
      quizTitle: quiz.title,
      weakAreas: attempt.weakAreas,
      reviewUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/reviews`, // Placeholder URL, ideally deep link
    }).catch(err => console.error(`[Quizzes] Failed to send review email to ${student.email}`, err));
  }
}

// ============================================================================
// Quiz CRUD Routes
// ============================================================================

/**
 * Create a new quiz
 */
router.post('/:schoolId/quizzes', requireAuth, loadSchool(), requireSchoolPermission('quizzes:create'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId as string;
    const userId = req.userId!;
    const { 
      title, 
      description, 
      type,
      classId,
      lessonId,
      meetingId,
      questions,
      passingScore,
      timeLimit,
      maxAttempts,
      shuffleQuestions,
      shuffleAnswers,
      showCorrectAnswers,
      showExplanations,
      availableFrom,
      availableUntil,
      status,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    // Validate class belongs to school
    if (classId) {
      const classObj = await db.query.classes.findFirst({
        where: and(
          eq(schema.classes.id, classId),
          eq(schema.classes.schoolId, schoolId)
        ),
      });
      if (!classObj) {
        return res.status(400).json({ error: 'Class not found in this school' });
      }
    }

    const [quiz] = await db.insert(schema.quizzes).values({
      schoolId,
      classId: classId || null,
      lessonId: lessonId || null,
      meetingId: meetingId || null,
      createdBy: userId,
      title: title.trim(),
      description: description || null,
      type: type || 'practice',
      questions,
      passingScore: passingScore || 70,
      timeLimit: timeLimit || null,
      maxAttempts: maxAttempts || 3,
      shuffleQuestions: shuffleQuestions ?? false,
      shuffleAnswers: shuffleAnswers ?? true,
      showCorrectAnswers: showCorrectAnswers ?? true,
      showExplanations: showExplanations ?? true,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      availableUntil: availableUntil ? new Date(availableUntil) : null,
      status: status || 'draft',
    }).returning();

    console.log('[Quizzes] Created:', quiz.id);

    res.status(201).json({
      message: 'Quiz created',
      quiz,
    });

  } catch (error) {
    console.error('[Quizzes] Create error:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

/**
 * List quizzes for a school/class
 */
router.get('/:schoolId/quizzes', requireAuth, loadSchool(), requireSchoolPermission('school:read'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId as string;
    const { classId, status, type } = req.query;

    let quizzes = await db.query.quizzes.findMany({
      where: eq(schema.quizzes.schoolId, schoolId),
      orderBy: desc(schema.quizzes.createdAt),
    });

    // Filter by class
    if (classId && typeof classId === 'string') {
      quizzes = quizzes.filter(q => q.classId === classId);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      quizzes = quizzes.filter(q => q.status === status);
    }

    // Filter by type
    if (type && typeof type === 'string') {
      quizzes = quizzes.filter(q => q.type === type);
    }

    // For response, don't send full questions (just count)
    const quizzesWithStats = quizzes.map(quiz => ({
      ...quiz,
      questionCount: quiz.questions.length,
      questions: undefined, // Don't expose questions in list
    }));

    res.json({ quizzes: quizzesWithStats });

  } catch (error) {
    console.error('[Quizzes] List error:', error);
    res.status(500).json({ error: 'Failed to list quizzes' });
  }
});

/**
 * Get quiz details (for taking or editing)
 */
router.get('/quizzes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.id as string;
    const userId = req.userId!;
    const { forTaking } = req.query; // If true, hides correct answers

    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, quizId),
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check availability
    const now = new Date();
    if (quiz.availableFrom && now < quiz.availableFrom) {
      return res.status(403).json({ error: 'Quiz is not yet available' });
    }
    if (quiz.availableUntil && now > quiz.availableUntil) {
      return res.status(403).json({ error: 'Quiz is no longer available' });
    }

    // Check attempt count
    const previousAttempts = await db.query.quizAttempts.findMany({
      where: and(
        eq(schema.quizAttempts.quizId, quizId),
        eq(schema.quizAttempts.studentId, userId)
      ),
    });

    const completedAttempts = previousAttempts.filter(a => a.status !== 'in_progress').length;
    const canAttempt = quiz.maxAttempts === null || completedAttempts < quiz.maxAttempts;

    // Prepare questions for student view
    let questions = quiz.questions;
    
    if (forTaking === 'true') {
      // Shuffle questions if enabled
      if (quiz.shuffleQuestions) {
        questions = [...questions].sort(() => Math.random() - 0.5);
      }

      // Shuffle answers if enabled
      if (quiz.shuffleAnswers) {
        questions = questions.map(q => ({
          ...q,
          options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : q.options,
          correctAnswer: undefined, // Hide correct answer
          explanation: undefined, // Hide explanation until submitted
        }));
      } else {
        questions = questions.map(q => ({
          ...q,
          correctAnswer: undefined,
          explanation: undefined,
        }));
      }
    }

    res.json({
      quiz: {
        ...quiz,
        questions: forTaking === 'true' ? questions : quiz.questions,
      },
      attemptCount: completedAttempts,
      canAttempt,
      inProgressAttempt: previousAttempts.find(a => a.status === 'in_progress'),
    });

  } catch (error) {
    console.error('[Quizzes] Get error:', error);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});

/**
 * Update quiz
 */
router.patch('/quizzes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.id as string;
    const userId = req.userId!;
    const updates = req.body;

    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, quizId),
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Only creator or school admin can update
    if (quiz.createdBy !== userId) {
      // Check if user has permission in the school
      if (quiz.schoolId) {
        const membership = await getSchoolMembership(userId, quiz.schoolId);
        if (!membership || !['principal', 'vice_principal', 'dept_head'].includes(membership.role)) {
          return res.status(403).json({ error: 'Not authorized to update this quiz' });
        }
      } else {
        return res.status(403).json({ error: 'Not authorized to update this quiz' });
      }
    }

    const updateData: Partial<NewQuiz> = {};
    if (updates.title) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.type) updateData.type = updates.type;
    if (updates.questions) updateData.questions = updates.questions;
    if (updates.passingScore !== undefined) updateData.passingScore = updates.passingScore;
    if (updates.timeLimit !== undefined) updateData.timeLimit = updates.timeLimit;
    if (updates.maxAttempts !== undefined) updateData.maxAttempts = updates.maxAttempts;
    if (updates.status) updateData.status = updates.status;
    if (updates.availableFrom !== undefined) updateData.availableFrom = updates.availableFrom ? new Date(updates.availableFrom) : null;
    if (updates.availableUntil !== undefined) updateData.availableUntil = updates.availableUntil ? new Date(updates.availableUntil) : null;
    updateData.updatedAt = new Date();

    const [updated] = await db.update(schema.quizzes)
      .set(updateData)
      .where(eq(schema.quizzes.id, quizId))
      .returning();

    res.json({
      message: 'Quiz updated',
      quiz: updated,
    });

  } catch (error) {
    console.error('[Quizzes] Update error:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

/**
 * Delete quiz
 */
router.delete('/quizzes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.id as string;
    const userId = req.userId!;

    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, quizId),
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Only creator can delete
    if (quiz.createdBy !== userId) {
      if (quiz.schoolId) {
        const membership = await getSchoolMembership(userId, quiz.schoolId);
        if (!membership || !['principal', 'vice_principal'].includes(membership.role)) {
          return res.status(403).json({ error: 'Not authorized to delete this quiz' });
        }
      } else {
        return res.status(403).json({ error: 'Not authorized to delete this quiz' });
      }
    }

    await db.delete(schema.quizzes).where(eq(schema.quizzes.id, quizId));

    res.json({ message: 'Quiz deleted' });

  } catch (error) {
    console.error('[Quizzes] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// ============================================================================
// Quiz Taking Routes
// ============================================================================

/**
 * Start a quiz attempt
 */
router.post('/quizzes/:id/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.id as string;
    const userId = req.userId!;

    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, quizId),
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.status !== 'published') {
      return res.status(403).json({ error: 'Quiz is not available' });
    }

    // Check availability
    const now = new Date();
    if (quiz.availableFrom && now < quiz.availableFrom) {
      return res.status(403).json({ error: 'Quiz is not yet available' });
    }
    if (quiz.availableUntil && now > quiz.availableUntil) {
      return res.status(403).json({ error: 'Quiz is no longer available' });
    }

    // Check for existing in-progress attempt
    const inProgressAttempt = await db.query.quizAttempts.findFirst({
      where: and(
        eq(schema.quizAttempts.quizId, quizId),
        eq(schema.quizAttempts.studentId, userId),
        eq(schema.quizAttempts.status, 'in_progress')
      ),
    });

    if (inProgressAttempt) {
      return res.json({
        message: 'Resuming existing attempt',
        attempt: inProgressAttempt,
      });
    }

    // Check attempt limit
    const previousAttempts = await db.query.quizAttempts.findMany({
      where: and(
        eq(schema.quizAttempts.quizId, quizId),
        eq(schema.quizAttempts.studentId, userId)
      ),
    });

    const completedAttempts = previousAttempts.filter(a => a.status !== 'in_progress').length;
    if (quiz.maxAttempts !== null && completedAttempts >= quiz.maxAttempts) {
      return res.status(403).json({ error: 'Maximum attempts reached' });
    }

    // Create new attempt
    const [attempt] = await db.insert(schema.quizAttempts).values({
      quizId,
      studentId: userId,
      attemptNumber: completedAttempts + 1,
      status: 'in_progress',
    }).returning();

    console.log('[Quizzes] Started attempt:', attempt.id);

    res.status(201).json({
      message: 'Quiz started',
      attempt,
    });

  } catch (error) {
    console.error('[Quizzes] Start error:', error);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

/**
 * Save progress on a quiz attempt
 */
router.patch('/attempts/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.id as string;
    const userId = req.userId!;
    const { answers, timeSpent } = req.body;

    const attempt = await db.query.quizAttempts.findFirst({
      where: and(
        eq(schema.quizAttempts.id, attemptId),
        eq(schema.quizAttempts.studentId, userId)
      ),
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Attempt is already completed' });
    }

    const [updated] = await db.update(schema.quizAttempts)
      .set({
        answers: answers || attempt.answers,
        timeSpent: timeSpent || attempt.timeSpent,
        updatedAt: new Date(),
      })
      .where(eq(schema.quizAttempts.id, attemptId))
      .returning();

    res.json({
      message: 'Progress saved',
      attempt: updated,
    });

  } catch (error) {
    console.error('[Quizzes] Save progress error:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

/**
 * Submit a quiz attempt
 */
router.post('/attempts/:id/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.id as string;
    const userId = req.userId!;
    const { answers, timeSpent } = req.body;

    const attempt = await db.query.quizAttempts.findFirst({
      where: and(
        eq(schema.quizAttempts.id, attemptId),
        eq(schema.quizAttempts.studentId, userId)
      ),
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Attempt is already completed' });
    }

    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, attempt.quizId),
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Use provided answers or saved answers
    const finalAnswers = answers || attempt.answers;

    // Grade the attempt
    const gradeResult = gradeQuizAttempt(quiz.questions, finalAnswers);
    const passed = gradeResult.score >= (quiz.passingScore || 70);

    // Generate feedback
    let feedback = passed 
      ? `Great job! You passed with a score of ${gradeResult.score.toFixed(1)}%.`
      : `You scored ${gradeResult.score.toFixed(1)}%. Keep practicing to improve!`;

    if (gradeResult.weakAreas.length > 0) {
      feedback += ` Focus on: ${gradeResult.weakAreas.join(', ')}.`;
    }

    const [updated] = await db.update(schema.quizAttempts)
      .set({
        answers: gradeResult.gradedAnswers,
        submittedAt: new Date(),
        score: gradeResult.score,
        pointsEarned: gradeResult.pointsEarned,
        pointsPossible: gradeResult.pointsPossible,
        correctCount: gradeResult.correctCount,
        incorrectCount: gradeResult.incorrectCount,
        skippedCount: gradeResult.skippedCount,
        timeSpent: timeSpent || attempt.timeSpent,
        passed,
        feedback,
        weakAreas: gradeResult.weakAreas,
        strongAreas: gradeResult.strongAreas,
        status: 'graded',
        updatedAt: new Date(),
      })
      .where(eq(schema.quizAttempts.id, attemptId))
      .returning();

    // Create review session if failed
    if (!passed) {
      await createReviewSessionForAttempt(updated, quiz);
    }

    console.log('[Quizzes] Submitted attempt:', attemptId, 'Score:', gradeResult.score);

    // Prepare response with correct answers and explanations
    const resultsWithAnswers = quiz.showCorrectAnswers ? quiz.questions.map(q => ({
      id: q.id,
      question: q.question,
      correctAnswer: q.correctAnswer,
      explanation: quiz.showExplanations ? q.explanation : undefined,
      userAnswer: gradeResult.gradedAnswers.find(a => a.questionId === q.id),
    })) : undefined;

    res.json({
      message: 'Quiz submitted',
      attempt: updated,
      results: resultsWithAnswers,
    });

  } catch (error) {
    console.error('[Quizzes] Submit error:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

/**
 * Get attempt results
 */
router.get('/attempts/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.id as string;
    const userId = req.userId!;

    const attempt = await db.query.quizAttempts.findFirst({
      where: eq(schema.quizAttempts.id, attemptId),
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // Students can only see their own attempts
    if (attempt.studentId !== userId) {
      // Check if teacher/admin
      const quiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, attempt.quizId),
      });
      
      if (quiz?.schoolId) {
        const membership = await getSchoolMembership(userId, quiz.schoolId);
        if (!membership || !['principal', 'vice_principal', 'dept_head', 'teacher'].includes(membership.role)) {
          return res.status(403).json({ error: 'Not authorized to view this attempt' });
        }
      } else {
        return res.status(403).json({ error: 'Not authorized to view this attempt' });
      }
    }

    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, attempt.quizId),
    });

    res.json({
      attempt,
      quiz: quiz ? {
        id: quiz.id,
        title: quiz.title,
        showCorrectAnswers: quiz.showCorrectAnswers,
        showExplanations: quiz.showExplanations,
        questions: quiz.showCorrectAnswers ? quiz.questions : undefined,
      } : null,
    });

  } catch (error) {
    console.error('[Quizzes] Get attempt error:', error);
    res.status(500).json({ error: 'Failed to get attempt' });
  }
});

// ============================================================================
// Review Session Routes
// ============================================================================

/**
 * Get review sessions for a student
 */
router.get('/reviews', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { status } = req.query;

    let reviews = await db.query.reviewSessions.findMany({
      where: eq(schema.reviewSessions.studentId, userId),
      orderBy: desc(schema.reviewSessions.createdAt),
    });

    if (status && typeof status === 'string') {
      reviews = reviews.filter(r => r.status === status);
    }

    res.json({ reviews });

  } catch (error) {
    console.error('[Reviews] List error:', error);
    res.status(500).json({ error: 'Failed to list reviews' });
  }
});

/**
 * Get review session details
 */
router.get('/reviews/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id as string;
    const userId = req.userId!;

    const review = await db.query.reviewSessions.findFirst({
      where: eq(schema.reviewSessions.id, reviewId),
    });

    if (!review) {
      return res.status(404).json({ error: 'Review session not found' });
    }

    if (review.studentId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this review' });
    }

    res.json({ review });

  } catch (error) {
    console.error('[Reviews] Get error:', error);
    res.status(500).json({ error: 'Failed to get review' });
  }
});

/**
 * Update review session progress
 */
router.patch('/reviews/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id as string;
    const userId = req.userId!;
    const { status, progress, timeSpent } = req.body;

    const review = await db.query.reviewSessions.findFirst({
      where: and(
        eq(schema.reviewSessions.id, reviewId),
        eq(schema.reviewSessions.studentId, userId)
      ),
    });

    if (!review) {
      return res.status(404).json({ error: 'Review session not found' });
    }

    const updates: Partial<NewReviewSession> = {};
    
    if (status === 'in_progress' && review.status === 'pending') {
      updates.status = 'in_progress';
      updates.startedAt = new Date();
    } else if (status === 'completed') {
      updates.status = 'completed';
      updates.completedAt = new Date();
      updates.progress = 100;
    } else if (status === 'skipped') {
      updates.status = 'skipped';
    }

    if (progress !== undefined) updates.progress = progress;
    if (timeSpent !== undefined) updates.timeSpent = timeSpent;
    updates.updatedAt = new Date();

    const [updated] = await db.update(schema.reviewSessions)
      .set(updates)
      .where(eq(schema.reviewSessions.id, reviewId))
      .returning();

    res.json({
      message: 'Review updated',
      review: updated,
    });

  } catch (error) {
    console.error('[Reviews] Update error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// ============================================================================
// AI Quiz Generation Routes
// ============================================================================

import { 
  generateAndSaveQuiz, 
  generateQuizFromTopic, 
  generateQuizFromContent 
} from '../services/quiz-generator';

/**
 * Generate quiz from lesson using AI
 */
router.post('/generate/from-lesson', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { 
      lessonId, 
      numberOfQuestions = 20, 
      difficulty = 'mixed',
      schoolId,
      classId,
    } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    // Enforce minimum 20 questions
    const questionCount = Math.max(parseInt(numberOfQuestions) || 20, 20);

    console.log('[AI Quiz] Generating from lesson:', lessonId, 'with', questionCount, 'questions');

    const quiz = await generateAndSaveQuiz(userId, {
      lessonId,
      numberOfQuestions: questionCount,
      difficulty,
      schoolId,
      classId,
    });

    res.status(201).json({
      message: `Quiz generated with ${quiz.questions.length} questions`,
      quiz: {
        ...quiz,
        questions: undefined, // Don't send full questions in response
        questionCount: quiz.questions.length,
      },
    });

  } catch (error) {
    console.error('[AI Quiz] Generate from lesson error:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate quiz from document using AI
 */
router.post('/generate/from-document', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { 
      documentId, 
      numberOfQuestions = 20, 
      difficulty = 'mixed',
      schoolId,
      classId,
    } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    const questionCount = Math.max(parseInt(numberOfQuestions) || 20, 20);

    console.log('[AI Quiz] Generating from document:', documentId, 'with', questionCount, 'questions');

    const quiz = await generateAndSaveQuiz(userId, {
      documentId,
      numberOfQuestions: questionCount,
      difficulty,
      schoolId,
      classId,
    });

    res.status(201).json({
      message: `Quiz generated with ${quiz.questions.length} questions`,
      quiz: {
        ...quiz,
        questions: undefined,
        questionCount: quiz.questions.length,
      },
    });

  } catch (error) {
    console.error('[AI Quiz] Generate from document error:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate quiz from topic using AI
 */
router.post('/generate/from-topic', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { 
      topic, 
      numberOfQuestions = 20, 
      difficulty = 'mixed',
      schoolId,
      classId,
    } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ error: 'topic is required' });
    }

    const questionCount = Math.max(parseInt(numberOfQuestions) || 20, 20);

    console.log('[AI Quiz] Generating from topic:', topic, 'with', questionCount, 'questions');

    const quiz = await generateAndSaveQuiz(userId, {
      topic: topic.trim(),
      numberOfQuestions: questionCount,
      difficulty,
      schoolId,
      classId,
    });

    res.status(201).json({
      message: `Quiz generated with ${quiz.questions.length} questions`,
      quiz: {
        ...quiz,
        questions: undefined,
        questionCount: quiz.questions.length,
      },
    });

  } catch (error) {
    console.error('[AI Quiz] Generate from topic error:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Preview quiz generation (without saving)
 */
router.post('/generate/preview', requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      topic, 
      content,
      numberOfQuestions = 20, 
      difficulty = 'mixed',
    } = req.body;

    if (!topic && !content) {
      return res.status(400).json({ error: 'Either topic or content is required' });
    }

    const questionCount = Math.max(parseInt(numberOfQuestions) || 20, 20);

    console.log('[AI Quiz] Preview generation with', questionCount, 'questions');

    let result;
    if (content) {
      result = await generateQuizFromContent(content, topic || 'Custom Content', { 
        numberOfQuestions: questionCount,
        difficulty,
      });
    } else {
      result = await generateQuizFromTopic(topic, { 
        numberOfQuestions: questionCount,
        difficulty,
      });
    }

    res.json({
      message: 'Quiz preview generated',
      quiz: result.quiz,
      questions: result.questions.slice(0, 5), // Only show first 5 questions in preview
      totalQuestions: result.questions.length,
    });

  } catch (error) {
    console.error('[AI Quiz] Preview error:', error);
    res.status(500).json({ 
      error: 'Failed to generate preview',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
