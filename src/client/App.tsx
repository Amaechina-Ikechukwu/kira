import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LessonPage from './pages/LessonPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-game">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lesson/:sessionId" element={<LessonPage />} />
      </Routes>
    </div>
  );
}
