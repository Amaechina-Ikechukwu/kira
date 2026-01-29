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
        navigate('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData);

      // Fetch documents
      const docsRes = await fetch('/api/documents');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }
    } catch (err) {
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    navigate('/login');
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
      alert('Failed to generate lesson. Please try again.');
    } finally {
      setGeneratingLessonId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10">
              <Mascot expression="happy" size="sm" />
            </div>
            <span className="text-xl font-bold text-stone-800">Kira</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-800">Your Documents</h1>
            <p className="text-stone-500">Upload PDFs and let Kira teach you</p>
          </div>
          
          <Link
            to="/upload"
            className="btn-primary flex items-center gap-2"
          >
            <span>+</span>
            Upload PDF
          </Link>
        </div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Mascot expression="thinking" size="lg" />
            <h2 className="mt-6 text-xl font-semibold text-stone-700">No documents yet</h2>
            <p className="text-stone-500 mb-6">Upload a PDF to get started</p>
            <Link to="/upload" className="btn-primary">
              Upload your first PDF
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-violet-300 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 font-bold">
                    PDF
                  </div>
                </div>
                
                <h3 className="font-semibold text-stone-800 mb-1 truncate">{doc.title}</h3>
                <p className="text-sm text-stone-400 mb-4">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
                
                <button
                  onClick={() => handleGenerateLesson(doc.id)}
                  disabled={generatingLessonId === doc.id}
                  className="w-full py-2 px-4 bg-violet-50 text-violet-700 rounded-xl text-sm font-medium 
                    hover:bg-violet-100 transition-colors disabled:opacity-50"
                >
                  {generatingLessonId === doc.id ? 'Generating...' : 'Learn from this'}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
