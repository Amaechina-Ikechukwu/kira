import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  School, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Calendar, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import Mascot from '../components/game/Mascot';

// Types
interface User {
  id: string;
  email: string;
  name?: string;
  role?: string; // School role
  platformRole?: string;
  schoolId?: string;
}

interface SchoolStats {
  members: number;
  departments: number;
  classes: number;
}

interface ActivityItem {
  type: string;
  date: string;
  data: any;
}

interface ClassItem {
  id: string;
  name: string;
  code: string;
  schedule?: {
    days: string[];
    startTime: string;
    endTime: string;
  };
  room?: string;
  teacher?: {
    name: string;
  };
  _count?: {
    enrollments: number; // For teacher view
  };
}

interface ReviewSession {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  dueDate?: string;
  priority: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch User
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        if (process.env.NODE_ENV === 'development') {
           // Mock for dev if needed, or redirect
           // For now, let's redirect to login for safety or strictly use fetched data
           navigate('/login');
           return;
        }
        navigate('/login');
        return;
      }
      
      const userData = await userRes.json();
      
      // Determine effective role for dashboard view
      let role = userData.role;
      const platformRole = userData.platformRole;

      // If user is a platform admin (owner/superadmin) but has no specific school role,
      // treat them as a principal to show the stats view.
      if (!role && ['owner', 'superadmin', 'admin'].includes(platformRole)) {
          role = 'principal';
      }
      
      // Fallback to student if still no role found
      role = role || 'student';
      
      const schoolId = userData.schoolId;
      
      setUser({ ...userData, role });

      if (!schoolId) {
        setLoading(false);
        return; // No school context, just show generic welcome
      }

      // 2. Fetch Data based on Role
      // Treat Owner/Superadmin/Admin as Principal for the view if they are mapped to principal above
      if (['principal', 'vice_principal', 'dept_head'].includes(role)) {
        // Admin View: Fetch Stats & Activity
        const schoolRes = await fetch(`/api/schools/${schoolId}`);
        if (schoolRes.ok) {
          const data = await schoolRes.json();
          setStats(data.stats);
          setActivities(data.recentActivity || []);
        }
        
        // Also fetch classes if they are a dept head or just to show *something* extra?
        // Principal might want to see all classes? Currently stick to stats.
        if (role === 'dept_head') {
             // Dept heads might also teach, so fetch their classes too?
             // Optional enhancement. Sticking to plan.
        }
      } 
      
      if (['teacher', 'teaching_assistant'].includes(role)) {
        // Teacher View: Fetch My Classes
        const classesRes = await fetch(`/api/schools/${schoolId}/classes?teacherId=${userData.id}`);
        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.classes);
        }
      }

      if (role === 'student') {
        // Student View: Fetch Enrolled Classes & Reviews
        const classesRes = await fetch(`/api/schools/${schoolId}/classes`);
        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.classes);
        }

        const reviewsRes = await fetch('/api/reviews?status=pending');
        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviews(data.reviews);
        }
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const role = user?.role || 'student';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-stone-800">
            Welcome back, <span className="text-gradient hover:text-pink-600 transition-colors cursor-default">{user?.name || 'Scholar'}</span>!
          </h1>
          <p className="text-stone-500 mt-1">Here's what's happening in your world.</p>
        </div>
        
        {/* Quick Action? */}
        {['teacher', 'principal'].includes(role) && (
            <Link to="/learnground" className="btn-primary shadow-lg shadow-pink-500/20">
                + Create New Content
            </Link>
        )}
      </div>

      {/* ADMIN / PRINCIPAL VIEW */}
      {['principal', 'vice_principal'].includes(role) && stats && (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
            <StatsCard 
                label="Total Members" 
                value={stats.members} 
                icon={Users} 
                color="pink" 
            />
            <StatsCard 
                label="Active Classes" 
                value={stats.classes} 
                icon={BookOpen} 
                color="pink" 
            />
            <StatsCard 
                label="Departments" 
                value={stats.departments} 
                icon={School} 
                color="pink" 
            />
        </motion.div>
      )}

      {/* TEACHER / STUDENT VIEW - CLASSES GRID */}
      {['teacher', 'teaching_assistant', 'student'].includes(role) && (
          <section>
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-stone-700 flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-violet-500" />
                      My Classes
                  </h2>
                  <Link to={`/schools/${user?.schoolId}`} className="text-sm font-medium text-pink-600 hover:text-pink-700">
                      View All
                  </Link>
              </div>

              {classes.length === 0 ? (
                  <div className="bg-white/60 rounded-2xl p-8 text-center border border-white/60">
                      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                           <BookOpen className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-stone-600">No classes yet</h3>
                      <p className="text-stone-500">You haven't checked into any classes recently.</p>
                  </div>
              ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {classes.map((cls, idx) => (
                          <motion.div
                            key={cls.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group bg-white rounded-2xl p-6 border border-stone-100 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-500/5 transition-all duration-300"
                          >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                {cls.code && (
                                    <span className="px-3 py-1 bg-stone-100 text-stone-600 text-xs font-bold rounded-full">
                                        {cls.code}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-stone-800 mb-1">{cls.name}</h3>
                            <p className="text-sm text-stone-500 mb-4">
                                {cls.teacher?.name ? `with ${cls.teacher.name}` : cls.room || 'Online'}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs font-medium text-stone-400 mb-6">
                                {cls.schedule && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {cls.schedule.startTime}
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Classmates</span>
                                </div>
                            </div>
                            
                            <Link 
                                to={`/classes/${cls.id}`} // Assuming route exists or fallback
                                className="block w-full py-2.5 text-center bg-stone-50 text-stone-600 font-bold rounded-xl text-sm hover:bg-pink-50 hover:text-pink-600 transition-colors"
                            >
                                Open Class
                            </Link>
                          </motion.div>
                      ))}
                  </div>
              )}
          </section>
      )}

      {/* STUDENT - REVIEWS NEEDED */}
      {role === 'student' && reviews.length > 0 && (
          <section>
              <h2 className="text-xl font-bold text-stone-700 flex items-center gap-2 mb-6">
                  <AlertCircle className="w-6 h-6 text-orange-500" />
                  Needs Review
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                  {reviews.map(review => (
                      <div key={review.id} className="bg-orange-50/50 border border-orange-100 p-5 rounded-2xl flex items-center justify-between">
                          <div>
                              <h4 className="font-bold text-stone-800">{review.title}</h4>
                              <p className="text-sm text-stone-500 line-clamp-1">{review.description}</p>
                          </div>
                          <Link to={`/reviews/${review.id}`} className="px-4 py-2 bg-white text-orange-600 text-sm font-bold rounded-lg shadow-sm border border-orange-100 hover:bg-orange-50">
                              Start Review
                          </Link>
                      </div>
                  ))}
              </div>
          </section>
      )}

      {/* RECENT ACTIVITY (Admin/Principal/Teacher) */}
      {['principal', 'vice_principal', 'teacher', 'dept_head'].includes(role) && activities.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-stone-700 flex items-center gap-2 mb-6">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
                Recent Activity
            </h2>
            <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden">
                {activities.map((activity, idx) => (
                    <div key={idx} className="p-4 flex items-center gap-4 border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                            ${activity.type.includes('member') ? 'bg-pink-50 text-pink-500' : 
                              activity.type.includes('class') ? 'bg-pink-50 text-pink-500' : 'bg-emerald-50 text-emerald-500'}
                        `}>
                            {activity.type.includes('member') ? <Users className="w-5 h-5"/> : 
                             activity.type.includes('class') ? <BookOpen className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
                        </div>
                        <div>
                            <p className="text-stone-800 font-semibold text-sm">
                                {formatActivityText(activity)}
                            </p>
                            <p className="text-stone-400 text-xs">
                                {new Date(activity.date).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
          </section>
      )}
      
      {/* Empty State Fallback if nothing to show */}
      {!loading && !stats && classes.length === 0 && reviews.length === 0 && (
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm"
          >
            <Mascot expression="thinking" size="lg" />
            <h2 className="mt-6 text-xl font-semibold text-stone-700">It's quiet here...</h2>
            <p className="text-stone-500 mb-6 max-w-md mx-auto">
                {role === 'principal' 
                    ? "Get started by creating your first class or inviting members." 
                    : "You haven't been assigned to any classes yet."}
            </p>
             {role === 'principal' && (
                 <Link to="/schools" className="btn-primary">
                      Manage School
                 </Link>
             )}
          </motion.div>
      )}
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: 'blue'|'violet'|'pink'|'green'|'orange' }) {
    const colorStyles = {
        blue: 'bg-stone-50 text-stone-600', // Fallback
        violet: 'bg-stone-50 text-stone-600', // Fallback
        pink: 'bg-pink-50 text-pink-600',
        green: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-stone-50 text-stone-600' // Fallback
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorStyles[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-stone-500 font-medium text-sm">{label}</p>
                    <p className="text-2xl font-bold text-stone-800">{value}</p>
                </div>
            </div>
        </div>
    );
}

function formatActivityText(activity: ActivityItem): string {
    switch (activity.type) {
        case 'member_joined':
            return `New member joined: ${activity.data.user?.name || 'User'}`;
        case 'class_created':
            return `New class created: ${activity.data.name}`;
        case 'department_created':
            return `New department: ${activity.data.name}`;
        default:
            return 'New activity recorded';
    }
}
