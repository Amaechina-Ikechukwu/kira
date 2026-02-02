import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Mail, Loader2, Copy, Check, ChevronRight } from 'lucide-react';
import Mascot from '../../components/game/Mascot';
import Select from '../../components/ui/Select';

interface Teacher {
  id: string;
  name: string;
}

export default function StudentsListPage() {
  const [students, setStudents] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<null | 'success' | 'error'>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Mock School ID
  const SCHOOL_ID = '07d56070-0b62-421b-8524-783387b320a3'; 

  // Fetch teachers for dropdown
  useEffect(() => {
    if (isInviteModalOpen) {
       // Mock fetch - in real app, fetch from /api/schools/:id/teachers
       // We'll simulate fetching teachers
       setTeachers([
           { id: 't1', name: 'Mrs. Krabappel' },
           { id: 't2', name: 'Mr. Garrison' },
           { id: 't3', name: 'Mr. Miyagi' }
       ]);
    }
  }, [isInviteModalOpen]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteStatus(null);
    setStatusMessage('');

    try {
      const res = await fetch(`/api/schools/${SCHOOL_ID}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            email: inviteEmail, 
            role: 'student',
            metadata: selectedTeacherId ? { assignedTeacherId: selectedTeacherId } : undefined
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteStatus('success');
        setStatusMessage('Invitation sent! Student will join teacher\'s classes.');
        setInviteEmail('');
        setSelectedTeacherId('');
        setTimeout(() => {
             setIsInviteModalOpen(false);
             setInviteStatus(null);
        }, 3000);
      } else {
        setInviteStatus('error');
        setStatusMessage(data.error || 'Failed to invite student');
      }
    } catch (err) {
      setInviteStatus('error');
      setStatusMessage('Network error. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-stone-800">
            Students
          </h1>
          <p className="text-stone-500 mt-1">Manage your school's student body</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30"
        >
          <Plus className="w-5 h-5" />
          Invite Student
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-12 text-center"
      >
        <Mascot expression="thinking" size="lg" />
        <h2 className="mt-6 text-xl font-semibold text-stone-700">No students yet</h2>
        <p className="text-stone-500 mb-6 max-w-md mx-auto">
          Students will appear here once they join your school.
        </p>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="btn-primary"
        >
          Send Invite
        </button>
      </motion.div>
      
      {/* Invite Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 relative z-10"
            >
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-500">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">Invite Student</h2>
                <p className="text-stone-500 text-sm mt-1">
                  Invite a student and assign them to a teacher.
                </p>
              </div>

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1 ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="student@school.edu"
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 focus:border-pink-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                   <label className="block text-sm font-bold text-stone-700 mb-1 ml-1">Assign Teacher (Optional)</label>
                   <div className="relative">
                        <Select
                            value={selectedTeacherId}
                            onChange={setSelectedTeacherId}
                            options={teachers.map(t => ({ value: t.id, label: t.name }))}
                            placeholder="Select a teacher..."
                        />
                   </div>
                   <p className="text-xs text-stone-400 mt-1 ml-1">Student will automatically join this teacher's classes.</p>
                </div>

                {/* Status Message */}
                 <AnimatePresence>
                    {inviteStatus && (
                        <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${
                            inviteStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                        >
                            {inviteStatus === 'success' ? <Check className="w-4 h-4" /> : null}
                            {statusMessage}
                        </motion.div>
                    )}
                 </AnimatePresence>

                <button
                  type="submit"
                  disabled={isInviting || inviteStatus === 'success'}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
