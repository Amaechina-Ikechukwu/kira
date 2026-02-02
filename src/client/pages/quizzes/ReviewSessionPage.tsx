import { useState, useEffect } from 'react';
import { 
  BookOpen, Brain, Clock, ChevronRight, X, Loader2, AlertCircle 
} from 'lucide-react';

interface ReviewTopic {
  topic: string;
  description: string;
  priority: number;
}

interface ReviewSession {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  weakTopics: ReviewTopic[] | string[]; // Backend might send strings or objects
  createdAt: string;
  dueDate?: string;
  lessonPlan?: any;
}

export default function ReviewSessionPage() {
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<ReviewSession | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Review Sessions</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Personalized study plans based on your quiz results</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
          <Brain className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">No review sessions</h3>
          <p className="text-neutral-500 dark:text-neutral-400">Great job! You have no pending reviews.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map(review => (
            <div 
              key={review.id}
              onClick={() => setSelectedReview(review)}
              className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:border-violet-500 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                  review.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {review.status}
                </div>
                {review.dueDate && (
                  <div className="flex items-center text-xs text-neutral-400">
                    <Clock className="w-3 h-3 mr-1" />
                    Due {new Date(review.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <h3 className="font-semibold text-neutral-900 dark:text-white text-lg mb-2 group-hover:text-violet-600 transition-colors">
                {review.title}
              </h3>
              <p className="text-sm text-neutral-500 line-clamp-2 mb-4">
                {review.description}
              </p>

              <div className="flex items-center text-sm font-medium text-violet-600">
                Start Review <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Details Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6 border-b border-neutral-100 dark:border-neutral-700 pb-4">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{selectedReview.title}</h2>
              <button onClick={() => setSelectedReview(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">Focus Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedReview.weakTopics) ? (
                     selectedReview.weakTopics.map((t, i) => {
                       const topicName = typeof t === 'string' ? t : t.topic;
                       return (
                         <span key={i} className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-sm">
                           {topicName}
                         </span>
                       );
                     })
                  ) : (
                    <span className="text-neutral-500">General Review</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">Study Plan</h3>
                <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg text-neutral-700 dark:text-neutral-300 space-y-4">
                  {selectedReview.lessonPlan ? (
                    <div className="prose dark:prose-invert max-w-none">
                      {/* Simple rendering of lesson plan if it's generic JSON */}
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {JSON.stringify(selectedReview.lessonPlan, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex items-center text-neutral-500">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      AI is generating your personalized study plan...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => setSelectedReview(null)}
                  className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
