import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from '../components/game/Mascot';

// Kira's introduction dialogue
const INTRO_DIALOGUE = [
  { text: "Hey there! I'm Kira!", expression: 'excited' as const },
  { text: "I'm your personal AI learning companion.", expression: 'happy' as const },
  { text: "Pick any topic you're curious about...", expression: 'thinking' as const },
  { text: "And I'll teach it to you in a fun, interactive way!", expression: 'excited' as const },
  { text: "Ready to explore something new?", expression: 'wink' as const },
];

// Topic suggestions
const TOPIC_CATEGORIES = [
  { 
    icon: 'code', 
    title: 'Programming', 
    topics: ['JavaScript Basics', 'Python Fundamentals', 'HTML & CSS', 'React Concepts']
  },
  { 
    icon: 'flask', 
    title: 'Science', 
    topics: ['How Electricity Works', 'The Solar System', 'DNA & Genetics', 'Climate Change']
  },
  { 
    icon: 'calculator', 
    title: 'Math', 
    topics: ['Algebra Basics', 'Fractions & Decimals', 'Geometry 101', 'Statistics Intro']
  },
  { 
    icon: 'book', 
    title: 'History', 
    topics: ['World War II', 'Ancient Egypt', 'The Renaissance', 'Industrial Revolution']
  },
  { 
    icon: 'globe', 
    title: 'Languages', 
    topics: ['Spanish Basics', 'French Essentials', 'Japanese Hiragana', 'Common Phrases']
  },
  { 
    icon: 'lightbulb', 
    title: 'Life Skills', 
    topics: ['Personal Finance', 'Time Management', 'Public Speaking', 'Critical Thinking']
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [personalityTone, setPersonalityTone] = useState('Hype Man');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Storytelling state
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showTopics, setShowTopics] = useState(false);

  const currentDialogue = INTRO_DIALOGUE[dialogueIndex];

  // Typewriter effect
  useEffect(() => {
    if (!currentDialogue) return;
    
    setDisplayedText('');
    setIsTyping(true);
    
    const text = currentDialogue.text;
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setDisplayedText(text.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
      }
    }, 35);

    return () => clearInterval(typeInterval);
  }, [dialogueIndex, currentDialogue]);

  const advanceDialogue = useCallback(() => {
    if (isTyping) {
      setDisplayedText(currentDialogue.text);
      setIsTyping(false);
    } else if (dialogueIndex < INTRO_DIALOGUE.length - 1) {
      setDialogueIndex(prev => prev + 1);
    } else {
      setShowTopics(true);
    }
  }, [isTyping, dialogueIndex, currentDialogue]);

  const skipIntro = () => setShowTopics(true);

  const handleStart = async () => {
    const topic = selectedTopic || customTopic.trim();
    
    if (!topic) {
      setError('Please select or enter a topic');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/lesson/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, personalityTone }),
      });

      const data = await response.json();

      if (data.sessionId) {
        navigate(`/lesson/${data.sessionId}`);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to generate lesson. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setCustomTopic('');
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
    } catch (err) {
      console.error('Failed to check auth', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-hero overflow-hidden relative">
      {/* Login/Dashboard link - top right */}
      {isAuthenticated ? (
        <a 
          href="/dashboard" 
          className="absolute top-6 right-6 z-50 px-4 py-2 bg-white/80 backdrop-blur-md border border-white/50 rounded-full text-violet-600 font-medium text-sm hover:bg-white hover:shadow-lg hover:shadow-violet-500/10 transition-all flex items-center gap-2"
        >
          <span>Dashboard</span>
          <span className="text-lg">→</span>
        </a>
      ) : (
        <a 
          href="/login" 
          className="absolute top-6 right-6 z-50 text-stone-500 hover:text-violet-600 text-sm font-medium transition-colors"
        >
          Sign in
        </a>
      )}

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.04) 0%, transparent 70%)',
          }}
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.03) 0%, transparent 70%)',
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!showTopics ? (
          /* Storytelling Mode */
          <motion.div
            key="storytelling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            className="relative z-10 flex flex-col items-center max-w-2xl w-full"
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={skipIntro}
              className="absolute top-0 right-0 text-stone-400 hover:text-stone-600 text-sm transition-colors"
            >
              Skip intro →
            </motion.button>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="mb-8"
            >
              <Mascot 
                expression={currentDialogue?.expression || 'idle'} 
                size="xl" 
                isSpeaking={isTyping}
              />
            </motion.div>

            <motion.div
              key={dialogueIndex}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={advanceDialogue}
              className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg cursor-pointer max-w-md w-full border border-stone-100"
              style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white/95 rotate-45 border-l border-t border-stone-100" />
              
              <p className="text-xl text-stone-800 font-medium text-center relative z-10 min-h-[3rem]">
                {displayedText}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block ml-1 text-violet-500"
                  >
                    |
                  </motion.span>
                )}
              </p>

              {!isTyping && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-sm text-stone-400 mt-3"
                >
                  {dialogueIndex < INTRO_DIALOGUE.length - 1 ? 'Click to continue...' : 'Click to explore!'}
                </motion.p>
              )}
            </motion.div>

            <div className="flex gap-2 mt-6">
              {INTRO_DIALOGUE.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i === dialogueIndex ? 1.3 : 1,
                    backgroundColor: i <= dialogueIndex ? '#7c3aed' : '#e7e5e4',
                  }}
                  className="w-2 h-2 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        ) : (
          /* Topic Selection Mode */
          <motion.div
            key="topics"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 max-w-3xl w-full"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-block mb-4"
              >
                <Mascot expression="happy" size="md" />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-4xl md:text-5xl font-extrabold mb-2"
              >
                What do you want to <span className="text-gradient">learn</span>?
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-stone-500"
              >
                Pick a topic below or type your own
              </motion.p>
            </div>

            {/* Custom topic input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <div className="relative">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value);
                    setSelectedTopic(null);
                  }}
                  placeholder="I want to learn about..."
                  className="w-full px-5 py-4 bg-white border-2 border-stone-200 rounded-2xl text-stone-800 placeholder:text-stone-400 
                    focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all text-lg"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-400" />
              </div>
            </motion.div>

            {/* Topic categories - scrollable on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
            >
              {TOPIC_CATEGORIES.map((category, catIndex) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + catIndex * 0.05 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-stone-600 font-medium text-sm px-1">
                    <span className="w-4 h-4 rounded bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-bold">
                      {category.title.charAt(0)}
                    </span>
                    <span>{category.title}</span>
                  </div>
                  <div className="space-y-2">
                    {category.topics.slice(0, 2).map((topic) => (
                      <button
                        key={topic}
                        onClick={() => selectTopic(topic)}
                        className={`topic-card w-full text-left text-sm ${
                          selectedTopic === topic ? 'selected' : ''
                        }`}
                      >
                        <span className="relative z-10 text-stone-700">{topic}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Error */}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              disabled={isLoading || (!selectedTopic && !customTopic.trim())}
              className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Generating your lesson...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Start Learning
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="inline-block"
                  >
                    →
                  </motion.span>
                </span>
              )}
            </motion.button>

            {/* Upload Document CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-6 p-5 bg-gradient-to-r from-violet-50 to-amber-50 rounded-2xl border border-violet-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-violet-600 font-bold text-lg">PDF</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800">Have a document to study?</p>
                  <p className="text-sm text-stone-500">Upload a PDF and I'll create a lesson from it</p>
                </div>
                <a
                  href="/learnground"
                  className="shrink-0 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
                >
                  Upload PDF
                </a>
              </div>
            </motion.div>

            {/* Footer */}
            <p className="text-center text-stone-400 text-sm mt-6">
              Powered by <span className="text-gradient font-medium">Kira AI</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
