import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  questionsAnswered: number;
  accuracy: number;
  xpEarned: number;
  timeSpent: string;
}

interface VictoryScreenProps {
  title: string;
  encouragement: string;
  stats: Stats;
  onComplete: () => void;
}

// Confetti particle component with light theme colors
function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);

  useEffect(() => {
    const colors = ['#ec4899', '#db2777', '#10b981', '#facc15', '#fde047', '#be185d'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', rotate: 720, opacity: 0 }}
          transition={{ duration: 3 + Math.random() * 2, delay: p.delay, ease: 'linear' }}
          style={{ backgroundColor: p.color }}
          className="absolute w-3 h-3 rounded-sm"
        />
      ))}
    </div>
  );
}

export default function VictoryScreen({
  title,
  encouragement,
  stats,
  onComplete,
}: VictoryScreenProps) {
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowStats(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Confetti />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Trophy Header */}
        <div className="relative bg-pink-600 p-8 text-center">
          {/* Removed shiny effects */}

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2, damping: 10 }}
            className="relative z-10"
          >
            <span className="text-8xl block mb-4">🏆</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl md:text-4xl font-display font-extrabold text-white relative z-10"
          >
            {title}
          </motion.h1>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Encouragement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center mb-8"
          >
            <p className="text-lg md:text-xl text-slate-600">{encouragement}</p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showStats ? 1 : 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <StatCard
              icon="📝"
              label="Questions"
              value={stats.questionsAnswered.toString()}
              delay={0.8}
            />
            <StatCard
              icon="🎯"
              label="Accuracy"
              value={`${stats.accuracy}%`}
              delay={0.9}
            />
            <StatCard
              icon="⭐"
              label="XP Earned"
              value={`+${stats.xpEarned}`}
              highlight
              delay={1}
            />
            <StatCard
              icon="⏱️"
              label="Time"
              value={stats.timeSpent}
              delay={1.1}
            />
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onComplete}
              className="w-full btn-primary py-4 rounded-xl font-bold text-lg"
            >
              Continue 🎉
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`p-4 rounded-xl text-center ${
        highlight
          ? 'bg-pink-50 border border-pink-200'
          : 'bg-slate-50 border border-slate-200'
      }`}
    >
      <span className="text-2xl block mb-1">{icon}</span>
      <p className={`text-xl font-bold ${highlight ? 'text-pink-600' : 'text-slate-800'}`}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </motion.div>
  );
}
