import { useState, useEffect } from 'react';
import { Plus, Search, Building2, MapPin, Users, GraduationCap, X, Loader2, School as SchoolIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Mascot from '../../components/game/Mascot';
import Select from '../../components/ui/Select';

interface School {
  id: string;
  name: string;
  type: string;
  city?: string;
  logoUrl?: string;
  myRole?: string;
  myStatus?: string;
  stats?: {
    members: number;
    departments: number;
    classes: number;
  };
}

export default function SchoolsListPage() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create School Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'school',
    city: '',
    country: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/schools');
      if (res.ok) {
        const data = await res.json();
        setSchools(data.schools || []);
      }
    } catch (err) {
      console.error('Failed to fetch schools', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create school');
      }

      await fetchSchools(); // Refresh list
      setIsModalOpen(false);
      setFormData({ name: '', type: 'school', city: '', country: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600">
              My Schools
            </h1>
            <Mascot expression="happy" size="sm" />
          </div>
          <p className="text-lg text-stone-500 font-medium max-w-2xl">
            Manage your educational centers and access school-specific tools.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group relative flex items-center justify-center px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Plus className="w-5 h-5 mr-2" />
          <span>Create School</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-violet-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-4 bg-white/60 backdrop-blur-xl border-2 border-violet-100 rounded-2xl text-stone-700 placeholder-violet-300 focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100/50 transition-all duration-300 shadow-sm"
          placeholder="Search for a school..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="text-center py-20 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm">
          <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-violet-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
            <SchoolIcon className="w-10 h-10 text-violet-500" />
          </div>
          <h3 className="text-2xl font-bold text-stone-700 mb-2">No schools found</h3>
          <p className="text-stone-500 max-w-md mx-auto mb-8">
            You are not a member of any schools yet. Create your first school to get started.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-white text-violet-600 font-bold rounded-xl shadow-sm border border-violet-100 hover:bg-violet-50 transition-colors"
          >
            Create Your First School
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => (
            <div 
              key={school.id}
              onClick={() => navigate(`/schools/${school.id}`)}
              className="group cursor-pointer bg-white/70 backdrop-blur-md rounded-3xl border border-white/50 p-6 hover:border-violet-300 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Card Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-transparent to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-bold text-2xl shadow-inner border border-white/50">
                    {school.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className={`
                    px-3 py-1 text-xs font-bold rounded-full capitalize border
                    ${school.myRole === 'principal' 
                      ? 'bg-amber-100 text-amber-700 border-amber-200' 
                      : 'bg-blue-100 text-blue-700 border-blue-200'}
                  `}>
                    {school.myRole?.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-stone-800 mb-2 group-hover:text-violet-700 transition-colors">
                  {school.name}
                </h3>

                <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-stone-500">
                      <Building2 className="w-4 h-4 mr-2 text-violet-400" />
                      <span className="capitalize">{school.type.replace('_', ' ')}</span>
                    </div>
                    {school.city && (
                      <div className="flex items-center text-sm text-stone-500">
                        <MapPin className="w-4 h-4 mr-2 text-pink-400" />
                        {school.city}
                      </div>
                    )}
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-between items-center text-sm font-semibold text-violet-600">
                  <span>View Dashboard</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal - New Aesthetic */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/50 relative overflow-hidden">
            {/* Background Blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="text-2xl font-bold text-stone-800">Create New School</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSchool} className="space-y-5 relative z-10">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-800 focus:outline-none focus:border-violet-400 focus:bg-white transition-all font-medium"
                  placeholder="e.g. Springfield High"
                />
              </div>

              <div>
                <Select
                  label="Type"
                  value={formData.type}
                  onChange={(val) => setFormData({ ...formData, type: val })}
                  options={[
                    { value: 'school', label: 'School' },
                    { value: 'university', label: 'University' },
                    { value: 'academy', label: 'Academy' },
                    { value: 'learning_center', label: 'Learning Center' },
                    { value: 'training_center', label: 'Training Center' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-800 focus:outline-none focus:border-violet-400 focus:bg-white transition-all font-medium"
                    placeholder="e.g. New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-800 focus:outline-none focus:border-violet-400 focus:bg-white transition-all font-medium"
                    placeholder="e.g. USA"
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 text-sm font-bold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors shadow-lg shadow-violet-200 disabled:opacity-50 disabled:shadow-none flex items-center"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// End of file
