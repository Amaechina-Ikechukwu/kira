import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicGameLoader from '../components/game/DynamicGameLoader';

interface Stage {
  stageNumber: number;
  title: string;
  components: Array<{
    type: string;
    props: Record<string, unknown>;
  }>;
}

interface LessonState {
  sessionId: string;
  currentStage: number;
  totalStages: number;
  personalityTone: string;
  stage: Stage;
  isComplete: boolean;
}

export default function LessonPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLesson();
  }, [sessionId]);

  const fetchLesson = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/lesson/${sessionId}`);
      const data = await response.json();

      if (response.ok) {
        setLesson(data);
      } else {
        setError(data.error || 'Failed to load lesson');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgress = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/lesson/${sessionId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct: true }),
      });

      const data = await response.json();

      if (data.isComplete) {
        setLesson(prev => prev ? { ...prev, isComplete: true } : null);
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setLesson(data);
      }
    } catch (err) {
      setError('Failed to progress');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoading && !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-learning">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading your lesson...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-learning">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 border border-red-200 shadow-lg max-w-md text-center"
        >
          <span className="text-4xl mb-4 block">😕</span>
          <h2 className="text-xl font-bold text-red-500 mb-2">Oops!</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={handleGoHome}
            className="btn-secondary"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-learning">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto mb-8 flex items-center justify-between"
      >
        <button
          onClick={handleGoHome}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Exit Lesson
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
          <span className="text-sm text-slate-500">Stage</span>
          <span className="font-bold text-blue-600">{lesson.currentStage}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-500">{lesson.totalStages}</span>
        </div>
      </motion.header>

      {lesson.isComplete ? (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-20"
        >
          <h1 className="text-5xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 mb-4">
            Lesson Complete! 🎉
          </h1>
          <p className="text-xl text-slate-500">Redirecting to home...</p>
        </motion.div>
      ) : (
        <>
          {/* Stage Title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={lesson.currentStage}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-4xl mx-auto"
            >
              <h1 className="text-3xl md:text-4xl font-display font-bold text-center mb-8 text-slate-800">
                {lesson.stage.title}
              </h1>

              {/* Dynamic Components */}
              <DynamicGameLoader
                components={lesson.stage.components}
                onProgress={handleProgress}
                onComplete={handleGoHome}
                isLoading={isLoading}
              />
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
