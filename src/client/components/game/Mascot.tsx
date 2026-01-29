import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface MascotProps {
  expression?: 'idle' | 'talking' | 'happy' | 'thinking' | 'excited';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Mascot({ expression = 'idle', className = '', size = 'md' }: MascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring physics for eye movement
  const eyeX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const eyeY = useSpring(mouseY, { stiffness: 300, damping: 30 });
  
  // Transform mouse position to eye movement (limited range)
  const leftEyeX = useTransform(eyeX, [-100, 100], [-3, 3]);
  const leftEyeY = useTransform(eyeY, [-100, 100], [-2, 2]);
  const rightEyeX = useTransform(eyeX, [-100, 100], [-3, 3]);
  const rightEyeY = useTransform(eyeY, [-100, 100], [-2, 2]);

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
  };

  const eyeSizes = {
    sm: 'w-2.5 h-4',
    md: 'w-4 h-6',
    lg: 'w-6 h-9',
  };

  const getExpressionStyle = () => {
    switch (expression) {
      case 'happy':
        return { scaleY: 0.6, borderRadius: '50%' };
      case 'excited':
        return { scale: 1.1 };
      case 'thinking':
        return { x: 2 };
      default:
        return {};
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${sizeClasses[size]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer Glow Ring */}
      <motion.div
        animate={{
          scale: isHovered ? [1, 1.2, 1.1] : [1, 1.05, 1],
          opacity: isHovered ? [0.6, 0.9, 0.7] : [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: isHovered ? 0.5 : 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/30 to-cyan-400/30 blur-xl"
      />

      {/* Secondary glow */}
      <motion.div
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-1 rounded-full bg-gradient-conic from-blue-500/20 via-transparent to-cyan-500/20"
      />

      {/* Main Body - Floating Orb */}
      <motion.div
        animate={{
          y: isHovered ? [0, -15, 0] : [0, -8, 0],
          rotate: isHovered ? [0, 3, -3, 0] : 0,
        }}
        transition={{
          duration: isHovered ? 0.8 : 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.05 }}
        className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 shadow-xl shadow-blue-500/25 p-[3px] cursor-pointer"
      >
        {/* Face/Screen Area */}
        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
          
          {/* Animated background pattern */}
          <motion.div
            animate={{ opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white_1px,transparent_1px)] bg-[length:8px_8px]"
          />
            
          {/* Eyes Container */}
          <div className="flex gap-4 items-center justify-center relative z-10">
            {/* Left Eye */}
            <motion.div 
              style={{ x: leftEyeX, y: leftEyeY }}
              animate={
                expression === 'talking' 
                  ? { scaleY: [1, 0.3, 1] } 
                  : expression === 'happy'
                  ? { scaleY: 0.5, borderRadius: '40%' }
                  : getExpressionStyle()
              }
              transition={{ 
                duration: 0.15, 
                repeat: expression === 'talking' ? Infinity : 0, 
                repeatDelay: 0.2 
              }}
              className={`${eyeSizes[size]} bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)] relative`}
            >
              {/* Pupil */}
              <motion.div
                style={{ x: leftEyeX, y: leftEyeY }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-800 rounded-full"
              />
            </motion.div>
            
            {/* Right Eye */}
            <motion.div 
              style={{ x: rightEyeX, y: rightEyeY }}
              animate={
                expression === 'talking' 
                  ? { scaleY: [1, 0.3, 1] } 
                  : expression === 'happy'
                  ? { scaleY: 0.5, borderRadius: '40%' }
                  : getExpressionStyle()
              }
              transition={{ 
                duration: 0.15, 
                repeat: expression === 'talking' ? Infinity : 0, 
                repeatDelay: 0.2 
              }}
              className={`${eyeSizes[size]} bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)] relative`}
            >
              {/* Pupil */}
              <motion.div
                style={{ x: rightEyeX, y: rightEyeY }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-800 rounded-full"
              />
            </motion.div>
          </div>

          {/* Mouth (for happy/talking) */}
          {(expression === 'happy' || expression === 'excited') && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-[25%] left-1/2 -translate-x-1/2 w-6 h-3 border-b-2 border-white rounded-b-full"
            />
          )}

          {/* Reflection/Shine */}
          <motion.div 
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-3 right-4 w-3 h-3 bg-white/30 rounded-full blur-[2px]" 
          />
        </div>
      </motion.div>

      {/* Hover particles */}
      {isHovered && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: 0,
                y: 0,
              }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
                x: Math.cos(i * 60 * Math.PI / 180) * 50,
                y: Math.sin(i * 60 * Math.PI / 180) * 50,
              }}
              transition={{ 
                duration: 1,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
              className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-400 rounded-full"
            />
          ))}
        </>
      )}
    </div>
  );
}
