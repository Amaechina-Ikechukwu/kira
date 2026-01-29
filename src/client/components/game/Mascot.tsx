import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';

interface MascotProps {
  expression?: 'idle' | 'talking' | 'happy' | 'thinking' | 'excited' | 'wink';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isSpeaking?: boolean;
}

export default function Mascot({ 
  expression = 'idle', 
  className = '', 
  size = 'md',
  isSpeaking = false 
}: MascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring physics for eye movement
  const eyeX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const eyeY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  
  // Transform mouse position to eye movement (limited range)
  const leftEyeX = useTransform(eyeX, [-200, 200], [-4, 4]);
  const leftEyeY = useTransform(eyeY, [-200, 200], [-3, 3]);
  const rightEyeX = useTransform(eyeX, [-200, 200], [-4, 4]);
  const rightEyeY = useTransform(eyeY, [-200, 200], [-3, 3]);

  // Natural blinking - random intervals between 2-6 seconds
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000; // 2-6 seconds
      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150); // Blink duration
        scheduleBlink();
      }, delay);
    };

    const timer = scheduleBlink();
    return () => clearTimeout(timer);
  }, []);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64',
  };

  const eyeSizes = {
    sm: 'w-2.5 h-4',
    md: 'w-4 h-6',
    lg: 'w-5 h-8',
    xl: 'w-7 h-10',
  };

  const pupilSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
    xl: 'w-2.5 h-2.5',
  };

  // Get eye scale based on expression and blink state
  const getEyeAnimation = (isLeft: boolean) => {
    if (isBlinking) {
      return { scaleY: 0.1 };
    }
    
    if (expression === 'wink' && !isLeft) {
      return { scaleY: 0.1 };
    }
    
    if (expression === 'happy' || expression === 'excited') {
      return { scaleY: 0.6, borderRadius: '40%' };
    }
    
    if (expression === 'thinking') {
      return isLeft ? { scaleY: 0.8 } : { scaleY: 1 };
    }

    return { scaleY: 1 };
  };

  // Mouth animation for speaking
  const getMouthAnimation = () => {
    if (isSpeaking) {
      return {
        scaleY: [0.5, 1, 0.7, 1, 0.5],
        scaleX: [1, 0.9, 1, 0.95, 1],
      };
    }
    if (expression === 'happy' || expression === 'excited') {
      return { scaleY: 1 };
    }
    return { scaleY: 0 };
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${sizeClasses[size]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Soft glow behind */}
      <motion.div
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 rounded-full bg-pink-400 blur-xl"
      />

      {/* Main Body */}
      <motion.div
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.05 }}
        className="absolute inset-1 rounded-full bg-pink-500 shadow-xl cursor-pointer p-1"
      >
        {/* Face Area - dark circle inside */}
        <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
          
          {/* Subtle shine on top */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1/2 h-3 bg-white/10 rounded-full blur-sm" />
          
          {/* Eyes Container */}
          <div className="flex gap-4 items-center justify-center">
            {/* Left Eye */}
            <motion.div 
              style={{ x: leftEyeX, y: leftEyeY }}
              animate={getEyeAnimation(true)}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className={`${eyeSizes[size]} bg-white rounded-full relative shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
            >
              {/* Pupil */}
              <motion.div
                style={{ x: leftEyeX, y: leftEyeY }}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${pupilSizes[size]} bg-slate-800 rounded-full`}
              />
              {/* Eye shine */}
              <div className="absolute top-1 right-0.5 w-1 h-1 bg-white rounded-full" />
            </motion.div>
            
            {/* Right Eye */}
            <motion.div 
              style={{ x: rightEyeX, y: rightEyeY }}
              animate={getEyeAnimation(false)}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className={`${eyeSizes[size]} bg-white rounded-full relative shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
            >
              {/* Pupil */}
              <motion.div
                style={{ x: rightEyeX, y: rightEyeY }}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${pupilSizes[size]} bg-slate-800 rounded-full`}
              />
              {/* Eye shine */}
              <div className="absolute top-1 right-0.5 w-1 h-1 bg-white rounded-full" />
            </motion.div>
          </div>

          {/* Mouth */}
          <motion.div
            animate={getMouthAnimation()}
            transition={isSpeaking ? {
              duration: 0.3,
              repeat: Infinity,
              ease: "easeInOut"
            } : { duration: 0.2 }}
            className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-5 h-2.5 border-b-2 border-white rounded-b-full origin-center"
            style={{ opacity: (expression === 'happy' || expression === 'excited' || isSpeaking) ? 1 : 0 }}
          />

          {/* Cheek blush - cute! */}
          <div className="absolute bottom-[30%] left-[15%] w-3 h-2 bg-pink-400/30 rounded-full blur-[2px]" />
          <div className="absolute bottom-[30%] right-[15%] w-3 h-2 bg-pink-400/30 rounded-full blur-[2px]" />
        </div>
      </motion.div>

      {/* Speaking indicator */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0.4, 0.7, 0.4], 
              scale: [1, 1.08, 1] 
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute -inset-3 rounded-full border-2 border-pink-400"
          />
        )}
      </AnimatePresence>

      {/* Hover sparkles */}
      <AnimatePresence>
        {isHovered && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  y: [-10, -30],
                  x: (i - 1) * 20,
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 1,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
                className="absolute top-0 left-1/2 w-2 h-2 bg-pink-300 rounded-full"
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


