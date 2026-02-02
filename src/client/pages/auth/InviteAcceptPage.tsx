import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, ArrowRight, School, User, Lock, BookOpen } from 'lucide-react';
import Mascot from '../../components/game/Mascot';

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  
  // Invite Data
  const [inviteData, setInviteData] = useState<any>(null);

  // Form Data
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState(''); // Only for teachers
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await fetch(`/api/schools/invite/verify/${token}`);
      const data = await res.json();
      
      if (res.ok && data.valid) {
        setIsValid(true);
        setInviteData(data);
      } else {
        setIsValid(false);
        setError(data.error || 'Invalid invitation link');
      }
    } catch (err) {
      setIsValid(false);
      setError('Failed to verify invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/schools/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name,
          password,
          subject: inviteData?.role === 'teacher' ? subject : undefined
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to login or dashboard
        // For now, let's redirect to login with a success param
        navigate('/login?joined=true');
      } else {
        setError(data.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl">
          <Mascot expression="thinking" size="md" className="mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Oops!</h2>
          <p className="text-red-500 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="btn-primary w-full"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-game p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50"
      >
        <div className="text-center mb-8">
          <Mascot expression="happy" size="md" className="mx-auto mb-6" />
          <h1 className="text-3xl font-display font-bold text-stone-800">
            Welcome to Kira!
          </h1>
          <p className="text-stone-500 mt-2">
            You've been invited to join <span className="font-bold text-pink-600">{inviteData.schoolName}</span> as a <span className="font-bold uppercase text-xs bg-stone-100 px-2 py-0.5 rounded-full tracking-wider">{inviteData.role}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe" // Placeholder logic?
                className="w-full pl-12 pr-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 focus:border-pink-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1 ml-1">Create Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 focus:border-pink-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Teacher Onboarding - Subject Selection */}
          {inviteData.role === 'teacher' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2 border-t border-stone-100"
            >
              <div className="bg-pink-50 rounded-xl p-4 mb-4">
                 <p className="text-sm text-pink-800 font-medium flex items-center gap-2">
                    <School className="w-4 h-4" />
                    Let's set up your first class!
                 </p>
              </div>
              
              <label className="block text-sm font-bold text-stone-700 mb-1 ml-1">What do you teach?</label>
              <div className="relative">
                 <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                 <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Algebra I, Grade 5 Science"
                    className="w-full pl-12 pr-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 focus:border-pink-500 focus:outline-none transition-colors"
                 />
              </div>
              <p className="text-xs text-stone-400 mt-1 ml-1">We'll automatically create this course for you.</p>
            </motion.div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-6"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            {inviteData.role === 'teacher' ? 'Create Account & Class' : 'Join School'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
