import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Mascot from '../components/game/Mascot';

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile);
      setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      setError('');
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
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
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
    } catch (err) {
      setError('Failed to upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10">
              <Mascot expression="happy" size="sm" />
            </div>
            <span className="text-xl font-bold text-stone-800">Kira</span>
          </Link>
          
          <Link to="/dashboard" className="text-sm text-stone-500 hover:text-stone-700">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <Mascot expression="excited" size="lg" />
          <h1 className="mt-6 text-3xl font-bold text-stone-800">Upload a PDF</h1>
          <p className="text-stone-500">I'll read it and create an interactive lesson for you</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-lg border border-stone-100"
        >
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
              ${isDragging ? 'border-violet-500 bg-violet-50' : 'border-stone-200 hover:border-stone-300'}
              ${file ? 'border-green-400 bg-green-50' : ''}`}
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
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 font-bold">PDF</span>
                </div>
                <p className="font-medium text-stone-800">{file.name}</p>
                <p className="text-sm text-stone-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-2 text-sm text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-stone-400 text-2xl">+</span>
                </div>
                <p className="font-medium text-stone-700">Drop your PDF here</p>
                <p className="text-sm text-stone-400">or click to browse</p>
              </div>
            )}
          </div>

          {/* Title */}
          {file && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Document title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title..."
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl 
                  focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
              />
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-sm text-red-500 text-center"
            >
              {error}
            </motion.p>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full mt-6 btn-primary py-3 disabled:opacity-50"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </span>
            ) : (
              'Upload and Continue'
            )}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
