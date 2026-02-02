import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Mascot from '../components/game/Mascot';

// Google icon SVG component
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  // Check if Google OAuth is enabled
  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        setGoogleOAuthEnabled(data.googleOAuthEnabled || false);
      })
      .catch(() => {
        setGoogleOAuthEnabled(false);
      });
  }, []);

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

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
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
            Welcome to <span className="text-pink-600">Kira</span>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-8 rounded-2xl shadow-lg border border-stone-100"
        >
          {/* Google Sign In Button */}
          {googleOAuthEnabled && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-stone-200 
                  rounded-xl text-stone-700 font-medium hover:bg-stone-50 hover:border-stone-300 
                  transition-all duration-200 shadow-sm hover:shadow"
              >
                <GoogleIcon />
                Sign in with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-stone-400">or continue with email</span>
                </div>
              </div>
            </>
          )}

          {/* Email Magic Link Form */}
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Email address
            </label>
            
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 
                placeholder:text-stone-400 focus:outline-none focus:border-pink-500 
                focus:ring-4 focus:ring-pink-500/10 transition-all"
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
          </form>
        </motion.div>

        <p className="mt-6 text-center text-sm text-stone-400">
          Just want to explore?{' '}
          <a href="/" className="text-pink-600 hover:underline">
            Try without signing in
          </a>
        </p>
      </motion.div>
    </div>
  );
}
