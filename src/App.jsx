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
import { X } from 'lucide-react'

const CURRENT_SOFTWARE_VERSION = '1.0.0'; 

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
  const [dataError, setDataError] = useState(null)
  const [todayLogs, setTodayLogs] = useState([])
  const [loadingTodayLogs, setLoadingTodayLogs] = useState(false)
  const [mode, setMode] = useState('dashboard') 
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [hasSaved, setHasSaved] = useState(false)
  const [isMaintenance, setIsMaintenance] = useState(false)
  const ADMIN_EMAIL = 'hemmings.nacho@gmail.com' 

  const currentHabit = habits[currentIndex]

  useEffect(() => {
    const handleVersionCheck = (dbVersion) => {
      if (dbVersion && dbVersion !== CURRENT_SOFTWARE_VERSION) {
        if (session?.user?.email === ADMIN_EMAIL) return;
        window.location.reload(true);
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

      const subscription = supabase
        .channel('settings_realtime')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, (payload) => {
          if (payload.new.key === 'maintenance_mode') {
            setIsMaintenance(payload.new.value === 'true' || payload.new.value === true);
          }
          if (payload.new.key === 'app_version') {
            handleVersionCheck(payload.new.value);
          }
        })
        .subscribe();
      return () => subscription.unsubscribe();
    };
    initSettings();
  }, [session]);

  const fetchTodayLogs = useCallback(async () => {
    if (!session) return
    setLoadingTodayLogs(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', session.user.id).gte('created_at', `${today}T00:00:00.000Z`).lte('created_at', `${today}T23:59:59.999Z`)
    setTodayLogs(data || [])
    setLoadingTodayLogs(false)
  }, [session])

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data?.session ?? null)
      setLoadingSession(false)
    }
    initSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    const fetchHabits = async () => {
      setLoadingHabits(true)
      // MODIFICACIÓN CRUCIAL: Ahora filtramos explícitamente por TU id de usuario
      const { data } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .eq('user_id', session.user.id) // Solo tus hábitos
      
      if (data) setHabits(data.map((h, i) => ({ ...h, icon: h.icon || getDefaultIconForTitle(h.title, i), color: h.color || getDefaultColorForIndex(i) })))
      setLoadingHabits(false)
    }
    fetchHabits()
  }, [session])

  useEffect(() => { if (session) fetchTodayLogs() }, [session, habits, fetchTodayLogs])

  if (loadingSession) return <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-neutral-300 font-light italic">Cargando MiVida...</div>
  if (isMaintenance && session?.user?.email !== ADMIN_EMAIL) return <MaintenanceScreen />
  if (!session) return <><TopBanner /><Auth /></>
  if (mode === 'admin') return <AdminPanel onClose={() => setMode('dashboard')} version={CURRENT_SOFTWARE_VERSION} />

  if (mode === 'dashboard') {
    return (
      <>
        <TopBanner />
        <Dashboard
          user={session.user} habits={habits} todayLogs={todayLogs}
          onStartReview={() => setMode('reviewing')} onResetToday={() => window.location.reload()}
          version={CURRENT_SOFTWARE_VERSION} onOpenAdmin={() => setMode('admin')}
        />
        <ReminderPopup session={session} />
      </>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${swipeStatus === 'done' ? 'bg-emerald-900' : swipeStatus === 'not-done' ? 'bg-red-900' : 'bg-neutral-900'} transition-colors duration-300 relative`}>
      <button onClick={() => window.location.reload()} className="fixed top-6 right-6 z-[100] flex items-center gap-1 px-4 py-2 bg-neutral-800/80 backdrop-blur-md border border-neutral-700 rounded-full text-neutral-400 hover:text-white transition-all shadow-lg">
        <X size={18} /> <span className="text-xs font-medium uppercase tracking-widest">Salir</span>
      </button>
      <div className="w-full max-w-md mx-auto px-4 py-8 text-white">
        {currentHabit ? <SwipeCard habit={currentHabit} onSwipeComplete={(d) => { if (d === 'right') { setResults(p => [...p, { id: currentHabit.id, title: currentHabit.title, status: 'completed' }]); setCurrentIndex(c => c + 1); } else { setPendingHabit(currentHabit); setIsModalOpen(true); } }} onDrag={(x) => setSwipeStatus(x > 100 ? 'done' : x < -100 ? 'not-done' : null)} /> : <div className="text-center">Resumen completado. <button onClick={() => setMode('dashboard')} className="mt-6 w-full py-4 bg-white text-black font-bold rounded-2xl">Volver</button></div>}
      </div>
      <NoteModal isOpen={isModalOpen} habitTitle={pendingHabit?.title} onSave={(n) => { setResults(p => [...p, { id: pendingHabit.id, title: pendingHabit.title, status: 'skipped', note: n || '' }]); setIsModalOpen(false); setCurrentIndex(c => c + 1); }} onSkip={() => { setResults(p => [...p, { id: pendingHabit.id, title: pendingHabit.title, status: 'skipped', note: '' }]); setIsModalOpen(false); setCurrentIndex(c => c + 1); }} />
    </div>
  )
}

export default App