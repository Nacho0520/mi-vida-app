import { useState, useEffect } from "react";
import { Check, X, Circle, Menu, Plus, Trash2, Settings, Star, Flame } from "lucide-react";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";
import ProfileModal from "./ProfileModal";
import HabitCreator from "./HabitCreator";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext"; // Importar hook

function CircularProgress({ percentage }) {
  const { t } = useLanguage();
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="none" className="text-neutral-800" />
        <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-emerald-500 transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold text-white tracking-tighter">{Math.round(percentage)}%</p>
        <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest mt-1">{t('today_caps')}</p>
      </div>
    </div>
  );
}

function Dashboard({ user, habits, todayLogs, onStartReview, onResetToday, version, onOpenAdmin }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isCreatorOpen, setCreatorOpen] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [hardDayEnabled, setHardDayEnabled] = useState(() => {
    try {
      return localStorage.getItem("mivida_hard_day_enabled") === "true";
    } catch {
      return false;
    }
  });
  const [hardDayIds, setHardDayIds] = useState(() => {
    try {
      const raw = localStorage.getItem("mivida_hard_day_ids");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  
  const { t } = useLanguage(); // Hook
  const MAX_HARD_DAY = 3;

  const logsMap = new Map();
  (todayLogs || []).forEach(l => logsMap.set(l.habit_id, { status: l.status, logId: l.id }));

  const completed = (habits || []).filter(h => logsMap.get(h.id)?.status === "completed").length;
  const percentage = habits?.length > 0 ? (completed / habits.length) * 100 : 0;

  useEffect(() => {
    try {
      localStorage.setItem("mivida_hard_day_enabled", String(hardDayEnabled));
    } catch {
      // No-op: entorno sin localStorage
    }
  }, [hardDayEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem("mivida_hard_day_ids", JSON.stringify(hardDayIds));
    } catch {
      // No-op: entorno sin localStorage
    }
  }, [hardDayIds]);

  useEffect(() => {
    const validIds = new Set((habits || []).map(h => h.id));
    const filtered = (hardDayIds || []).filter(id => validIds.has(id));
    if (filtered.length !== hardDayIds.length) setHardDayIds(filtered);
  }, [habits, hardDayIds]);

  const toggleHardDayHabit = (habitId) => {
    setHardDayIds((prev) => {
      if (prev.includes(habitId)) return prev.filter(id => id !== habitId);
      if (prev.length >= MAX_HARD_DAY) return prev;
      return [...prev, habitId];
    });
  };

  const shouldFilterHabits = hardDayEnabled && hardDayIds.length > 0;
  const visibleHabits = shouldFilterHabits ? (habits || []).filter(h => hardDayIds.includes(h.id)) : (habits || []);

  return (
    <div className="app-screen bg-neutral-900 px-4 relative">
      {!isSidebarOpen && !isCreatorOpen && !editHabit && !isSettingsOpen && !isProfileOpen && (
        <button onClick={() => setSidebarOpen(true)} className="absolute top-6 left-4 text-white p-2 hover:bg-neutral-800 rounded-full transition-colors z-[100]">
          <Menu size={28} />
        </button>
      )}

      <Sidebar 
        isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} user={user} 
        onLogout={() => supabase.auth.signOut().then(() => window.location.reload())} 
        onOpenSettings={() => setSettingsOpen(true)} version={version}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenAdmin={onOpenAdmin} 
      />
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} user={user} appVersion={version} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} user={user} />
      <HabitCreator isOpen={isCreatorOpen || !!editHabit} onClose={() => { setCreatorOpen(false); setEditHabit(null); }} userId={user?.id} habitToEdit={editHabit} onHabitCreated={() => window.location.reload()} />

      <div className="mx-auto w-full max-w-md mt-6">
        <header className="mb-10 text-center">
          <h2 className="text-lg font-light text-neutral-500 italic">{t('hello')}</h2>
          <h1 className="text-3xl font-black text-white tracking-tight capitalize leading-none">{user?.user_metadata?.full_name || 'Usuario'}</h1>
        </header>

        <div className="mb-8 flex items-center justify-between radius-card border border-neutral-800/60 bg-neutral-900/40 px-4 py-3 shadow-apple-soft">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center">
              <Flame className="text-neutral-400" size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-200">{t('hard_day_title')}</p>
              <p className="text-[11px] text-neutral-500">{t('hard_day_desc')}</p>
            </div>
          </div>
          <button
            onClick={() => setHardDayEnabled(!hardDayEnabled)}
            className={`h-8 w-14 rounded-full transition-all relative ${hardDayEnabled ? 'bg-neutral-200' : 'bg-neutral-700'}`}
            aria-pressed={hardDayEnabled}
          >
            <div className={`absolute top-1 h-6 w-6 rounded-full transition-all ${hardDayEnabled ? 'left-7 bg-neutral-900' : 'left-1 bg-neutral-200'}`} />
          </button>
        </div>
        {hardDayEnabled && (
          <div className="mb-6 flex items-center justify-between text-[11px] text-neutral-500">
            <span>{t('hard_day_help')}</span>
            <span className="font-semibold text-neutral-400">{t('hard_day_selected')} {hardDayIds.length}/{MAX_HARD_DAY}</span>
          </div>
        )}
        {hardDayEnabled && hardDayIds.length === 0 && (
          <p className="mb-6 text-[11px] text-neutral-600">{t('hard_day_empty')}</p>
        )}

        <div className="mb-10 flex justify-center"><CircularProgress percentage={percentage} /></div>

        {visibleHabits.length === 0 ? (
          <div className="radius-card border border-white/5 bg-neutral-800/30 p-6 text-center text-neutral-400 shadow-apple-soft">
            <p className="text-body font-medium">{t('no_habits_today')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleHabits.map((habit) => {
              const log = logsMap.get(habit.id);
              const isCritical = hardDayIds.includes(habit.id);
              return (
                <div key={habit.id} className="group flex items-center gap-3 radius-card border border-white/5 bg-neutral-800/30 p-4 backdrop-blur-md transition-all shadow-apple-soft">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${habit.color} shadow-inner flex-shrink-0`}>
                    <span className="text-2xl">{habit.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate text-base tracking-tight">{habit.title}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity pr-2">
                    {hardDayEnabled && (
                      <button
                        onClick={() => toggleHardDayHabit(habit.id)}
                        className={`p-2 rounded-lg transition-colors ${isCritical ? 'text-neutral-200' : 'text-neutral-600 hover:text-neutral-300'}`}
                        title={t('hard_day_title')}
                      >
                        <Star size={18} fill={isCritical ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    <button onClick={() => setEditHabit(habit)} className="p-2 text-neutral-400 hover:text-blue-400 rounded-lg"><Settings size={18} /></button>
                    <button onClick={async () => { if(confirm(t('confirm_delete'))){ await supabase.from('daily_logs').delete().eq('habit_id', habit.id); await supabase.from('habits').delete().eq('id', habit.id); window.location.reload(); }}} className="p-2 text-neutral-400 hover:text-red-500 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                  <div className="flex-shrink-0 ml-1">
                    {log ? (
                      <button onClick={async () => { await supabase.from('daily_logs').delete().eq('id', log.logId); window.location.reload(); }} className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-75 bg-white/10 shadow-lg">
                        {log.status === "completed" ? <Check className="h-6 w-6 text-emerald-500" /> : <X className="h-6 w-6 text-red-500" />}
                      </button>
                    ) : <Circle className="h-6 w-6 text-neutral-700" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(habits || []).some(h => !logsMap.has(h.id)) && (
          <button onClick={onStartReview} className="mt-8 w-full rounded-[2rem] bg-white px-6 py-5 text-lg font-black text-black shadow-2xl active:scale-95 transition-all">{t('start_review')}</button>
        )}
      </div>

      <button onClick={() => setCreatorOpen(true)} className="fixed bottom-32 right-6 h-16 w-16 bg-white text-black rounded-[1.5rem] shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40">
        <Plus size={36} strokeWidth={3} />
      </button>
    </div>
  );
}

export default Dashboard;