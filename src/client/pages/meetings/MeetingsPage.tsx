import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Video, Users, Plus, ChevronRight, 
  MapPin, Loader2, Link as LinkIcon, Building2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from '../../components/game/Mascot';

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  type: string;
  googleMeetLink?: string;
  schoolId: string;
  hostId: string;
  host?: {
    name: string;
    avatarUrl?: string;
  };
  school?: {
    name: string;
    logoUrl?: string;
  };
}

interface School {
  id: string;
  name: string;
  logoUrl?: string;
}

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    schoolId: '',
    title: '',
    scheduledStart: '',
    scheduledEnd: '',
    description: '',
    createGoogleMeet: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      setSchools(userSchools);

      // 2. Fetch meetings for each school
      const meetingsPromises = userSchools.map(async (school: School) => {
        try {
          const res = await fetch(`/api/schools/${school.id}/meetings?from=${new Date().toISOString()}`);
          if (!res.ok) return [];
          const data = await res.json();
          // Attach school info to meeting
          return data.meetings.map((m: any) => ({ ...m, school })); 
        } catch (e) {
          console.error(`Failed to fetch meetings for school ${school.id}`, e);
          return [];
        }
      });

      const results = await Promise.all(meetingsPromises);
      const allMeetings = results.flat();

      // Sort by date
      allMeetings.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
      
      setMeetings(allMeetings);

    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (!formData.schoolId) throw new Error('Please select a school');

      const res = await fetch(`/api/schools/${formData.schoolId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create meeting');
      }

      await fetchData(); // Refresh list
      setIsCreateModalOpen(false);
      setFormData({
        schoolId: '', // Reset
        title: '',
        scheduledStart: '',
        scheduledEnd: '',
        description: '',
        createGoogleMeet: true
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const isPast = new Date(m.scheduledEnd) < new Date();
    return filter === 'upcoming' ? !isPast : isPast;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-stone-800">
            Meetings & Classes
          </h1>
          <p className="text-stone-500 mt-1">Join your live sessions and manage schedules.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30"
        >
          <span className="text-xl leading-none">+</span>
          Schedule Meeting
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200 sticky top-0 bg-white/50 backdrop-blur-sm z-10 pt-4">
        <button
          onClick={() => setFilter('upcoming')}
          className={`pb-3 px-4 text-sm font-bold transition-colors relative ${
            filter === 'upcoming' ? 'text-violet-600' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          Upcoming
          {filter === 'upcoming' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`pb-3 px-4 text-sm font-bold transition-colors relative ${
            filter === 'past' ? 'text-violet-600' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          Past Sessions
          {filter === 'past' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-12 text-center"
        >
          <Mascot expression="thinking" size="lg" />
          <h3 className="mt-6 text-xl font-semibold text-stone-700">No {filter} meetings</h3>
          <p className="text-stone-500 mb-6">
            {filter === 'upcoming' 
              ? "Your schedule is clear! Take a break or plan something new." 
              : "No history of past meetings yet."}
          </p>
          {filter === 'upcoming' && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                Schedule one now
              </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredMeetings.map((meeting, index) => (
              <motion.div 
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-violet-50 rounded-2xl text-violet-600 border border-violet-100 group-hover:bg-violet-100 transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider">{new Date(meeting.scheduledStart).toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="text-2xl font-display font-bold">{new Date(meeting.scheduledStart).getDate()}</span>
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                         <h3 className="text-xl font-display font-bold text-stone-800 group-hover:text-violet-700 transition-colors">
                             {meeting.title}
                         </h3>
                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            meeting.status === 'live' ? 'bg-red-100 text-red-600 animate-pulse' :
                            meeting.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                            'bg-stone-100 text-stone-500'
                          }`}>
                            {meeting.status}
                          </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mt-2">
                        <span className="flex items-center bg-stone-50 px-2 py-1 rounded-lg">
                            <Clock className="w-4 h-4 mr-1.5 text-stone-400" />
                            {new Date(meeting.scheduledStart).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(meeting.scheduledEnd).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {meeting.school && (
                          <span className="flex items-center">
                            <Building2 className="w-4 h-4 mr-1.5 text-stone-400" />
                            {meeting.school.name}
                          </span>
                        )}
                        
                        {meeting.host && (
                            <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1.5 text-stone-400" />
                                Host: <span className="font-medium text-stone-700 ml-1">{meeting.host.name}</span>
                            </span>
                        )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center md:flex-col lg:flex-row gap-3">
                     {meeting.googleMeetLink && (
                       <a 
                         href={meeting.googleMeetLink} 
                         target="_blank" 
                         rel="noreferrer"
                         className="btn-primary py-2 px-4 shadow-none flex items-center justify-center text-sm"
                       >
                         <Video className="w-4 h-4 mr-2" />
                         Join Meet
                       </a>
                     )}
                     <button className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
                       <ChevronRight className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative z-10"
          >
            <div className="text-center mb-6">
                <Mascot expression="excited" size="md" />
                <h2 className="text-2xl font-display font-bold text-stone-800 mt-2">Schedule Meeting</h2>
                <p className="text-stone-500 text-sm">Create a new session for your class</p>
            </div>
            
            <form onSubmit={handleCreateMeeting} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5 ml-1">School Context</label>
                <div className="relative">
                    <select
                    required
                    value={formData.schoolId}
                    onChange={e => setFormData({ ...formData, schoolId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 text-stone-800 outline-none focus:border-violet-500 transition-all appearance-none font-medium"
                    >
                    <option value="">Select a school...</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5 ml-1">Title</label>
                <input
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 text-stone-800 outline-none focus:border-violet-500 transition-all placeholder:text-stone-400 font-medium"
                  placeholder="e.g. Weekly Physics Review"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5 ml-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledStart}
                    onChange={e => setFormData({ ...formData, scheduledStart: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 text-stone-800 outline-none focus:border-violet-500 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5 ml-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledEnd}
                    onChange={e => setFormData({ ...formData, scheduledEnd: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 text-stone-800 outline-none focus:border-violet-500 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5 ml-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl bg-stone-50 text-stone-800 outline-none focus:border-violet-500 transition-all h-24 resize-none font-medium"
                  placeholder="What will discuss in this session?"
                />
              </div>

              <div className="flex items-center p-4 bg-violet-50 rounded-xl border border-violet-100">
                 <input
                   type="checkbox"
                   id="createMeet"
                   checked={formData.createGoogleMeet}
                   onChange={e => setFormData({ ...formData, createGoogleMeet: e.target.checked })}
                   className="w-5 h-5 rounded border-stone-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                 />
                 <label htmlFor="createMeet" className="ml-3 text-sm font-bold text-stone-700 cursor-pointer flex items-center gap-2">
                   <Video className="w-4 h-4 text-violet-500" />
                   Generate Google Meet link
                 </label>
              </div>

              {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary py-3 px-8 shadow-md"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                    </span>
                  ) : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
