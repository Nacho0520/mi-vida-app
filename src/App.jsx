import { useEffect, useState, useCallback, useMemo } from 'react'
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
import ProgressComparison from './components/ProgressComparison'
import BlockedScreen from './components/BlockedScreen'
import { useLanguage } from './context/LanguageContext' 

const CURRENT_SOFTWARE_VERSION = '1.1.5'; 

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

function getTodayFrequencyCode() {
  const day = new Date().getDay()
  const map = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  return map[day]
}

function normalizeFrequency(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    return value.replace(/[{}]/g, '').split(',').map(v => v.trim()).filter(Boolean)
  }
  return []
}

function normalizeMiniHabits(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (!item) return null
        if (typeof item === 'string') {
          try {
            const parsed = JSON.parse(item)
            if (parsed && typeof parsed === 'object') {
              const title = parsed.title || parsed.name || ''
              if (!title) return null
              return {
                title,
                icon: parsed.icon || getDefaultIconForTitle(title, index),
                color: parsed.color || getDefaultColorForIndex(index)
              }
            }
          } catch {
            // Keep as plain string
          }
          return {
            title: item,
            icon: getDefaultIconForTitle(item, index),
            color: getDefaultColorForIndex(index)
          }
        }
        if (typeof item === 'object') {
          const title = item.title || item.name || ''
          if (!title) return null
          return {
            title,
            icon: item.icon || getDefaultIconForTitle(title, index),
            color: item.color || getDefaultColorForIndex(index)
          }
        }
        return null
      })
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return normalizeMiniHabits(parsed)
    } catch {
      // Fallback to comma-separated strings
    }
    return value
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map((raw, index) => {
        try {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            const title = parsed.title || parsed.name || ''
            if (!title) return null
            return {
              title,
              icon: parsed.icon || getDefaultIconForTitle(title, index),
              color: parsed.color || getDefaultColorForIndex(index)
            }
          }
        } catch {
          // Use raw string
        }
        return {
          title: raw,
          icon: getDefaultIconForTitle(raw, index),
          color: getDefaultColorForIndex(index)
        }
      })
      .filter(Boolean)
  }
  return []
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
  const [todayLogs, setTodayLogs] = useState([])
  const [mode, setMode] = useState('dashboard') 
  const [activeTab, setActiveTab] = useState('home') 
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [hasSaved, setHasSaved] = useState(false)
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const AUTO_UPDATE_DELAY_MS = 8000
  const ADMIN_EMAIL = 'hemmings.nacho@gmail.com' 
  
  const { t } = useLanguage()

  const reviewHabits = useMemo(() => {
    try {
      const hardDayEnabled = localStorage.getItem('mivida_hard_day_enabled') === 'true'
      if (!hardDayEnabled) return habits
      const rawIds = localStorage.getItem('mivida_hard_day_ids')
      const hardDayIds = rawIds ? JSON.parse(rawIds) : []
      if (!Array.isArray(hardDayIds) || hardDayIds.length === 0) return habits
      const allowed = new Set(hardDayIds)
      return habits.filter(h => allowed.has(h.id))
    } catch {
      return habits
    }
  }, [habits])

  const currentHabit = reviewHabits[currentIndex]

  useEffect(() => {
    const handleVersionCheck = (dbVersion) => {
      if (dbVersion && dbVersion !== CURRENT_SOFTWARE_VERSION) {
        setUpdateAvailable(true);
        return;
      }
      setUpdateAvailable(false);
      if (dbVersion === CURRENT_SOFTWARE_VERSION) {
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
      const { data: textSettings } = await supabase
        .from('app_settings_text')
        .select('value')
        .eq('key', 'maintenance_message')
        .single();
      if (textSettings?.value) setMaintenanceMessage(textSettings.value);
      const subscription = supabase.channel('settings_realtime').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, (payload) => {
          if (payload.new.key === 'maintenance_mode') setIsMaintenance(payload.new.value === 'true' || payload.new.value === true);
          if (payload.new.key === 'app_version') handleVersionCheck(payload.new.value);
        }).subscribe();
      return () => subscription.unsubscribe();
    };
    if (!loadingSession) initSettings();
  }, [session, loadingSession]);

  useEffect(() => {
    if (!updateAvailable) return
    const timer = setTimeout(() => {
      window.location.reload()
    }, AUTO_UPDATE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [updateAvailable, AUTO_UPDATE_DELAY_MS])

  const handleFinishTutorial = async () => {
    await supabase.auth.updateUser({ data: { has_finished_tutorial: true } });
    setMode('dashboard');
  };

  const getTodayDateString = () => new Date().toISOString().split('T')[0]

  const fetchTodayLogs = useCallback(async () => {
    if (!session) return
    const today = getTodayDateString()
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', session.user.id).gte('created_at', `${today}T00:00:00.000Z`).lte('created_at', `${today}T23:59:59.999Z`)
    setTodayLogs(data || [])
  }, [session])

  const handleResetToday = async () => {
    if (!session) return
    const today = getTodayDateString()
    const { error } = await supabase.from('daily_logs').delete().eq('user_id', session.user.id).gte('created_at', `${today}T00:00:00.000Z`).lte('created_at', `${today}T23:59:59.999Z`)
    if (!error) { await fetchTodayLogs(); setMode('dashboard'); }
  }

  const handleStartReview = () => {
    setMode('reviewing'); setCurrentIndex(0); setResults([]); setHasSaved(false); setSaveSuccess(null);
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
    if (!session) return
    const updateProfileState = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('is_blocked')
        .eq('user_id', session.user.id)
        .single()
      setIsBlocked(Boolean(data?.is_blocked))
      await supabase
        .from('user_profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', session.user.id)
    }
    updateProfileState()
  }, [session])

  useEffect(() => {
    if (!session || !isMaintenance) return
    const checkWhitelist = async () => {
      const { data } = await supabase.rpc('is_maintenance_whitelisted', { p_email: session.user.email })
      setIsWhitelisted(Boolean(data))
    }
    checkWhitelist()
  }, [session, isMaintenance])

  useEffect(() => {
    if (!session || mode === 'tutorial') return
    const fetchHabits = async () => {
      const { data } = await supabase.from('habits').select('*').eq('is_active', true).eq('user_id', session.user.id)
      if (data) {
        const todayCode = getTodayFrequencyCode()
        const filtered = data.filter((habit) => {
          const freq = normalizeFrequency(habit.frequency)
          if (!freq || freq.length === 0) return true
          return freq.includes(todayCode)
        })
        setHabits(filtered.map((h, i) => ({
          ...h,
          icon: h.icon || getDefaultIconForTitle(h.title, i),
          color: h.color || getDefaultColorForIndex(i),
          mini_habits: normalizeMiniHabits(h.mini_habits)
        })))
      }
    }
    fetchHabits()
  }, [session, mode])

  useEffect(() => {
    if (session && mode !== 'tutorial') {
      queueMicrotask(() => fetchTodayLogs())
    }
  }, [session, habits, fetchTodayLogs, mode])

  useEffect(() => {
    if (!session || !reviewHabits.length || mode !== 'reviewing' || currentIndex < reviewHabits.length || !results.length || hasSaved || saving) return
    const saveResults = async () => {
      setSaving(true);
      const payload = results.map(i => ({ user_id: session.user.id, habit_id: i.id, status: i.status, note: i.note || null, created_at: new Date().toISOString() }))
      const { error } = await supabase.from('daily_logs').insert(payload)
      if (!error) { setSaveSuccess(t('saved_success')); setHasSaved(true); setTimeout(() => { fetchTodayLogs(); setMode('dashboard'); }, 1500); } 
      else { console.error('Error guardando logs:', error.message) }
      setSaving(false)
    }
    saveResults()
  }, [session, reviewHabits, currentIndex, results, hasSaved, saving, mode, fetchTodayLogs, t])

  if (loadingSession) return <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white font-black italic tracking-tighter">MIVIDA...</div>
  if (isMaintenance && session?.user?.email !== ADMIN_EMAIL && !isWhitelisted) return <MaintenanceScreen message={maintenanceMessage} />
  
  if (!session) return <><Auth /></>
  if (isBlocked && session?.user?.email !== ADMIN_EMAIL) {
    return <BlockedScreen title={t('blocked_title')} message={t('blocked_desc')} />
  }

  if (mode === 'tutorial') return <Tutorial user={session.user} onComplete={handleFinishTutorial} />
  if (mode === 'admin') return <AdminPanel onClose={() => setMode('dashboard')} version={CURRENT_SOFTWARE_VERSION} />

  if (mode === 'dashboard') {
    return (
      <div className="relative min-h-screen bg-neutral-900 overflow-x-hidden flex flex-col">
        {/* TopBanner renderizado como bloque flexible, no flotante */}
        <TopBanner />
        {updateAvailable && (
          <div className="px-4 pt-4">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-white/5 bg-neutral-900/70 px-4 py-3 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-200">{t('update_title')}</p>
                  <p className="text-[11px] text-neutral-500">{t('update_desc')}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-neutral-200 active:scale-95 transition"
                >
                  {t('update_cta')}
                </button>
              </div>
            </div>
          </div>
        )}
        
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
              <div className="w-full max-w-md space-y-6">
                <ProgressComparison user={session.user} />
                <div className="bg-neutral-800/30 p-6 radius-card border border-white/5 shadow-apple-soft">
                  <LayoutGrid size={40} className="text-neutral-500 mx-auto mb-3" />
                  <h2 className="text-2xl font-black mb-1 tracking-tighter uppercase leading-none">{t('more_title')}</h2>
                  <p className="text-neutral-500 font-medium italic">{t('more_subtitle')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Dock activeTab={activeTab} onTabChange={setActiveTab} />
        <ReminderPopup session={session} />
      </div>
    )
  }

  return (
    <div className={`app-screen flex items-center justify-center ${swipeStatus === 'done' ? 'bg-emerald-900' : swipeStatus === 'not-done' ? 'bg-red-900' : 'bg-neutral-900'} transition-colors duration-300 relative`}>
      <button onClick={() => window.location.reload()} className="fixed top-6 right-6 z-[100] flex items-center gap-1 px-4 py-2 bg-neutral-800/80 backdrop-blur-md border border-white/5 rounded-full text-neutral-400 hover:text-white transition-all shadow-lg">
        <X size={18} /> <span className="text-xs font-medium uppercase tracking-widest">{t('exit')}</span>
      </button>
      <div className="w-full max-md mx-auto px-4 py-6 text-white">
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