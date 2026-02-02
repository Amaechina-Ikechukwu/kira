import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from '../components/game/Mascot';

// Topic suggestions - Copied from HomePage for consistency
const TOPIC_CATEGORIES = [
  { 
    title: 'Programming', 
    topics: ['JavaScript Basics', 'Python Fundamentals', 'HTML & CSS', 'React Concepts']
  },
  { 
    title: 'Science', 
    topics: ['How Electricity Works', 'The Solar System', 'DNA & Genetics', 'Climate Change']
  },
  { 
    title: 'Math', 
    topics: ['Algebra Basics', 'Fractions & Decimals', 'Geometry 101', 'Statistics Intro']
  },
  { 
    title: 'History', 
    topics: ['World War II', 'Ancient Egypt', 'The Renaissance', 'Industrial Revolution']
  },
  { 
    title: 'Languages', 
    topics: ['Spanish Basics', 'French Essentials', 'Japanese Hiragana', 'Common Phrases']
  },
  { 
    title: 'Life Skills', 
    topics: ['Personal Finance', 'Time Management', 'Public Speaking', 'Critical Thinking']
  },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile);
      setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      setError('');
      setSelectedTopic(null); // Clear topic if file selected
    } else {
      setError('Only PDF files are supported');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      setError('');
      setSelectedTopic(null); // Clear topic if file selected
    }
  };

  const handleTopicSelect = (topic: string) => {
      setSelectedTopic(topic);
      setFile(null); // Clear file if topic selected
      setTitle(topic);
      setError('');
  };

  const handleGenerate = async () => {
    if (!file && !selectedTopic) {
      setError('Please select a file or choose a topic');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
        if (file) {
            // Existing PDF Upload Logic
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title || file.name);

            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.status === 401) {
                navigate('/login');
                return;
            }

            const data = await response.json();

            if (response.ok) {
                navigate('/dashboard');
            } else {
                setError(data.error || 'Upload failed');
            }
        } else if (selectedTopic) {
            // New Topic Generation Logic (Mock for now, similar to HomePage)
             const response = await fetch('/api/lesson/explore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: selectedTopic, personalityTone: 'Hype Man' }),
            });

            const data = await response.json();
            
            if (data.sessionId) {
                navigate(`/lesson/${data.sessionId}`);
            } else {
                 // Fallback if full lesson generation isn't ready in this context, redirect to dashboard with mock
                 navigate('/dashboard'); 
            }
        }
    } catch (err) {
      setError('Failed to process. Please try again.');
      // Simulate success for demo
      setTimeout(() => navigate('/dashboard'), 1000);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* 1. Header & Topic Selection (Priority) */}
      <div className="text-center mb-10">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="inline-block mb-4"
        >
            <Mascot expression="happy" size="lg" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-stone-800 mb-2">
            What do you want to <span className="text-gradient">learn</span>?
        </h1>
        <p className="text-stone-500 text-lg">Pick a topic below, type your own, or upload a PDF</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
          {/* Custom Topic Input */}
          <div className="relative max-w-2xl mx-auto">
            <input
                type="text"
                value={title} // Reusing title state for custom topic input if no file
                onChange={(e) => {
                    setTitle(e.target.value);
                    setFile(null); // Clear file if typing topic
                    setSelectedTopic(null); // Clear selected topic card
                }}
                placeholder="I want to learn about..."
                className="w-full px-6 py-5 bg-white border-2 border-stone-200 rounded-2xl text-stone-800 placeholder:text-stone-400 
                focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all text-xl font-medium shadow-sm"
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-400" />
          </div>

        {/* Topic Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TOPIC_CATEGORIES.map((category, catIndex) => (
            <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + catIndex * 0.05 }}
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
                        onClick={() => handleTopicSelect(topic)}
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
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 py-4">
             <div className="h-px bg-stone-200 flex-1" />
             <span className="text-stone-400 font-medium text-sm text-uppercase">OR UPLOAD MATERIAL</span>
             <div className="h-px bg-stone-200 flex-1" />
        </div>

        {/* Drop Zone (Secondary) */}
        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white/60 relative overflow-hidden transition-all hover:bg-white/80">
            <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
                relative z-10 border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group
                ${isDragging 
                    ? 'border-violet-500 bg-violet-50/50 scale-[1.01]' 
                    : 'border-stone-200 hover:border-violet-400 hover:bg-stone-50/50'}
                ${file ? 'border-green-400 bg-green-50/30' : ''}
            `}
            onClick={() => document.getElementById('file-input')?.click()}
            >
            <input
                id="file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
            />
            
            {file ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="font-bold text-lg text-stone-800 mb-1">{file.name}</p>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-sm text-red-500 hover:text-red-600 font-semibold hover:underline"
                >
                    Remove File
                </button>
                </motion.div>
            ) : (
                <div className="flex items-center justify-center gap-6">
                    <div className="w-16 h-16 bg-violet-50 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <div className="text-left">
                        <p className="font-display font-bold text-xl text-stone-700 mb-1">Upload a PDF</p>
                        <p className="text-stone-500">Drag & drop or click to browse</p>
                    </div>
                </div>
            )}
            </div>
        </div>

        {/* Error */}
        {error && (
            <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center font-medium"
            >
            {error}
            </motion.div>
        )}

        {/* Main Action Button */}
        <motion.button
          layout
          onClick={handleGenerate}
          disabled={(!file && !selectedTopic && !title) || isUploading}
          className="w-full btn-primary py-4 text-lg shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 disabled:opacity-50 disabled:shadow-none"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-3">
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                 className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
               />
              {file ? 'Processing document...' : 'Generating lesson...'}
            </span>
          ) : (
            file ? 'Upload and Continue' : 'Start Learning'
          )}
        </motion.button>

      </motion.div>
      
      <div className="mt-8 text-center">
          <Link to="/dashboard" className="text-stone-400 hover:text-stone-600 text-sm font-medium transition-colors">
              Cancel and return to dashboard
          </Link>
      </div>
    </div>
  );
}
