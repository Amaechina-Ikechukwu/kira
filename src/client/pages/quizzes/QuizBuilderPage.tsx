import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Save, Trash2, ArrowLeft, Loader2, GripVertical, CheckCircle, XCircle 
} from 'lucide-react';

interface School {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface Question {
  id: string; // temp id
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  points: number;
  options?: string[];
  correctAnswer: any;
  explanation?: string;
  topic?: string;
}

export default function QuizBuilderPage() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    schoolId: '',
    classId: '',
    title: '',
    description: '',
    type: 'practice', // or 'exam'
    passingScore: 70,
    timeLimit: 0, // minutes
    questions: [] as Question[],
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (formData.schoolId) {
      fetchClasses(formData.schoolId);
    } else {
      setClasses([]);
    }
  }, [formData.schoolId]);

  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/schools');
      if (res.ok) {
        const data = await res.json();
        setSchools(data.schools || []);
      }
    } catch (err) {
      console.error('Failed to fetch schools', err);
    }
  };

  const fetchClasses = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/schools/${schoolId}/classes`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.error('Failed to fetch classes', err);
    }
  };

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      question: '',
      points: 10,
      options: type === 'multiple_choice' ? ['', '', '', ''] : undefined,
      correctAnswer: type === 'multiple_choice' ? '' : type === 'true_false' ? 'true' : '',
    };
    setFormData(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    }));
  };

  const removeQuestion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolId) {
      alert('Please select a school');
      return;
    }
    if (formData.questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean up questions (remove temp id)
      const cleanQuestions = formData.questions.map(({ id, ...rest }) => ({
       ...rest,
       options: rest.options?.filter(o => o.trim() !== '')
      }));

      const payload = {
        ...formData,
        questions: cleanQuestions,
        // Convert empty string/0 to null if needed or keep as is.
        // Backend expects classId if populated.
        classId: formData.classId || undefined,
      };

      const res = await fetch(`/api/schools/${formData.schoolId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create quiz');
      }

      navigate('/quizzes');
    } catch (err: any) {
      console.error('Failed to create quiz', err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
          <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Create New Quiz</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quiz Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">School</label>
              <select 
                value={formData.schoolId}
                onChange={e => setFormData({ ...formData, schoolId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900"
              >
                <option value="">Select School</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Class (Optional)</label>
              <select 
                value={formData.classId}
                onChange={e => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900"
                disabled={!formData.schoolId}
              >
                <option value="">No Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Title</label>
            <input 
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Quiz Title"
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Passing Score (%)</label>
              <input 
                type="number"
                value={formData.passingScore}
                onChange={e => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Time Limit (mins)</label>
              <input 
                type="number"
                value={formData.timeLimit}
                onChange={e => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900"
                placeholder="0 for none"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Type</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900"
              >
                <option value="practice">Practice</option>
                <option value="exam">Exam</option>
              </select>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Questions ({formData.questions.length})</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => addQuestion('multiple_choice')} className="btn-secondary text-sm">+ Multiple Choice</button>
              <button type="button" onClick={() => addQuestion('true_false')} className="btn-secondary text-sm">+ True/False</button>
              <button type="button" onClick={() => addQuestion('short_answer')} className="btn-secondary text-sm">+ Short Answer</button>
            </div>
          </div>

          {formData.questions.map((q, idx) => (
            <div key={q.id} className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-4">
                <div className="mt-2 text-neutral-400 cursor-grab"><GripVertical className="w-5 h-5" /></div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-neutral-500">Q{idx + 1}</span>
                    <input 
                      value={q.question}
                      onChange={e => updateQuestion(q.id, { question: e.target.value })}
                      placeholder="Enter question text..."
                      className="flex-1 px-3 py-2 bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus:border-violet-600 outline-none font-medium"
                    />
                    <input 
                      type="number"
                      value={q.points}
                      onChange={e => updateQuestion(q.id, { points: Number(e.target.value) })}
                      className="w-20 px-2 py-1 text-right border rounded bg-neutral-50 dark:bg-neutral-900"
                      title="Points"
                    />
                  </div>

                  {/* Options based on type */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2 pl-8">
                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                           <input 
                             type="radio" 
                             name={`q-${q.id}`}
                             checked={q.correctAnswer === opt && opt !== ''}
                             onChange={() => updateQuestion(q.id, { correctAnswer: opt })}
                             className="text-violet-600"
                           />
                           <input 
                              value={opt}
                              onChange={e => {
                                const newOptions = [...(q.options || [])];
                                newOptions[optIdx] = e.target.value;
                                // If this option was correct, update correct answer too
                                const updates: any = { options: newOptions };
                                if (q.correctAnswer === opt) updates.correctAnswer = e.target.value;
                                updateQuestion(q.id, updates);
                              }}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-900"
                           />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="flex gap-4 pl-8">
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input 
                           type="radio" 
                           name={`q-${q.id}`} 
                           checked={q.correctAnswer === 'true'}
                           onChange={() => updateQuestion(q.id, { correctAnswer: 'true' })}
                         />
                         True
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input 
                           type="radio" 
                           name={`q-${q.id}`} 
                           checked={q.correctAnswer === 'false'}
                           onChange={() => updateQuestion(q.id, { correctAnswer: 'false' })}
                         />
                         False
                       </label>
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                     <div className="pl-8">
                       <input 
                         value={q.correctAnswer}
                         onChange={e => updateQuestion(q.id, { correctAnswer: e.target.value })}
                         placeholder="Correct Answer (text)"
                         className="w-full px-3 py-2 border border-green-200 dark:border-green-900 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                       />
                     </div>
                  )}

                  <input 
                    value={q.explanation || ''}
                    onChange={e => updateQuestion(q.id, { explanation: e.target.value })}
                    placeholder="Explanation (shown after submission)"
                    className="w-full px-3 py-2 text-sm border-t border-neutral-100 dark:border-neutral-700 bg-transparent outline-none text-neutral-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3 z-10">
           <button  
             type="button" 
             onClick={() => navigate('/quizzes')}
             className="px-6 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
           >
             Cancel
           </button>
           <button 
             type="submit"
             disabled={isSubmitting}
             className="px-6 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-lg shadow-violet-600/20 transition-all flex items-center"
           >
             {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
             Create Quiz
           </button>
        </div>
      </form>
    </div>
  );
}
