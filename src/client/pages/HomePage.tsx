import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Mascot from '../components/game/Mascot';

export default function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [personalityTone, setPersonalityTone] = useState('Hype Man');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const personalities = [
    { value: 'Hype Man', emoji: '🔥', desc: 'Energetic and motivating' },
    { value: 'Sarcastic Sage', emoji: '🧙‍♂️', desc: 'Witty with a twist' },
    { value: 'Wise Mentor', emoji: '📚', desc: 'Calm and insightful' },
    { value: 'Gaming Buddy', emoji: '🎮', desc: 'Fun and casual' },
  ];

  const handleStart = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/lesson/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, personalityTone }),
      });

      const data = await response.json();

      if (data.sessionId) {
        navigate(`/lesson/${data.sessionId}`);
      } else if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to start lesson. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-hero">
      {/* Subtle background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-lg w-full"
      >
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-block mb-6"
          >
            <Mascot expression="happy" size="lg" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-5xl md:text-6xl font-extrabold mb-3"
          >
            <span className="text-gradient">Kira</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-500 text-lg"
          >
            Your AI-powered learning companion
          </motion.p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="card p-8"
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Start Learning</h2>

          {/* Email Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Your Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 
                focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>

          {/* Personality Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-600 mb-3">
              Choose Your AI Guide
            </label>
            <div className="grid grid-cols-2 gap-3">
              {personalities.map((p) => (
                <motion.button
                  key={p.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPersonalityTone(p.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    personalityTone === p.value
                      ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span className="text-2xl mb-1 block">{p.emoji}</span>
                  <span className={`font-semibold text-sm ${
                    personalityTone === p.value ? 'text-blue-700' : 'text-slate-700'
                  }`}>{p.value}</span>
                  <span className="text-xs text-slate-500 block mt-0.5">{p.desc}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Start Button */}
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleStart}
            disabled={isLoading}
            className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Start Learning
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </span>
            )}
          </motion.button>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Powered by Kira AI
        </p>
      </motion.div>
    </div>
  );
}
