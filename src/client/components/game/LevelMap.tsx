import { motion } from 'framer-motion';

interface Level {
  id: number;
  name: string;
  status: 'completed' | 'current' | 'locked';
}

interface LevelMapProps {
  levels?: Level[];
}

export default function LevelMap({ levels = [] }: LevelMapProps) {
  if (!levels || levels.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6"
    >
      <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto">
        {levels.map((level, index) => (
          <div key={level.id} className="flex items-center">
            {/* Level Node */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div
                className={`relative w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                  level.status === 'completed'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-500'
                    : level.status === 'current'
                    ? 'bg-blue-50 border-blue-500 text-blue-500 animate-pulse-soft'
                    : 'bg-slate-50 border-slate-300 text-slate-400'
                }`}
              >
                {level.status === 'completed' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : level.status === 'current' ? (
                  <span className="text-xl md:text-2xl">📚</span>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}

                {/* Glow effect for current */}
                {level.status === 'current' && (
                  <div className="absolute inset-0 rounded-full bg-blue-200/50 animate-ping" />
                )}
              </div>

              {/* Level Name */}
              <span
                className={`mt-2 text-xs md:text-sm font-medium ${
                  level.status === 'completed'
                    ? 'text-emerald-600'
                    : level.status === 'current'
                    ? 'text-blue-600'
                    : 'text-slate-400'
                }`}
              >
                {level.name}
              </span>
            </motion.div>

            {/* Connector Line */}
            {index < levels.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.1 }}
                className={`w-8 md:w-16 h-1 mx-2 rounded-full origin-left ${
                  levels[index + 1].status !== 'locked'
                    ? 'bg-gradient-to-r from-emerald-400 to-blue-400'
                    : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
