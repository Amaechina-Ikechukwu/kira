import { motion } from 'framer-motion';
import Mascot from '../components/game/Mascot';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-stone-800">
          Settings
        </h1>
        <p className="text-stone-500 mt-1">Manage your account and preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-800">Profile Settings</h2>
        </div>
        <div className="p-6 space-y-6">
           <div className="flex items-center gap-4">
             <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center shrink-0">
               <Mascot expression="happy" size="sm" />
             </div>
             <div>
               <h3 className="font-medium text-stone-800">Profile Picture</h3>
               <button className="text-sm text-pink-600 font-medium hover:text-pink-700">Change photo</button>
             </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
