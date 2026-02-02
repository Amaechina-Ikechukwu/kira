import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import Mascot from './Mascot';

interface ExplainerCardProps {
  title: string;
  content: string;
  encouragement?: string;
  onProgress: (result?: { correct?: boolean; xp?: number }) => void;
  isLoading: boolean;
}

export default function ExplainerCard({
  title,
  content,
  encouragement,
  onProgress,
  isLoading,
}: ExplainerCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
      
      {/* Mascot - Interactive */}
      <motion.div 
        className="mb-4 z-10"
        animate={{ y: isHovered ? -5 : 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Mascot expression="talking" size="lg" />
      </motion.div>

      {/* Speech Bubble */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-full"
      >
        {/* Speech bubble pointer */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 
          border-l-[16px] border-l-transparent 
          border-r-[16px] border-r-transparent 
          border-b-[16px] border-b-white
          drop-shadow-sm z-10" 
        />

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 bg-slate-50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500 flex items-center justify-center text-white text-xl shadow-sm">
                📖
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800 leading-tight">{title}</h2>
                <p className="text-sm text-slate-400 mt-1">Let me explain this concept</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6">
            <div className="prose prose-lg prose-slate max-w-none
              prose-headings:font-bold prose-headings:text-slate-800
              prose-p:text-slate-600 prose-p:leading-relaxed
              prose-p:text-slate-600 prose-p:leading-relaxed
              prose-strong:text-pink-600 prose-strong:font-semibold
              prose-code:bg-slate-100 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:text-orange-600 prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            ">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>

          {/* Encouragement */}
          {encouragement && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mx-8 mb-6 p-4 bg-pink-50 rounded-2xl border border-pink-100"
            >
              <p className="text-pink-700 font-medium text-center flex items-center justify-center gap-2">
                <span className="text-xl">💡</span>
                {encouragement}
              </p>
            </motion.div>
          )}

          {/* Action Button */}
          <div className="px-8 pb-8">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onProgress()}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 
                text-white font-semibold text-lg rounded-2xl
                shadow-lg hover:shadow-xl
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Got it! Continue
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
