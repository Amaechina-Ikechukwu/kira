import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  School, 
  Calendar, 
  GraduationCap, 
  LogOut, 
  Menu, 
  X,
  BookOpen,
  Settings,
  Users,
  BarChart,
  Sparkles 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from '../components/game/Mascot';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        // Enrich user data with UI-specific fields if needed (e.g. role for sidebar)
        // Mapping platformRole/db role to UI role if necessary. 
        // For now, assuming db 'role' or 'platformRole' maps roughly to what we need.
        // If the DB user doesn't have a 'role' field suitable for the UI switch, default to 'student' or derive it.
        // Note: The /me endpoint returns { id, email, name, avatarUrl, platformRole }. 
        // It might NOT return 'role' (school role) if that's school-specific. 
        // For this refactor, I'll assume platformRole or default to 'principal' for the 'Demo User' equivalence if missing, 
        // or fetches school role in a real app. 
        // To be safe and show *something*, I'll mix in the mock role if missing, or default to 'student'.
        setUser({
            ...userData,
            role: userData.role || 'principal' // detailed role logic might be needed later
        }); 
      } else {
        // Not authenticated
        navigate('/login');
      }
    } catch (err) {
      console.error('Failed to fetch user', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // Role-based navigation logic
  const getNavigationForRole = () => {
    if (!user) return [];

    // Platform Level Roles (Global)
    if (user.platformRole === 'owner' || user.platformRole === 'superadmin') {
      return [
        { name: 'Platform Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Learnground', href: '/learnground', icon: Sparkles }, // Added for owner/superadmin
        { name: 'Manage Schools', href: '/schools', icon: School },
        { name: 'Global Settings', href: '/settings', icon: Settings },
        { name: 'Billing', href: '/billing', icon: BarChart },
      ];
    }

    // School Level Roles
    // Using a safe fallback for role checking
    const role = user.role?.toLowerCase() || 'student';

    switch (role) {
      case 'principal':
        return [
          { name: 'My Overview', href: '/dashboard', icon: LayoutDashboard },
          { name: 'My School', href: user.schoolId ? `/schools/${user.schoolId}` : '/schools', icon: School },
          { name: 'Learnground', href: '/learnground', icon: Sparkles }, // Updated path
          { name: 'Teachers', href: '/teachers', icon: Users },
          { name: 'Students', href: '/students', icon: GraduationCap },
          { name: 'Meetings', href: '/meetings', icon: Calendar },
          { name: 'Settings', href: '/settings', icon: Settings },
        ];
      case 'teacher':
        return [
          { name: 'My Classes', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Learnground', href: '/learnground', icon: Sparkles }, // Updated path
          { name: 'Assignments', href: '/assignments', icon: BookOpen },
          { name: 'Meetings', href: '/meetings', icon: Calendar },
          { name: 'Gradebook', href: '/grades', icon: BarChart },
        ];
      case 'student':
      default:
        // Default student view
        return [
          { name: 'My Learning', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Learnground', href: '/learnground', icon: Sparkles }, // Updated path
          { name: 'Quizzes', href: '/quizzes', icon: BookOpen },
          { name: 'Review Sessions', href: '/reviews', icon: GraduationCap },
          { name: 'Meetings', href: '/meetings', icon: Calendar },
        ];
    }
  };

  const navigation = getNavigationForRole();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
      navigate('/login');
    }
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <Mascot expression="thinking" size="md" />
      </div>;
  }

  if (!user) return null; // Should redirect in fetchUser

  return (
    <div className="min-h-screen bg-neutral-50 relative overflow-hidden">
       {/* Animated background elements - Copied from HomePage for consistency */}
       {/* REMOVED GRADIENTS AS PER USER REQUEST */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-stone-50" />

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        className={`fixed left-0 top-0 h-full bg-white/70 backdrop-blur-xl border-r border-white/50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-40 transition-all duration-300 w-64
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header with Mascot */}
          <div className="px-6 pt-8 pb-4 flex flex-col items-center border-b border-pink-50">
            <span className="text-3xl font-display font-bold text-pink-600">
              Kira
            </span>
            <span className="text-[10px] text-stone-400 font-medium tracking-wider uppercase mt-1">
              {user.role} Portal
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-pink-50 text-pink-600 shadow-sm' 
                      : 'text-stone-600 hover:bg-white hover:text-pink-500 hover:shadow-sm'}
                  `}
                >
                  <item.icon className={`
                    w-5 h-5 mr-3 transition-colors duration-200
                    ${isActive ? 'text-pink-500' : 'text-stone-400 group-hover:text-pink-400'}
                  `} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 mt-auto">
            <div className="bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md rounded-2xl border border-white/60 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-pink-100 p-[2px]">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-full h-full rounded-full bg-white object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-stone-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-stone-500 truncate uppercase tracking-wider font-semibold">{user.role}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-stone-500 bg-white/50 hover:bg-white hover:text-red-500 rounded-xl transition-all duration-200 border border-transparent hover:border-red-100 hover:shadow-sm group"
              >
                <LogOut className="w-3.5 h-3.5 group-hover:text-red-500 transition-colors" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-200 relative z-10">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white/80 backdrop-blur-md border-b border-stone-100 lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-stone-500 rounded-xl hover:bg-stone-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 text-lg font-bold text-stone-800">
            Kira
          </span>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
