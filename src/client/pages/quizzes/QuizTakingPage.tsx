import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, XCircle, AlertTriangle, ArrowRight, Loader2, Play 
} from 'lucide-react';

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  points: number;
  options?: string[];
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  questions: Question[];
  passingScore: number;
}

interface Attempt {
  id: string;
  answers: any;
  status: string;
  score?: number;
  feedback?: string;
  gradedAnswers?: any[];
}

export default function QuizTakingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [canAttempt, setCanAttempt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    // Timer logic
    if (attempt?.status === 'in_progress' && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      handleSubmit(); // Auto submit
    }
  }, [timeLeft, attempt?.status]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes/${id}?forTaking=true`);
      if (!res.ok) throw new Error('Failed to load quiz');
      const data = await res.json();
      
      setQuiz(data.quiz);
      setCanAttempt(data.canAttempt);
      
      if (data.inProgressAttempt) {
        setAttempt(data.inProgressAttempt);
        setCurrentAnswers(data.inProgressAttempt.answers || {});
        // Calculate remaining time if time limit exists used
        // For MVP, just reusing time limit or null
      }
    } catch (err) {
      setError('Failed to load quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    setIsLoading(true); // Re-use loading state for transition
    try {
      const res = await fetch(`/api/quizzes/${id}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start quiz');
      const data = await res.json();
      setAttempt(data.attempt);
      
      if (quiz?.timeLimit) {
        setTimeLeft(quiz.timeLimit * 60);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: currentAnswers }),
      });
      if (!res.ok) throw new Error('Failed to submit quiz');
      const data = await res.json();
      setAttempt(data.attempt);
      // Show results view
    } catch (err) {
      console.error('Submit error', err);
      // handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerChange = (qId: string, val: any) => {
    setCurrentAnswers(prev => ({ ...prev, [qId]: val }));
    // Optional: Auto-save logic here
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-violet-600 animate-spin" /></div>;
  if (error || !quiz) return <div className="text-center py-20 text-red-500">{error || 'Quiz not found'}</div>;

  // View: Result
  if (attempt?.status === 'graded' || attempt?.status === 'completed') {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className={`p-6 rounded-xl text-center border ${
          attempt.score! >= quiz.passingScore 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <div className="mb-4">
            {attempt.score! >= quiz.passingScore ? (
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            ) : (
              <XCircle className="w-16 h-16 mx-auto text-red-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            {attempt.score! >= quiz.passingScore ? 'Quiz Passed!' : 'Quiz Failed'}
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            You scored <span className="font-bold">{attempt.score!.toFixed(1)}%</span>
            <span className="text-sm text-neutral-500 ml-2">(Pass: {quiz.passingScore}%)</span>
          </p>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">{attempt.feedback}</p>
          
          <div className="mt-6 flex justify-center gap-4">
             <button onClick={() => navigate('/quizzes')} className="btn-secondary">Back to Quizzes</button>
             {/* If failed, maybe link to review */}
          </div>
        </div>
      </div>
    );
  }

  // View: Landing
  if (!attempt) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 mt-10">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">{quiz.title}</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">{quiz.description}</p>
        
        <div className="flex justify-center gap-8 text-neutral-500 dark:text-neutral-400 py-4 border-y border-neutral-100 dark:border-neutral-700">
           <div className="flex flex-col items-center">
             <Clock className="w-6 h-6 mb-1 text-violet-500" />
             <span className="text-sm font-medium">{quiz.timeLimit ? `${quiz.timeLimit} mins` : 'No Limit'}</span>
           </div>
           <div className="flex flex-col items-center">
             <AlertTriangle className="w-6 h-6 mb-1 text-violet-500" />
             <span className="text-sm font-medium">{quiz.questions.length} Questions</span>
           </div>
           <div className="flex flex-col items-center">
             <CheckCircle className="w-6 h-6 mb-1 text-violet-500" />
             <span className="text-sm font-medium">Pass: {quiz.passingScore}%</span>
           </div>
        </div>

        {canAttempt ? (
          <button 
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center mx-auto"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Quiz
          </button>
        ) : (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg">
            You cannot attempt this quiz at this time (Maximum attempts reached or unavailable).
          </div>
        )}
      </div>
    );
  }

  // View: Taking
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 sticky top-4 z-10">
        <h2 className="font-semibold text-neutral-900 dark:text-white truncate max-w-xs">{quiz.title}</h2>
        {timeLeft !== null && (
          <div className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-neutral-600 dark:text-neutral-300'}`}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
              <span className="text-neutral-400 mr-2">{idx + 1}.</span>
              {q.question}
            </h3>

            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                {q.options?.map((opt, i) => (
                  <label key={i} className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${
                    currentAnswers[q.id] === opt 
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-500' 
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}>
                    <input 
                      type="radio" 
                      name={q.id} 
                      checked={currentAnswers[q.id] === opt}
                      onChange={() => handleAnswerChange(q.id, opt)}
                      className="text-violet-600 focus:ring-violet-500 mr-3"
                    />
                    <span className="text-neutral-700 dark:text-neutral-300">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'true_false' && (
              <div className="flex gap-4">
                {['true', 'false'].map((val) => (
                  <label key={val} className={`flex-1 flex items-center justify-center p-4 rounded-lg border cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${
                    currentAnswers[q.id] === val 
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-500' 
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}>
                    <input 
                      type="radio" 
                      name={q.id}
                      checked={currentAnswers[q.id] === val}
                      onChange={() => handleAnswerChange(q.id, val)}
                      className="hidden" // use custom style
                    />
                    <span className="font-medium capitalize text-neutral-700 dark:text-neutral-300">{val}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'short_answer' && (
              <input 
                value={currentAnswers[q.id] || ''}
                onChange={e => handleAnswerChange(q.id, e.target.value)}
                placeholder="Type your answer..."
                className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-violet-500 outline-none"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-6">
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-lg shadow-violet-600/20 transition-all flex items-center disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          Submit Quiz
        </button>
      </div>
    </div>
  );
}
