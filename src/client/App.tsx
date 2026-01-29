import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LessonPage from './pages/LessonPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-game">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/lesson/:sessionId" element={<LessonPage />} />
      </Routes>
    </div>
  );
}

