import { useState, useEffect } from 'react';
import { 
  BookOpen, Clock, AlertCircle, Plus, ChevronRight, 
  Building2, GraduationCap, FileQuestion, Loader2 
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface Quiz {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  questionCount: number;
  passingScore: number;
  timeLimit: number;
  schoolId: string;
  classId?: string;
  school?: { name: string };
  createdAt: string;
}

interface School {
  id: string;
  name: string;
}

export default function QuizListPage() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Fetch user's schools
      const schoolsRes = await fetch('/api/schools');
      if (!schoolsRes.ok) throw new Error('Failed to fetch schools');
      const schoolsData = await schoolsRes.json();
      const userSchools = schoolsData.schools || [];

      // 2. Fetch quizzes for each school
      const quizPromises = userSchools.map(async (school: School) => {
        try {
          const res = await fetch(`/api/schools/${school.id}/quizzes`);
          if (!res.ok) return [];
          const data = await res.json();
          // Attach school info
          return data.quizzes.map((q: any) => ({ ...q, school })); 
        } catch (e) {
          console.error(`Failed to fetch quizzes for school ${school.id}`, e);
          return [];
        }
      });

      const results = await Promise.all(quizPromises);
      const allQuizzes = results.flat();

      // Sort by creation date
      allQuizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setQuizzes(allQuizzes);

    } catch (err) {
      console.error('Failed to load quizzes', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(q => {
    if (filter === 'all') return true;
    return q.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Quizzes</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Assessments and practice exercises</p>
        </div>
        <Link 
          to="/quizzes/new"
          className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Quiz
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-1">
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 capitalize ${
              filter === f 
                ? 'border-violet-600 text-violet-600 dark:text-violet-400' 
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Quiz List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
          <FileQuestion className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">No quizzes found</h3>
          <p className="text-neutral-500 dark:text-neutral-400">There are no {filter !== 'all' ? filter : ''} quizzes to display.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map(quiz => (
            <div key={quiz.id} className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:border-violet-500 transition-colors flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <div className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                  quiz.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {quiz.status}
                </div>
                {quiz.type === 'exam' ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <BookOpen className="w-5 h-5 text-violet-500" />
                )}
              </div>
              
              <h3 className="font-semibold text-neutral-900 dark:text-white text-lg mb-2 line-clamp-2" title={quiz.title}>
                {quiz.title}
              </h3>
              
              <div className="space-y-2 mb-4 flex-1">
                {quiz.school && (
                  <div className="flex items-center text-sm text-neutral-500">
                    <Building2 className="w-4 h-4 mr-2" />
                    {quiz.school.name}
                  </div>
                )}
                {quiz.timeLimit && (
                  <div className="flex items-center text-sm text-neutral-500">
                    <Clock className="w-4 h-4 mr-2" />
                    {quiz.timeLimit} mins
                  </div>
                )}
                <div className="flex items-center text-sm text-neutral-500">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Pass: {quiz.passingScore}%
                </div>
                <div className="flex items-center text-sm text-neutral-500">
                  <FileQuestion className="w-4 h-4 mr-2" />
                  {quiz.questionCount} Questions
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-700 flex gap-2">
                 <Link 
                   to={`/quizzes/${quiz.id}`}
                   className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
                 >
                   Take Quiz
                 </Link>
                 {/* Links to edit/stats could go here for teachers */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
