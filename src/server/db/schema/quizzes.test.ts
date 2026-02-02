import { describe, it, expect } from 'vitest';
import { 
  QuizQuestion,
  QuestionOption,
  QuizAnswer,
  ReviewTopic,
  ReviewContent,
  QuizType,
  QuizStatus,
  QuestionType,
  AttemptStatus,
  ReviewSessionType,
  ReviewSessionStatus,
} from './quizzes';

describe('Quiz Schema Types', () => {
  describe('QuizQuestion', () => {
    it('should create a multiple choice question', () => {
      const question: QuizQuestion = {
        id: 'q1',
        question: 'What is 2 + 2?',
        type: 'multiple_choice',
        options: [
          { id: 'a', text: '3' },
          { id: 'b', text: '4', isCorrect: true },
          { id: 'c', text: '5' },
          { id: 'd', text: '6' },
        ],
        correctAnswer: 'b',
        explanation: 'Basic addition: 2 + 2 = 4',
        points: 1,
        difficulty: 'easy',
        topic: 'Math Basics',
      };

      expect(question.type).toBe('multiple_choice');
      expect(question.options?.length).toBe(4);
      expect(question.points).toBe(1);
    });

    it('should create a true/false question', () => {
      const question: QuizQuestion = {
        id: 'q2',
        question: 'The Earth is flat.',
        type: 'true_false',
        options: [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False', isCorrect: true },
        ],
        correctAnswer: 'false',
        points: 1,
      };

      expect(question.type).toBe('true_false');
      expect(question.correctAnswer).toBe('false');
    });

    it('should create a short answer question', () => {
      const question: QuizQuestion = {
        id: 'q3',
        question: 'What is the capital of France?',
        type: 'short_answer',
        correctAnswer: ['Paris', 'paris'],
        points: 2,
        hints: ['It starts with "P"'],
      };

      expect(question.type).toBe('short_answer');
      expect(Array.isArray(question.correctAnswer)).toBe(true);
    });

    it('should create a matching question', () => {
      const question: QuizQuestion = {
        id: 'q4',
        question: 'Match the country with its capital',
        type: 'matching',
        correctAnswer: {
          'France': 'Paris',
          'Germany': 'Berlin',
          'Italy': 'Rome',
        },
        points: 3,
      };

      expect(question.type).toBe('matching');
      expect(typeof question.correctAnswer).toBe('object');
    });

    it('should create an ordering question', () => {
      const question: QuizQuestion = {
        id: 'q5',
        question: 'Put these steps in order',
        type: 'ordering',
        correctAnswer: ['step1', 'step2', 'step3', 'step4'],
        points: 2,
      };

      expect(question.type).toBe('ordering');
      expect(Array.isArray(question.correctAnswer)).toBe(true);
    });
  });

  describe('QuestionOption', () => {
    it('should have basic structure', () => {
      const option: QuestionOption = {
        id: 'opt1',
        text: 'Option A',
      };

      expect(option.id).toBeDefined();
      expect(option.text).toBeDefined();
    });

    it('should support image options', () => {
      const option: QuestionOption = {
        id: 'opt2',
        text: 'Cat',
        imageUrl: 'https://example.com/cat.jpg',
        isCorrect: true,
      };

      expect(option.imageUrl).toBeDefined();
      expect(option.isCorrect).toBe(true);
    });
  });

  describe('QuizAnswer', () => {
    it('should track student answer', () => {
      const answer: QuizAnswer = {
        questionId: 'q1',
        answer: 'b',
        timeSpent: 30,
      };

      expect(answer.questionId).toBe('q1');
      expect(answer.answer).toBe('b');
    });

    it('should include grading info after submission', () => {
      const answer: QuizAnswer = {
        questionId: 'q1',
        answer: 'b',
        isCorrect: true,
        pointsEarned: 1,
        timeSpent: 25,
      };

      expect(answer.isCorrect).toBe(true);
      expect(answer.pointsEarned).toBe(1);
    });
  });

  describe('ReviewTopic', () => {
    it('should track topic mastery', () => {
      const topic: ReviewTopic = {
        topic: 'Algebra',
        description: 'Basic algebraic equations',
        masteryLevel: 45,
        priority: 1,
        relatedQuestionIds: ['q1', 'q2', 'q3'],
      };

      expect(topic.masteryLevel).toBe(45);
      expect(topic.priority).toBe(1);
    });
  });

  describe('ReviewContent', () => {
    it('should have AI-generated content structure', () => {
      const content: ReviewContent = {
        summary: 'Review of algebra basics',
        keyPoints: ['Variables', 'Equations', 'Solving for X'],
        examples: [
          { title: 'Example 1', content: 'Solve: x + 5 = 10' },
        ],
        practiceQuestions: [
          {
            id: 'p1',
            question: 'What is x if x + 3 = 7?',
            type: 'short_answer',
            correctAnswer: '4',
            points: 1,
          },
        ],
        resources: [
          { title: 'Khan Academy', url: 'https://khanacademy.org', type: 'video' },
        ],
      };

      expect(content.keyPoints.length).toBe(3);
      expect(content.practiceQuestions?.length).toBe(1);
    });
  });

  describe('Quiz Enums', () => {
    it('should have all quiz types', () => {
      const types: QuizType[] = [
        'practice',
        'graded',
        'diagnostic',
        'mastery_check',
        'review',
      ];

      expect(types).toHaveLength(5);
      expect(types).toContain('graded');
    });

    it('should have all quiz statuses', () => {
      const statuses: QuizStatus[] = ['draft', 'published', 'archived'];
      expect(statuses).toHaveLength(3);
    });

    it('should have all question types', () => {
      const types: QuestionType[] = [
        'multiple_choice',
        'true_false',
        'short_answer',
        'fill_blank',
        'matching',
        'ordering',
      ];

      expect(types).toHaveLength(6);
    });

    it('should have all attempt statuses', () => {
      const statuses: AttemptStatus[] = [
        'in_progress',
        'submitted',
        'graded',
        'expired',
      ];

      expect(statuses).toHaveLength(4);
    });

    it('should have all review session types', () => {
      const types: ReviewSessionType[] = [
        'remediation',
        'enrichment',
        'practice',
        'mastery',
      ];

      expect(types).toHaveLength(4);
    });

    it('should have all review session statuses', () => {
      const statuses: ReviewSessionStatus[] = [
        'pending',
        'in_progress',
        'completed',
        'skipped',
      ];

      expect(statuses).toHaveLength(4);
    });
  });
});

describe('Quiz Grading Logic', () => {
  describe('Multiple Choice Grading', () => {
    it('should grade correct answer', () => {
      const question: QuizQuestion = {
        id: 'q1',
        question: 'What is 2 + 2?',
        type: 'multiple_choice',
        correctAnswer: 'b',
        points: 1,
      };
      
      const answer: QuizAnswer = {
        questionId: 'q1',
        answer: 'b',
      };

      const isCorrect = answer.answer === question.correctAnswer;
      expect(isCorrect).toBe(true);
    });

    it('should grade incorrect answer', () => {
      const question: QuizQuestion = {
        id: 'q1',
        question: 'What is 2 + 2?',
        type: 'multiple_choice',
        correctAnswer: 'b',
        points: 1,
      };
      
      const answer: QuizAnswer = {
        questionId: 'q1',
        answer: 'c',
      };

      const isCorrect = answer.answer === question.correctAnswer;
      expect(isCorrect).toBe(false);
    });
  });

  describe('Short Answer Grading', () => {
    it('should accept case-insensitive answer', () => {
      const correctAnswers = ['Paris', 'paris'];
      const userAnswer = 'PARIS';

      const isCorrect = correctAnswers.some(ca => 
        ca.toLowerCase().trim() === userAnswer.toLowerCase().trim()
      );

      expect(isCorrect).toBe(true);
    });

    it('should handle whitespace', () => {
      const correctAnswers = ['Paris'];
      const userAnswer = '  Paris  ';

      const isCorrect = correctAnswers.some(ca => 
        ca.toLowerCase().trim() === userAnswer.toLowerCase().trim()
      );

      expect(isCorrect).toBe(true);
    });
  });

  describe('Matching Grading', () => {
    it('should grade all correct matches', () => {
      const correctAnswer: Record<string, string> = {
        'France': 'Paris',
        'Germany': 'Berlin',
      };
      
      const userAnswer: Record<string, string> = {
        'France': 'Paris',
        'Germany': 'Berlin',
      };

      const isCorrect = Object.entries(correctAnswer).every(
        ([key, value]) => userAnswer[key] === value
      );

      expect(isCorrect).toBe(true);
    });

    it('should fail with partial matches', () => {
      const correctAnswer: Record<string, string> = {
        'France': 'Paris',
        'Germany': 'Berlin',
      };
      
      const userAnswer: Record<string, string> = {
        'France': 'Paris',
        'Germany': 'Rome', // Wrong!
      };

      const isCorrect = Object.entries(correctAnswer).every(
        ([key, value]) => userAnswer[key] === value
      );

      expect(isCorrect).toBe(false);
    });
  });

  describe('Score Calculation', () => {
    it('should calculate percentage score correctly', () => {
      const pointsEarned = 8;
      const pointsPossible = 10;
      const score = (pointsEarned / pointsPossible) * 100;

      expect(score).toBe(80);
    });

    it('should handle zero points possible', () => {
      const pointsEarned = 0;
      const pointsPossible = 0;
      const score = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;

      expect(score).toBe(0);
    });

    it('should determine pass/fail correctly', () => {
      const passingScore = 70;
      
      expect(80 >= passingScore).toBe(true); // Pass
      expect(69 >= passingScore).toBe(false); // Fail
      expect(70 >= passingScore).toBe(true); // Edge case - Pass
    });
  });

  describe('Weak Areas Detection', () => {
    it('should identify weak areas from topic scores', () => {
      const topicScores: Record<string, { correct: number; total: number }> = {
        'Algebra': { correct: 1, total: 4 }, // 25% - weak
        'Geometry': { correct: 4, total: 5 }, // 80% - strong
        'Statistics': { correct: 2, total: 4 }, // 50% - borderline
      };

      const weakAreas: string[] = [];
      const strongAreas: string[] = [];

      for (const [topic, { correct, total }] of Object.entries(topicScores)) {
        const rate = (correct / total) * 100;
        if (rate < 50) weakAreas.push(topic);
        else if (rate >= 80) strongAreas.push(topic);
      }

      expect(weakAreas).toContain('Algebra');
      expect(strongAreas).toContain('Geometry');
      expect(weakAreas).not.toContain('Statistics');
      expect(strongAreas).not.toContain('Statistics');
    });
  });
});

describe('Quiz Availability Logic', () => {
  it('should check if quiz is available now', () => {
    const now = new Date();
    const availableFrom = new Date(now.getTime() - 3600000); // 1 hour ago
    const availableUntil = new Date(now.getTime() + 3600000); // 1 hour from now

    const isAvailable = now >= availableFrom && now <= availableUntil;
    expect(isAvailable).toBe(true);
  });

  it('should detect quiz not yet available', () => {
    const now = new Date();
    const availableFrom = new Date(now.getTime() + 3600000); // 1 hour from now

    const notYetAvailable = now < availableFrom;
    expect(notYetAvailable).toBe(true);
  });

  it('should detect quiz expired', () => {
    const now = new Date();
    const availableUntil = new Date(now.getTime() - 3600000); // 1 hour ago

    const expired = now > availableUntil;
    expect(expired).toBe(true);
  });
});
