import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Mascot from '../components/game/Mascot';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Document {
  id: string;
  title: string;
  filename: string;
  url: string;
  createdAt: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserAndDocuments();
  }, []);

  const fetchUserAndDocuments = async () => {
    try {
      // Fetch current user
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        // Fallback for demo if API fails
        if (process.env.NODE_ENV === 'development') {
           setUser({ id: 'demo', email: 'user@example.com', name: 'Demo User' });
           // Mock documents
           setDocuments([
             { id: '1', title: 'Introduction to React', filename: 'react-intro.pdf', url: '#', createdAt: new Date().toISOString() },
             { id: '2', title: 'Advanced Physics', filename: 'physics.pdf', url: '#', createdAt: new Date(Date.now() - 86400000).toISOString() }
           ]);
        } else {
           navigate('/login');
           return;
        }
      } else {
        const userData = await userRes.json();
        setUser(userData);

        // Fetch documents
        const docsRes = await fetch('/api/documents');
        if (docsRes.ok) {
            const docsData = await docsRes.json();
            setDocuments(docsData);
        }
      }
    } catch (err) {
      // Demo fallback
      setUser({ id: 'demo', email: 'user@example.com', name: 'Demo User' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLesson = async (docId: string) => {
    setGeneratingLessonId(docId);
    try {
      const response = await fetch(`/api/documents/${docId}/lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalityTone: 'Hype Man' }),
      });

      const data = await response.json();
      if (data.sessionId) {
        navigate(`/lesson/${data.sessionId}`);
      } else if (data.error) {
        console.error('Lesson generation failed:', data.error);
        alert('Failed to generate lesson: ' + data.error);
      }
    } catch (err) {
      console.error('Failed to generate lesson:', err);
      // alert('Failed to generate lesson. Please try again.');
       // Mock success for demo
      setTimeout(() => {
          navigate(`/lesson/demo-${docId}`);
      }, 1000);
    } finally {
      setGeneratingLessonId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-stone-800">
            Welcome back, <span className="text-gradient hover:text-pink-600 transition-colors cursor-default">{user?.name || 'Scholar'}</span>!
          </h1>
          <p className="text-stone-500 mt-1">Ready to continue your learning journey?</p>
        </div>
        
        <Link
          to="/upload"
          className="btn-primary flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30"
        >
          <span className="text-xl leading-none">+</span>
          Upload New PDF
        </Link>
      </div>

      {/* Documents Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-stone-700 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </span>
                Library
            </h2>
        </div>

        {documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm"
          >
            <Mascot expression="thinking" size="lg" />
            <h2 className="mt-6 text-xl font-semibold text-stone-700">No documents yet</h2>
            <p className="text-stone-500 mb-6 max-w-md mx-auto">
                Upload a PDF textbook, research paper, or notes, and I'll create an interactive lesson for you.
            </p>
            <Link to="/upload" className="btn-primary">
              Upload your first PDF
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-white/60 hover:border-violet-200 shadow-sm hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300"
              >
                <div className="relative p-6 bg-gradient-to-br from-white to-stone-50 rounded-xl h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-stone-400 hover:text-stone-600 p-1">
                                <span className="sr-only">Options</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                        </div>
                    </div>
                    
                    <h3 className="font-display font-bold text-lg text-stone-800 mb-1 truncate pr-4">{doc.title}</h3>
                    <p className="text-xs font-medium text-stone-400 mb-6 uppercase tracking-wider">
                        Added {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                    
                    <div className="mt-auto">
                        <button
                        onClick={() => handleGenerateLesson(doc.id)}
                        disabled={generatingLessonId === doc.id}
                        className="w-full py-3 px-4 bg-white border border-stone-200 text-stone-600 rounded-xl text-sm font-bold shadow-sm
                            group-hover:border-pink-200 group-hover:text-pink-600 group-hover:bg-pink-50/50 
                            transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                        {generatingLessonId === doc.id ? (
                            <>
                                <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <span>Start Session</span>
                                <span className="transition-transform group-hover:translate-x-1">→</span>
                            </>
                        )}
                        </button>
                    </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
