import { useState } from 'react';
import { motion } from 'framer-motion';
import Mascot from '../components/game/Mascot';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSent(true);
      } else {
        setError(data.error || 'Failed to send magic link');
      }
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-hero">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <Mascot expression="happy" size="lg" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-8 bg-white rounded-2xl shadow-lg border border-stone-100"
          >
            <h1 className="text-2xl font-bold text-stone-800 mb-2">Check your email</h1>
            <p className="text-stone-600 mb-4">
              We sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-stone-400">
              Click the link in your email to sign in. It expires in 15 minutes.
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <Mascot expression="happy" size="lg" />
          
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-3xl font-bold text-stone-800"
          >
            Welcome to <span className="text-gradient">Kira</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-stone-500"
          >
            Sign in to upload documents and track your learning
          </motion.p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-2xl shadow-lg border border-stone-100"
        >
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Email address
          </label>
          
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 
              placeholder:text-stone-400 focus:outline-none focus:border-violet-500 
              focus:ring-4 focus:ring-violet-500/10 transition-all"
            required
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-red-500"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 btn-primary py-3 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send magic link'}
          </button>

          <p className="mt-4 text-center text-sm text-stone-400">
            No password needed. We'll email you a sign-in link.
          </p>
        </motion.form>

        <p className="mt-6 text-center text-sm text-stone-400">
          Just want to explore?{' '}
          <a href="/" className="text-violet-600 hover:underline">
            Try without signing in
          </a>
        </p>
      </motion.div>
    </div>
  );
}
