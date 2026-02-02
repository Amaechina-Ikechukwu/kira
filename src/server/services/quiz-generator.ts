import { GoogleGenAI, Type } from '@google/genai';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { QuizQuestion, QuestionOption } from '../db/schema/quizzes';

// Initialize Gemini client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// ============================================================================
// Schema for AI Quiz Generation
// ============================================================================

const GeneratedQuizSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Quiz title based on the content',
    },
    description: {
      type: Type.STRING,
      description: 'Brief description of what this quiz covers',
    },
    questions: {
      type: Type.ARRAY,
      description: 'Multiple choice questions',
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: 'The question text',
          },
          options: {
            type: Type.ARRAY,
            description: 'Four answer options (A, B, C, D)',
            items: {
              type: Type.OBJECT,
              properties: {
                id: {
                  type: Type.STRING,
                  description: 'Option ID (a, b, c, or d)',
                },
                text: {
                  type: Type.STRING,
                  description: 'Option text',
                },
              },
              required: ['id', 'text'],
            },
          },
          correctAnswer: {
            type: Type.STRING,
            description: 'The ID of the correct option (a, b, c, or d)',
          },
          explanation: {
            type: Type.STRING,
            description: 'Explanation of why the correct answer is correct',
          },
          topic: {
            type: Type.STRING,
            description: 'The specific topic this question tests',
          },
          difficulty: {
            type: Type.STRING,
            description: 'easy, medium, or hard',
          },
        },
        required: ['question', 'options', 'correctAnswer', 'explanation', 'topic', 'difficulty'],
      },
    },
    topics: {
      type: Type.ARRAY,
      description: 'List of topics covered in this quiz',
      items: { type: Type.STRING },
    },
  },
  required: ['title', 'description', 'questions', 'topics'],
};

// ============================================================================
// Types
// ============================================================================

interface GeneratedQuestion {
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
  topics: string[];
}

export interface QuizGenerationOptions {
  numberOfQuestions: number; // Minimum 20
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  focusTopics?: string[];
  includeExplanations?: boolean;
}

// ============================================================================
// AI Quiz Generation
// ============================================================================

/**
 * Generate a multiple choice quiz from lesson content
 */
export async function generateQuizFromLesson(
  lessonId: string,
  options: QuizGenerationOptions = { numberOfQuestions: 20 }
): Promise<{ quiz: GeneratedQuiz; questions: QuizQuestion[] }> {
  
  const lesson = await db.query.lessons.findFirst({
    where: eq(schema.lessons.id, lessonId),
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  // Extract content from lesson
  const lessonContent = extractLessonContent(lesson);

  return generateQuizFromContent(lessonContent, lesson.topic || 'General', options);
}

/**
 * Generate a multiple choice quiz from document content
 */
export async function generateQuizFromDocument(
  documentId: string,
  options: QuizGenerationOptions = { numberOfQuestions: 20 }
): Promise<{ quiz: GeneratedQuiz; questions: QuizQuestion[] }> {
  
  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, documentId),
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const content = document.extractedText || document.originalName || 'Document';
  const topic = document.originalName?.replace(/\.[^/.]+$/, '') || 'Document Content';

  return generateQuizFromContent(content, topic, options);
}

/**
 * Generate a multiple choice quiz from raw text content
 */
export async function generateQuizFromContent(
  content: string,
  topic: string,
  options: QuizGenerationOptions = { numberOfQuestions: 20 }
): Promise<{ quiz: GeneratedQuiz; questions: QuizQuestion[] }> {
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Enforce minimum 20 questions
  const questionCount = Math.max(options.numberOfQuestions, 20);

  const difficultyInstruction = getDifficultyInstruction(options.difficulty || 'mixed');
  const topicFocus = options.focusTopics?.length 
    ? `\n\nPay special attention to these topics: ${options.focusTopics.join(', ')}`
    : '';

  const prompt = `You are an expert educational assessment creator. Generate a comprehensive multiple choice quiz based on the following content.

CONTENT TO QUIZ:
"""
${content.substring(0, 15000)}
"""

TOPIC: ${topic}
${topicFocus}

REQUIREMENTS:
1. Generate EXACTLY ${questionCount} multiple choice questions
2. Each question MUST have exactly 4 options (a, b, c, d)
3. Only ONE option should be correct
4. ${difficultyInstruction}
5. Questions should test understanding, not just recall
6. Include a mix of conceptual, application, and analytical questions
7. Each question should have a clear, educational explanation
8. Cover all major topics from the content
9. Questions should be clear and unambiguous
10. Avoid trick questions or unnecessarily confusing wording

DISTRIBUTION:
- Cover the main concepts thoroughly
- Include some questions that require applying multiple concepts
- Ensure questions are spread across all topics in the content

QUALITY GUIDELINES:
- Write questions that a teacher would be proud of
- Make explanations helpful for learning, not just stating the answer
- Ensure wrong options (distractors) are plausible but clearly incorrect
- Test higher-order thinking where appropriate`;

  console.log('[AI Quiz] Generating', questionCount, 'questions for topic:', topic);

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: GeneratedQuizSchema,
      maxOutputTokens: 16000, // Large output for many questions
    },
  });

  const responseText = response.text || '{}';
  console.log('[AI Quiz] Response length:', responseText.length);

  let generatedQuiz: GeneratedQuiz;
  
  try {
    generatedQuiz = JSON.parse(responseText) as GeneratedQuiz;
  } catch (parseError) {
    console.error('[AI Quiz] JSON parse error:', responseText.substring(0, 500));
    throw new Error('Failed to parse AI response');
  }

  // Validate and enforce minimum questions
  if (!generatedQuiz.questions || generatedQuiz.questions.length < 20) {
    throw new Error(`Quiz generation failed: only ${generatedQuiz.questions?.length || 0} questions generated (minimum 20 required)`);
  }

  // Convert to QuizQuestion format
  const questions = generatedQuiz.questions.map((q, index) => convertToQuizQuestion(q, index));

  console.log('[AI Quiz] Generated', questions.length, 'questions successfully');

  return { quiz: generatedQuiz, questions };
}

/**
 * Generate quiz directly from a topic (no source content needed)
 */
export async function generateQuizFromTopic(
  topic: string,
  options: QuizGenerationOptions = { numberOfQuestions: 20 }
): Promise<{ quiz: GeneratedQuiz; questions: QuizQuestion[] }> {
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const questionCount = Math.max(options.numberOfQuestions, 20);
  const difficultyInstruction = getDifficultyInstruction(options.difficulty || 'mixed');

  const prompt = `You are an expert educational assessment creator. Generate a comprehensive multiple choice quiz about: "${topic}"

REQUIREMENTS:
1. Generate EXACTLY ${questionCount} multiple choice questions about ${topic}
2. Each question MUST have exactly 4 options (a, b, c, d)
3. Only ONE option should be correct per question
4. ${difficultyInstruction}
5. Cover the topic comprehensively from basic to advanced concepts
6. Questions should test understanding, not just memorization
7. Include conceptual, application, and analytical questions
8. Each question needs a clear, educational explanation

QUESTION TYPES TO INCLUDE:
- Definition/concept questions (what is X?)
- Application questions (given scenario, what would happen?)
- Comparison questions (how does X differ from Y?)
- Cause/effect questions (why does X happen?)
- Best practice questions (what is the best approach for?)

QUALITY GUIDELINES:
- Make questions progressively more challenging
- Ensure all options are plausible
- Test real understanding, not trick knowledge
- Explanations should teach, not just confirm answers`;

  console.log('[AI Quiz] Generating topic quiz:', topic, 'with', questionCount, 'questions');

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: GeneratedQuizSchema,
      maxOutputTokens: 16000,
    },
  });

  const responseText = response.text || '{}';
  
  let generatedQuiz: GeneratedQuiz;
  
  try {
    generatedQuiz = JSON.parse(responseText) as GeneratedQuiz;
  } catch (parseError) {
    console.error('[AI Quiz] JSON parse error');
    throw new Error('Failed to parse AI response');
  }

  if (!generatedQuiz.questions || generatedQuiz.questions.length < 20) {
    throw new Error(`Quiz generation failed: minimum 20 questions required`);
  }

  const questions = generatedQuiz.questions.map((q, index) => convertToQuizQuestion(q, index));

  console.log('[AI Quiz] Topic quiz generated:', questions.length, 'questions');

  return { quiz: generatedQuiz, questions };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDifficultyInstruction(difficulty: 'easy' | 'medium' | 'hard' | 'mixed'): string {
  switch (difficulty) {
    case 'easy':
      return 'All questions should be EASY - testing basic understanding and recall';
    case 'medium':
      return 'All questions should be MEDIUM - testing application and understanding';
    case 'hard':
      return 'All questions should be HARD - testing analysis, synthesis, and complex application';
    case 'mixed':
    default:
      return 'Mix difficulty levels: approximately 30% easy, 50% medium, 20% hard';
  }
}

function extractLessonContent(lesson: typeof schema.lessons.$inferSelect): string {
  const parts: string[] = [];
  
  if (lesson.topic) {
    parts.push(`Topic: ${lesson.topic}`);
  }

  // Extract content from lesson plan
  if (lesson.lessonPlan) {
    const plan = lesson.lessonPlan as any;
    
    if (plan.stages) {
      for (const stage of plan.stages) {
        if (stage.components) {
          for (const component of stage.components) {
            if (component.type === 'explainer' && component.props) {
              if (component.props.title) parts.push(`## ${component.props.title}`);
              if (component.props.content) parts.push(component.props.content);
            }
          }
        }
      }
    }
  }

  return parts.join('\n\n');
}

function convertToQuizQuestion(generated: GeneratedQuestion, index: number): QuizQuestion {
  const options: QuestionOption[] = generated.options.map(opt => ({
    id: opt.id,
    text: opt.text,
    isCorrect: opt.id === generated.correctAnswer,
  }));

  return {
    id: `q${index + 1}`,
    question: generated.question,
    type: 'multiple_choice',
    options,
    correctAnswer: generated.correctAnswer,
    explanation: generated.explanation,
    points: getDifficultyPoints(generated.difficulty),
    difficulty: generated.difficulty,
    topic: generated.topic,
  };
}

function getDifficultyPoints(difficulty: 'easy' | 'medium' | 'hard'): number {
  switch (difficulty) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
    default: return 1;
  }
}

// ============================================================================
// Save Generated Quiz to Database
// ============================================================================

/**
 * Generate and save a quiz to the database
 */
export async function generateAndSaveQuiz(
  createdBy: string,
  options: {
    lessonId?: string;
    documentId?: string;
    topic?: string;
    schoolId?: string;
    classId?: string;
    numberOfQuestions?: number;
    difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  }
): Promise<typeof schema.quizzes.$inferSelect> {
  
  const questionCount = Math.max(options.numberOfQuestions || 20, 20);
  const genOptions: QuizGenerationOptions = {
    numberOfQuestions: questionCount,
    difficulty: options.difficulty,
  };

  let result: { quiz: GeneratedQuiz; questions: QuizQuestion[] };

  // Generate quiz from appropriate source
  if (options.lessonId) {
    result = await generateQuizFromLesson(options.lessonId, genOptions);
  } else if (options.documentId) {
    result = await generateQuizFromDocument(options.documentId, genOptions);
  } else if (options.topic) {
    result = await generateQuizFromTopic(options.topic, genOptions);
  } else {
    throw new Error('Must provide lessonId, documentId, or topic');
  }

  // Save to database
  const [quiz] = await db.insert(schema.quizzes).values({
    schoolId: options.schoolId || null,
    classId: options.classId || null,
    lessonId: options.lessonId || null,
    createdBy,
    title: result.quiz.title,
    description: result.quiz.description,
    type: 'practice',
    questions: result.questions,
    passingScore: 70,
    maxAttempts: 3,
    shuffleQuestions: true,
    shuffleAnswers: true,
    showCorrectAnswers: true,
    showExplanations: true,
    status: 'draft',
    aiGenerated: true,
    aiPrompt: options.topic || `Generated from ${options.lessonId ? 'lesson' : 'document'}`,
    sourceDocumentId: options.documentId || null,
  }).returning();

  console.log('[AI Quiz] Saved quiz:', quiz.id, 'with', result.questions.length, 'questions');

  return quiz;
}
