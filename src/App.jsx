import { useEffect, useState, useCallback } from 'react'
import SwipeCard from './components/SwipeCard'
import NoteModal from './components/NoteModal'
import Dashboard from './components/Dashboard'
import Auth from './components/Auth'
import { supabase } from './lib/supabaseClient'
import ReminderPopup from './components/ReminderPopup'
import TopBanner from './components/TopBanner'
import MaintenanceScreen from './components/MaintenanceScreen'
import AdminPanel from './components/AdminPanel' 
import Tutorial from './components/Tutorial'
import Dock from './components/Dock' 
import { X, BarChart3, LayoutGrid } from 'lucide-react' 
import Stats from './components/Stats'
import { useLanguage } from './context/LanguageContext' 

const CURRENT_SOFTWARE_VERSION = '1.0.12'; 

function getDefaultIconForTitle(title = '', index) {
  const mapping = ['📖', '💧', '🧘', '💤', '🍎', '💪', '📝', '🚶']
  const lower = title.toLowerCase()
  if (lower.includes('leer') || lower.includes('lectura')) return '📖'
  if (lower.includes('agua')) return '💧'
  if (lower.includes('meditar') || lower.includes('respir')) return '🧘'
  if (lower.includes('dormir') || lower.includes('pantalla')) return '💤'
  if (lower.includes('comer') || lower.includes('dieta')) return '🍎'
  if (lower.includes('ejercicio') || lower.includes('flexion') || lower.includes('correr')) return '💪'
  return mapping[index % mapping.length]
}

function getDefaultColorForIndex(index) {
  const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-amber-500']
  return colors[index % colors.length]
}

function App() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [swipeStatus, setSwipeStatus] = useState(null)
  const [results, setResults] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingHabit, setPendingHabit] = useState(null)
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [habits, setHabits] = useState([])
  const [loadingHabits, setLoadingHabits] = useState(false)
  const [todayLogs, setTodayLogs] = useState([])
  const [loadingTodayLogs, setLoadingTodayLogs] = useState(false)
  const [mode, setMode] = useState('dashboard') 
  const [activeTab, setActiveTab] = useState('home') 
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [hasSaved, setHasSaved] = useState(false)
  const [isMaintenance, setIsMaintenance] = useState(false)
  const ADMIN_EMAIL = 'hemmings.nacho@gmail.com' 
  
  const { t } = useLanguage()

  const currentHabit = habits[currentIndex]

  useEffect(() => {
    const handleVersionCheck = (dbVersion) => {
      if (dbVersion && dbVersion !== CURRENT_SOFTWARE_VERSION) {
        if (session?.user?.email === ADMIN_EMAIL) return;
        const lastReloadAttempt = localStorage.getItem('last_version_reload');
        if (lastReloadAttempt === dbVersion) return;
        localStorage.setItem('last_version_reload', dbVersion);
        window.location.reload(true);
      } else if (dbVersion === CURRENT_SOFTWARE_VERSION) {
        localStorage.removeItem('last_version_reload');
      }
    };
    const initSettings = async () => {
      const { data } = await supabase.from('app_settings').select('key, value');
      if (data) {
        const maint = data.find(s => s.key === 'maintenance_mode');
        const vers = data.find(s => s.key === 'app_version');
        if (maint) setIsMaintenance(maint.value === 'true' || maint.value === true);
        if (vers) handleVersionCheck(vers.value);
      }
      const subscription = supabase.channel('settings_realtime').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, (payload) => {
          if (payload.new.key === 'maintenance_mode') setIsMaintenance(payload.new.value === 'true' || payload.new.value === true);
          if (payload.new.key === 'app_version') handleVersionCheck(payload.new.value);
        }).subscribe();
      return () => subscription.unsubscribe();
    };
    if (!loadingSession) initSettings();
  }, [session, loadingSession]);

  const handleFinishTutorial = async () => {
    await supabase.auth.updateUser({ data: { has_finished_tutorial: true } });
    setMode('dashboard');
  };

  const getTodayDateString = () => new Date().toISOString().split('T')[0]

  const fetchTodayLogs = useCallback(async () => {
    if (!session) return
    setLoadingTodayLogs(true)
    const today = getTodayDateString()
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', session.user.id).gte('created_at', `${today}T00:00:00.000Z`).lte('created_at', `${today}T23:59:59.999Z`)
    setTodayLogs(data || [])
    setLoadingTodayLogs(false)
  }, [session])

  const handleResetToday = async () => {
    if (!session) return
    const today = getTodayDateString()
    const { error } = await supabase.from('daily_logs').delete().eq('user_id', session.user.id).gte('created_at', `${today}T00:00:00.000Z`).lte('created_at', `${today}T23:59:59.999Z`)
    if (!error) { await fetchTodayLogs(); setMode('dashboard'); }
  }

  const handleStartReview = () => {
    setMode('reviewing'); setCurrentIndex(0); setResults([]); setHasSaved(false); setSaveError(null); setSaveSuccess(null);
  }

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession()
      const currentSession = data?.session ?? null
      setSession(currentSession)
      if (currentSession && !currentSession.user.user_metadata?.has_finished_tutorial) setMode('tutorial')
      setLoadingSession(false)
    }
    initSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession && !newSession.user.user_metadata?.has_finished_tutorial) setMode('tutorial')
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || mode === 'tutorial') return
    const fetchHabits = async () => {
      setLoadingHabits(true)
      const { data } = await supabase.from('habits').select('*').eq('is_active', true).eq('user_id', session.user.id)
      if (data) setHabits(data.map((h, i) => ({ ...h, icon: h.icon || getDefaultIconForTitle(h.title, i), color: h.color || getDefaultColorForIndex(i) })))
      setLoadingHabits(false)
    }
    fetchHabits()
  }, [session, mode])

  useEffect(() => { if (session && mode !== 'tutorial') fetchTodayLogs() }, [session, habits, fetchTodayLogs, mode])

  useEffect(() => {
    if (!session || !habits.length || mode !== 'reviewing' || currentIndex < habits.length || !results.length || hasSaved || saving) return
    const saveResults = async () => {
      setSaving(true); setSaveError(null);
      const payload = results.map(i => ({ user_id: session.user.id, habit_id: i.id, status: i.status, note: i.note || null, created_at: new Date().toISOString() }))
      const { error } = await supabase.from('daily_logs').insert(payload)
      if (!error) { setSaveSuccess(t('saved_success')); setHasSaved(true); setTimeout(() => { fetchTodayLogs(); setMode('dashboard'); }, 1500); } 
      else { setSaveError(error.message) }
      setSaving(false)
    }
    saveResults()
  }, [session, habits, currentIndex, results, hasSaved, saving, mode])

  if (loadingSession) return <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white font-black italic tracking-tighter">MIVIDA...</div>
  if (isMaintenance && session?.user?.email !== ADMIN_EMAIL) return <MaintenanceScreen />
  
  if (!session) return <><Auth /></>

  if (mode === 'tutorial') return <Tutorial user={session.user} onComplete={handleFinishTutorial} />
  if (mode === 'admin') return <AdminPanel onClose={() => setMode('dashboard')} version={CURRENT_SOFTWARE_VERSION} />

  if (mode === 'dashboard') {
    return (
      <div className="relative min-h-screen bg-neutral-900 overflow-x-hidden flex flex-col">
        {/* TopBanner renderizado como bloque flexible, no flotante */}
        <TopBanner />
        
        <div className="flex-1 flex flex-col">
          {activeTab === 'home' ? (
            <Dashboard
              user={session.user} habits={habits} todayLogs={todayLogs}
              onStartReview={handleStartReview} onResetToday={handleResetToday}
              version={CURRENT_SOFTWARE_VERSION} onOpenAdmin={() => setMode('admin')}
            />
          ) : activeTab === 'stats' ? (
            <Stats user={session.user} /> 
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-white p-6 text-center">
              <div className="bg-blue-500/10 p-6 rounded-[2.5rem] border border-blue-500/20 mb-6">
                <LayoutGrid size={48} className="text-blue-500" />
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tighter uppercase leading-none">{t('more_title')}</h2>
              <p className="text-neutral-500 font-medium italic max-w-xs">{t('more_subtitle')}</p>
            </div>
          )}
        </div>

        <Dock activeTab={activeTab} onTabChange={setActiveTab} />
        <ReminderPopup session={session} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${swipeStatus === 'done' ? 'bg-emerald-900' : swipeStatus === 'not-done' ? 'bg-red-900' : 'bg-neutral-900'} transition-colors duration-300 relative`}>
      <button onClick={() => window.location.reload()} className="fixed top-6 right-6 z-[100] flex items-center gap-1 px-4 py-2 bg-neutral-800/80 backdrop-blur-md border border-neutral-700 rounded-full text-neutral-400 hover:text-white transition-all shadow-lg">
        <X size={18} /> <span className="text-xs font-medium uppercase tracking-widest">{t('exit')}</span>
      </button>
      <div className="w-full max-md mx-auto px-4 py-8 text-white">
        <h1 className="mb-2 text-center text-2xl font-semibold">{t('review_night')}</h1>
        {currentHabit ? (
          <SwipeCard 
            habit={currentHabit} 
            onSwipeComplete={(d) => { if (d === 'right') { setResults(p => [...p, { id: currentHabit.id, title: currentHabit.title, status: 'completed' }]); setCurrentIndex(c => c + 1); } else { setPendingHabit(currentHabit); setIsModalOpen(true); } }} 
            onDrag={(x) => setSwipeStatus(x > 100 ? 'done' : x < -100 ? 'not-done' : null)} 
          />
        ) : (
          <div className="rounded-2xl bg-neutral-800 p-6 text-center">
            <p className="text-xl font-bold mb-2">{t('review_completed')}</p>
            {saving && <p className="text-sm text-neutral-400">{t('saving')}</p>}
            {saveSuccess && <p className="text-sm text-emerald-400">{t('saved_success')}</p>}
            <button onClick={() => setMode('dashboard')} className="mt-6 w-full py-4 bg-white text-black font-bold rounded-2xl active:scale-95 transition-all">{t('back_dashboard')}</button>
          </div>
        )}
      </div>
      <NoteModal isOpen={isModalOpen} habitTitle={pendingHabit?.title} onSave={(n) => { setResults(p => [...p, { id: pendingHabit.id, title: pendingHabit.title, status: 'skipped', note: n || '' }]); setIsModalOpen(false); setCurrentIndex(c => c + 1); }} onSkip={() => { setResults(p => [...p, { id: pendingHabit.id, title: pendingHabit.title, status: 'skipped', note: '' }]); setIsModalOpen(false); setCurrentIndex(c => c + 1); }} />
    </div>
  )
}

export default App