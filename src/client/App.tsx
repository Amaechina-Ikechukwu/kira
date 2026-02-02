import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LessonPage from './pages/LessonPage';
import LoginPage from './pages/LoginPage';
import InviteAcceptPage from './pages/auth/InviteAcceptPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import DashboardLayout from './layouts/DashboardLayout';
import SchoolDetailsPage from './pages/schools/SchoolDetailsPage';
import SchoolsListPage from './pages/schools/SchoolsListPage';
import TeachersListPage from './pages/schools/TeachersListPage';
import StudentsListPage from './pages/schools/StudentsListPage';
import SettingsPage from './pages/SettingsPage';
import MeetingsPage from './pages/meetings/MeetingsPage';
import QuizListPage from './pages/quizzes/QuizListPage';
import ReviewSessionPage from './pages/quizzes/ReviewSessionPage';
import QuizBuilderPage from './pages/quizzes/QuizBuilderPage';
import QuizTakingPage from './pages/quizzes/QuizTakingPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-game">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join/:token" element={<InviteAcceptPage />} />
        
        {/* Protected Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/learnground" element={<UploadPage />} />
          <Route path="/schools" element={<SchoolsListPage />} />
          <Route path="/schools/:id" element={<SchoolDetailsPage />} />
          <Route path="/teachers" element={<TeachersListPage />} />
          <Route path="/students" element={<StudentsListPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/quizzes" element={<QuizListPage />} />
          <Route path="/quizzes/new" element={<QuizBuilderPage />} />
          <Route path="/quizzes/:id" element={<QuizTakingPage />} />
          <Route path="/reviews" element={<ReviewSessionPage />} />
        </Route>

        {/* Game Interface (Fullscreen) */}
        <Route path="/lesson/:sessionId" element={<LessonPage />} />
      </Routes>
    </div>
  );
}

