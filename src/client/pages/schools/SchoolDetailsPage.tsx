import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Users, BookOpen, GraduationCap, 
  Settings, Plus, MoreHorizontal, ChevronRight, Loader2,
  Calendar, School, ArrowLeft
} from 'lucide-react';

interface SchoolDetails {
  id: string;
  name: string;
  type: string;
  slug: string;
  logoUrl?: string;
  city?: string;
  country?: string;
  stats: {
    members: number;
    departments: number;
    classes: number;
  };
}

interface Department {
  id: string;
  name: string;
  description: string;
  head?: {
    name: string;
    avatarUrl?: string;
  };
  stats: {
    classes: number;
    members: number;
  };
}

interface Class {
  id: string;
  name: string;
  code: string;
  teacher?: {
    name: string;
    avatarUrl?: string;
  };
  schedule?: any;
  room?: string;
}

interface Member {
  id: string;
  userId: string;
  role: string;
  status: string;
  user?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export default function SchoolDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'classes' | 'staff'>('overview');
  
  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [myRole, setMyRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Form states
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchoolDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'departments' && departments.length === 0) fetchDepartments();
    // Need departments for class creation too
    if ((activeTab === 'classes' || isClassModalOpen) && departments.length === 0) fetchDepartments();
    if (activeTab === 'classes' && classes.length === 0) fetchClasses();
    if (activeTab === 'staff' && members.length === 0) fetchMembers();
  }, [activeTab, isClassModalOpen]);

  const fetchSchoolDetails = async () => {
    try {
      const res = await fetch(`/api/schools/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSchool(data.school);
        setMyRole(data.myRole);
      }
    } catch (error) {
      console.error('Failed to fetch school', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`/api/schools/${id}/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error('Failed to fetch departments', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`/api/schools/${id}/classes`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes);
      }
    } catch (error) {
      console.error('Failed to fetch classes', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/schools/${id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch members', error);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${id}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create department');
      await fetchDepartments();
      setIsDeptModalOpen(false);
      setFormData({});
    } catch (err) {
      setError('Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${id}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create class');
      await fetchClasses();
      setIsClassModalOpen(false);
      setFormData({});
    } catch (err) {
      setError('Failed to create class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to send invitation');
      setIsInviteModalOpen(false);
      setFormData({});
    } catch (err) {
      setError('Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (!school) {
    return <div className="text-center py-20 text-stone-500 font-medium">School not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-sm relative overflow-hidden">
        {/* Background blobs for header */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-100/40 to-pink-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-bold text-4xl shadow-inner border border-white/60">
              {school.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-display font-bold text-stone-800">{school.name}</h1>
                <span className={`px-3 py-1 text-xs font-bold rounded-full capitalize border ${
                  myRole === 'principal' 
                  ? 'bg-amber-100 text-amber-700 border-amber-200' 
                  : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  {myRole?.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 font-medium">
                <span className="flex items-center px-3 py-1 bg-white/50 rounded-lg border border-stone-100">
                  <Building2 className="w-4 h-4 mr-2 text-violet-500" />
                  <span className="capitalize">{school.type.replace('_', ' ')}</span>
                </span>
                {school.city && (
                  <span className="flex items-center px-3 py-1 bg-white/50 rounded-lg border border-stone-100">
                    <MapPin className="w-4 h-4 mr-2 text-pink-500" />
                    {school.city}, {school.country}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
             {['principal', 'vice_principal'].includes(myRole) && (
              <button className="flex items-center px-5 py-2.5 text-sm font-bold text-stone-600 bg-white border-2 border-stone-100 rounded-xl hover:bg-stone-50 hover:border-stone-200 transition-colors shadow-sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
             )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-10 p-1 bg-stone-100/50 backdrop-blur-sm rounded-xl w-fit border border-stone-200/50">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'departments', label: 'Departments', icon: BookOpen },
            { id: 'classes', label: 'Classes', icon: GraduationCap },
            { id: 'staff', label: 'Staff & Students', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all
                ${activeTab === tab.id 
                  ? 'bg-white text-violet-600 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'}
              `}
            >
              <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-violet-500' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Total Members" value={school.stats.members} icon={Users} color="violet" />
              <StatCard label="Departments" value={school.stats.departments} icon={BookOpen} color="pink" />
              <StatCard label="Active Classes" value={school.stats.classes} icon={GraduationCap} color="indigo" />
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-stone-100 flex items-center gap-3 bg-white/40">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-xl text-stone-800">Recent Activity</h3>
              </div>
              <div className="divide-y divide-stone-100">
                {!school.recentActivity || school.recentActivity.length === 0 ? (
                  <div className="p-8 text-center text-stone-500">No recent activity</div>
                ) : (
                  school.recentActivity.map((activity, idx) => (
                    <div key={idx} className="p-6 flex items-start gap-4 hover:bg-white/50 transition-colors">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        activity.type === 'member_joined' ? 'bg-green-400' :
                        activity.type === 'class_created' ? 'bg-indigo-400' : 'bg-pink-400'
                      }`} />
                      
                      <div className="flex-1">
                        <p className="text-stone-800 font-medium">
                          {activity.type === 'member_joined' && (
                            <>
                              <span className="font-bold">{activity.data.user?.name || 'Someone'}</span> joined as a <span className="capitalize text-stone-600">{activity.data.role.replace('_', ' ')}</span>
                            </>
                          )}
                          {activity.type === 'class_created' && (
                            <>
                              New class <span className="font-bold">{activity.data.name}</span> created
                              {activity.data.teacher && <span className="text-stone-500 font-normal"> by {activity.data.teacher.name}</span>}
                            </>
                          )}
                          {activity.type === 'department_created' && (
                            <>
                              <span className="font-bold">{activity.data.name}</span> department was established
                            </>
                          )}
                        </p>
                        <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.date).toLocaleDateString()} at {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white/40">
              <h3 className="font-display font-bold text-xl text-stone-800">Departments</h3>
              {['principal', 'vice_principal'].includes(myRole) && (
                <button 
                  onClick={() => { setFormData({}); setError(''); setIsDeptModalOpen(true); }}
                  className="flex items-center px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Department
                </button>
              )}
            </div>
            <div className="divide-y divide-stone-100">
              {departments.length === 0 ? (
                <div className="p-12 text-center text-stone-500">No departments found</div>
              ) : (
                departments.map(dept => (
                  <div key={dept.id} className="p-6 hover:bg-white/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-100/50 flex items-center justify-center text-pink-600">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800 group-hover:text-violet-600 transition-colors">{dept.name}</h4>
                        {dept.head && (
                          <p className="text-sm text-stone-500 mt-0.5">Head: {dept.head.name}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-violet-400 transition-colors" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white/40">
              <h3 className="font-display font-bold text-xl text-stone-800">Classes</h3>
              {['principal', 'vice_principal', 'dept_head'].includes(myRole) && (
                <button 
                  onClick={() => { setFormData({}); setError(''); setIsClassModalOpen(true); }}
                  className="flex items-center px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </button>
              )}
            </div>
            <div className="divide-y divide-stone-100">
              {classes.length === 0 ? (
                <div className="p-12 text-center text-stone-500">No classes found</div>
              ) : (
                 classes.map(cls => (
                  <div key={cls.id} className="p-6 hover:bg-white/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100/50 flex items-center justify-center text-indigo-600">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                         <div className="flex items-center gap-2">
                           <h4 className="font-bold text-stone-800 group-hover:text-violet-600 transition-colors">{cls.name}</h4>
                           {cls.code && <span className="text-xs px-2 py-0.5 bg-stone-100 rounded-md text-stone-600 font-medium">{cls.code}</span>}
                         </div>
                         <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
                            {cls.teacher && <span>Teacher: {cls.teacher.name}</span>}
                            {cls.room && <span>Room: {cls.room}</span>}
                         </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-violet-400 transition-colors" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
           <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white/40">
              <h3 className="font-display font-bold text-xl text-stone-800">School Directory</h3>
              {['principal', 'vice_principal'].includes(myRole) && (
                <button 
                  onClick={() => { setFormData({ role: 'student' }); setError(''); setIsInviteModalOpen(true); }}
                  className="flex items-center px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Member
                </button>
              )}
            </div>
            <div className="divide-y divide-stone-100">
               {members.length === 0 ? (
                <div className="p-12 text-center text-stone-500">No members found</div>
              ) : (
                members.map(member => (
                  <div key={member.id} className="p-6 flex items-center justify-between group hover:bg-white/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 overflow-hidden border border-stone-200">
                        {member.user?.avatarUrl ? (
                          <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-stone-800 group-hover:text-violet-600 transition-colors">{member.user?.name || 'Unknown User'}</p>
                        <p className="text-sm text-stone-500 capitalize">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${
                         member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'
                       }`}>
                         {member.status}
                       </span>
                    </div>
                  </div>
                ))
              )}
            </div>
           </div>
        )}

      </div>

      {/* Department Modal */}
      {isDeptModalOpen && (
        <Modal title="Create Department" onClose={() => setIsDeptModalOpen(false)}>
          <form onSubmit={handleCreateDepartment} className="space-y-5">
            <Input label="Department Name" value={formData.name || ''} onChange={(e: any) => setFormData({...formData, name: e.target.value})} required />
            <Input label="Description" value={formData.description || ''} onChange={(e: any) => setFormData({...formData, description: e.target.value})} />
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <SubmitButton isSubmitting={isSubmitting} label="Create Department" />
          </form>
        </Modal>
      )}

      {/* Class Modal */}
      {isClassModalOpen && (
        <Modal title="Create Class" onClose={() => setIsClassModalOpen(false)}>
          <form onSubmit={handleCreateClass} className="space-y-5">
            <Input label="Class Name" value={formData.name || ''} onChange={(e: any) => setFormData({...formData, name: e.target.value})} required />
            <Input label="Class Code" value={formData.code || ''} onChange={(e: any) => setFormData({...formData, code: e.target.value})} placeholder="e.g. CS101" />
            
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Department</label>
              <select 
                value={formData.departmentId || ''} 
                onChange={e => setFormData({...formData, departmentId: e.target.value})}
                className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-800 focus:outline-none focus:border-violet-400 focus:bg-white transition-all font-medium"
              >
                <option value="">No Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <SubmitButton isSubmitting={isSubmitting} label="Create Class" />
          </form>
        </Modal>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <Modal title="Invite Member" onClose={() => setIsInviteModalOpen(false)}>
          <form onSubmit={handleInviteMember} className="space-y-5">
            <Input label="Email Address" type="email" value={formData.email || ''} onChange={(e: any) => setFormData({...formData, email: e.target.value})} required />
            
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Role</label>
              <select 
                value={formData.role || 'student'} 
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-800 focus:outline-none focus:border-violet-400 focus:bg-white transition-all font-medium"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="teaching_assistant">Teaching Assistant</option>
                <option value="dept_head">Department Head</option>
                <option value="vice_principal">Vice Principal</option>
              </select>
            </div>
            
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <SubmitButton isSubmitting={isSubmitting} label="Send Invitation" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// Helper Components
function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/50 relative overflow-hidden">
         {/* Background Blob */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h2 className="text-2xl font-bold text-stone-800">{title}</h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-stone-700 mb-2">{label}</label>
      <input className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-800 focus:outline-none focus:border-violet-400 focus:bg-white transition-all font-medium" {...props} />
    </div>
  );
}

function SubmitButton({ isSubmitting, label }: { isSubmitting: boolean, label: string }) {
  return (
    <div className="pt-4 flex justify-end">
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="px-6 py-3 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors shadow-lg shadow-violet-200 disabled:opacity-50 disabled:shadow-none flex items-center"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {label}
      </button>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: 'violet' | 'pink' | 'indigo' }) {
  const colorMap = {
    violet: 'bg-violet-50 text-violet-600',
    pink: 'bg-pink-50 text-pink-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-sm flex items-center gap-6 group hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      <div className={`w-16 h-16 rounded-2xl ${colorMap[color]} flex items-center justify-center`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-sm font-medium text-stone-500 mb-1">{label}</p>
        <p className="text-3xl font-display font-bold text-stone-800">{value}</p>
      </div>
    </div>
  );
}

function X(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 18 18" />
    </svg>
  );
}
