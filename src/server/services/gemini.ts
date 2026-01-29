import { GoogleGenAI, Type } from '@google/genai';
import type { QuestionAttempt } from './sheets';

// Initialize Gemini client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Lesson schema - teaches concepts WITHOUT revealing answers, then quizzes
const LessonPageSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Main title for the lesson page',
    },
    intro: {
      type: Type.STRING,
      description: 'Brief encouraging intro message for the student',
    },
    sections: {
      type: Type.ARRAY,
      description: 'One section per topic that needs review',
      items: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: 'The topic or concept being taught',
          },
          teaching: {
            type: Type.STRING,
            description: 'Clear explanation of the concept WITHOUT revealing the specific answer',
          },
          keyPoint: {
            type: Type.STRING,
            description: 'The main takeaway the student should remember',
          },
          example: {
            type: Type.STRING,
            description: 'A practical example to illustrate the concept',
          },
        },
        required: ['topic', 'teaching', 'keyPoint'],
      },
    },
    quizQuestions: {
      type: Type.ARRAY,
      description: 'Quiz questions to test understanding after teaching',
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: 'The quiz question',
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '4 multiple choice options',
          },
          correctIndex: {
            type: Type.NUMBER,
            description: 'Index of the correct answer (0-3)',
          },
          explanation: {
            type: Type.STRING,
            description: 'Brief explanation shown after answering',
          },
        },
        required: ['question', 'options', 'correctIndex', 'explanation'],
      },
    },
    encouragement: {
      type: Type.STRING,
      description: 'Closing encouragement message',
    },
  },
  required: ['title', 'intro', 'sections', 'quizQuestions', 'encouragement'],
};

// Types
export interface TeachingSection {
  topic: string;
  teaching: string;
  keyPoint: string;
  example?: string;
}

export interface LessonQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonPage {
  title: string;
  intro: string;
  sections: TeachingSection[];
  quizQuestions: LessonQuizQuestion[];
  encouragement: string;
}

export interface GameStage {
  stageNumber: number;
  title: string;
  components: GameComponent[];
}

export interface GameComponent {
  type: 'explainer' | 'bossBattle' | 'levelMap' | 'victory';
  props: Record<string, unknown>;
}

export interface GameInterface {
  personalityTone: string;
  stages: GameStage[];
}

/**
 * Generate a lesson plan from student quiz attempts.
 * Throws an error if AI generation fails (prevents email from being sent).
 */
export async function generateLessonPlan(
  attempts: QuestionAttempt[],
  personalityTone: string = 'Hype Man',
  topic: string = 'General Knowledge'
): Promise<{ lessonPlan: GameInterface; isChallenge: boolean }> {
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = `You are Kira, a friendly and encouraging AI tutor.

Analyze these student quiz answers:

${attempts.map((a, i) => `
Q${i + 1}: ${a.question}
Student's Answer: ${a.studentAnswer}
`).join('\n')}

Identify which answers are INCORRECT based on the questions.

For each incorrect answer:
1. CREATE A TEACHING SECTION that:
   - Identifies the topic/concept being tested
   - Explains the underlying concept clearly WITHOUT directly revealing the answer
   - Teaches the principle so the student can figure out the correct answer themselves
   - Provides a key point to remember
   - Optionally gives a practical example

2. CREATE A QUIZ QUESTION to test their understanding:
   - The question should test the same concept
   - Provide 4 options with only ONE correct answer
   - Set correctIndex to the index (0-3) of the correct option
   - Include a brief explanation for after they answer

IMPORTANT: In teaching sections, DO NOT reveal the answer. Teach the concept!

If ALL answers are correct, create a congratulatory lesson with advanced challenge questions.
`;

  console.log('[Gemini] Generating lesson for', attempts.length, 'attempts');

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: LessonPageSchema,
      maxOutputTokens: 4096,
    },
  });

  const responseText = response.text || '{}';
  console.log('[Gemini] Response length:', responseText.length);
  
  let lessonPage: LessonPage;
  
  try {
    lessonPage = JSON.parse(responseText) as LessonPage;
  } catch (parseError) {
    console.error('[Gemini] JSON parse error:', responseText.substring(0, 500));
    throw new Error('Failed to parse AI response');
  }

  // Check if all correct (challenge mode)
  const isChallenge = lessonPage.sections.length === 0 || 
    lessonPage.title.toLowerCase().includes('perfect') ||
    lessonPage.title.toLowerCase().includes('challenge');

  // Build game stages from lesson page
  const stages = buildStagesFromLessonPage(lessonPage, personalityTone);

  return {
    lessonPlan: {
      personalityTone,
      stages,
    },
    isChallenge,
  };
}

/**
 * Convert LessonPage to GameStage array
 */
function buildStagesFromLessonPage(lessonPage: LessonPage, _personalityTone: string): GameStage[] {
  const stages: GameStage[] = [];
  const totalTeaching = lessonPage.sections.length;
  const totalQuiz = lessonPage.quizQuestions.length;
  const totalStages = totalTeaching + totalQuiz + 1;

  const getLevels = (current: number) => {
    const levels = [];
    for (let i = 0; i < totalTeaching; i++) {
      levels.push({ 
        id: i + 1, 
        name: `Learn ${i + 1}`, 
        status: (i + 1) <= current ? ((i + 1) === current ? 'current' : 'completed') : 'locked' 
      });
    }
    for (let i = 0; i < totalQuiz; i++) { 
      const id = totalTeaching + i + 1; 
      levels.push({ 
        id, 
        name: `Quiz ${i + 1}`, 
        status: id <= current ? (id === current ? 'current' : 'completed') : 'locked' 
      }); 
    }
    levels.push({ id: totalStages, name: 'Victory', status: totalStages === current ? 'current' : 'locked' });
    return levels;
  };

  let stageNum = 1;

  // Phase 1: Teaching
  lessonPage.sections.forEach((section) => {
    stages.push({
      stageNumber: stageNum,
      title: `Lesson ${stageNum}: ${section.topic}`,
      components: [
        { type: 'levelMap', props: { levels: getLevels(stageNum) } },
        {
          type: 'explainer' as const,
          props: {
            title: section.topic,
            content: `${section.teaching}\n\n**Key Point:** ${section.keyPoint}${section.example ? `\n\n**Example:** ${section.example}` : ''}`,
            encouragement: lessonPage.encouragement,
          },
        },
      ],
    });
    stageNum++;
  });

  // Phase 2: Quiz
  lessonPage.quizQuestions.forEach((quiz, index) => {
    const correctAnswer = quiz.options[quiz.correctIndex];
    stages.push({
      stageNumber: stageNum,
      title: `Quiz ${index + 1}`,
      components: [
        { type: 'levelMap', props: { levels: getLevels(stageNum) } },
        {
          type: 'bossBattle' as const,
          props: {
            bossName: `Challenge ${index + 1}`,
            bossHealth: 100,
            question: quiz.question,
            options: quiz.options,
            correctAnswer: correctAnswer,
            hint: "Apply what you learned!",
            xpReward: 100,
          },
        },
      ],
    });
    stageNum++;
  });

  // Victory
  stages.push({
    stageNumber: stageNum,
    title: 'Lesson Complete!',
    components: [
      { type: 'levelMap', props: { levels: getLevels(stageNum) } },
      {
        type: 'victory' as const,
        props: {
          title: '🎉 Great Job!',
          encouragement: lessonPage.encouragement,
          stats: {
            questionsAnswered: totalQuiz,
            accuracy: 100,
            xpEarned: totalQuiz * 100,
            timeSpent: '5m',
          },
        },
      },
    ],
  });

  return stages;
}
