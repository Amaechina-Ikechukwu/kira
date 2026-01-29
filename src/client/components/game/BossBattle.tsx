import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BossBattleProps {
  bossName: string;
  bossHealth: number;
  question: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
  xpReward: number;
  onProgress: () => void;
  isLoading: boolean;
}

export default function BossBattle({
  bossName,
  bossHealth: initialHealth,
  question,
  options,
  correctAnswer,
  hint,
  xpReward,
  onProgress,
  isLoading,
}: BossBattleProps) {
  const [bossHealth, setBossHealth] = useState(initialHealth);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [attackAnimation, setAttackAnimation] = useState(false);
  const [defeated, setDefeated] = useState(false);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;

    setSelectedAnswer(answer);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setAttackAnimation(true);
      setTimeout(() => {
        setBossHealth(0);
        setDefeated(true);
        setAttackAnimation(false);
      }, 800);
    }
  };

  const healthPercentage = (bossHealth / initialHealth) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
    >
      {/* Quiz Header */}
      <div className="relative bg-gradient-to-r from-indigo-500 to-purple-500 p-6 border-b border-slate-200">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center">
          <motion.div
            animate={attackAnimation ? { x: [0, -20, 20, -10, 10, 0], opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 0.5 }}
            className={`text-6xl mb-3 inline-block ${defeated ? 'grayscale opacity-50' : ''}`}
          >
            🧠
          </motion.div>
          <h3 className="text-xl font-bold text-white">{bossName || 'Quiz Challenge'}</h3>

          {/* Progress Bar */}
          <div className="mt-4 max-w-xs mx-auto">
            <div className="flex justify-between text-sm text-white/80 mb-1">
              <span>Progress</span>
              <span>{Math.round(100 - healthPercentage)}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${healthPercentage}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full rounded-full ${
                  healthPercentage > 50
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-300'
                    : healthPercentage > 25
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'bg-gradient-to-r from-red-400 to-red-300'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        <AnimatePresence mode="wait">
          {!defeated ? (
            <motion.div
              key="battle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Question */}
              <div className="text-center mb-6">
                <span className="text-sm text-blue-600 font-medium uppercase tracking-wider">
                  📝 Question
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-2">{question}</h2>
              </div>

              {/* Options */}
              <div className="grid gap-3">
                {options.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrectAnswer = option === correctAnswer;
                  const showResult = selectedAnswer !== null;

                  let buttonClass = 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-blue-50';

                  if (showResult) {
                    if (isCorrectAnswer) {
                      buttonClass = 'bg-emerald-50 border-emerald-500 text-emerald-700';
                    } else if (isSelected && !isCorrect) {
                      buttonClass = 'bg-red-50 border-red-500 text-red-700';
                    } else {
                      buttonClass = 'bg-slate-50 border-slate-200 opacity-50';
                    }
                  }

                  return (
                    <motion.button
                      key={option}
                      whileHover={!selectedAnswer ? { scale: 1.01 } : {}}
                      whileTap={!selectedAnswer ? { scale: 0.99 } : {}}
                      onClick={() => handleAnswer(option)}
                      disabled={selectedAnswer !== null}
                      className={`p-4 rounded-xl border-2 text-left font-medium transition-all ${buttonClass}`}
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-white rounded-lg mr-3 text-sm border border-slate-200">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-slate-700">{option}</span>
                      {showResult && isCorrectAnswer && (
                        <span className="ml-2 text-emerald-500">✓</span>
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <span className="ml-2 text-red-500">✗</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Hint */}
              {hint && !selectedAnswer && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {showHint ? 'Hide hint' : '💡 Need a hint?'}
                  </button>
                  <AnimatePresence>
                    {showHint && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 text-sm text-blue-600 italic"
                      >
                        {hint}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Wrong answer feedback */}
              {isCorrect === false && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center"
                >
                  <p className="text-red-600 font-medium">Not quite! The correct answer was highlighted above.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onProgress}
                    className="mt-4 px-6 py-2 btn-secondary"
                  >
                    Continue →
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="text-6xl block mb-4"
              >
                🎉
              </motion.span>
              <h2 className="text-2xl font-bold text-emerald-600 mb-2">Correct!</h2>
              <p className="text-slate-500 mb-2">You earned</p>
              <p className="text-3xl font-bold text-blue-600">+{xpReward} XP</p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onProgress}
                disabled={isLoading}
                className="mt-8 btn-primary px-8 py-4 text-lg"
              >
                {isLoading ? 'Loading...' : 'Continue 🚀'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
