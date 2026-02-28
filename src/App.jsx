import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import SwipeCard from './components/SwipeCard'
import NoteModal from './components/NoteModal'
import Dashboard from './components/Dashboard'
import Auth from './components/Auth'
import LandingPage from './components/LandingPage'
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
import UpdateShowcase from './components/UpdateShowcase'
import MoreFeatures from './components/MoreFeatures'
import FutureLettersSection from './components/FutureLettersSection'
import FeedbackSection from './components/FeedbackSection'
import CommunityHub from './components/CommunityHub'
import History from './components/History'
import ProModal from './components/ProModal'
import { useLanguage } from './context/LanguageContext' 

const CURRENT_SOFTWARE_VERSION = '1.1.40'; 

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

function parseAnnouncementMessage(raw, language) {
  if (!raw) return { update: null }
  try {
    const parsed = JSON.parse(raw)
    const langPayload = parsed[language] || parsed['es'] || null
    if (langPayload && typeof langPayload === 'object') {
      return { update: langPayload.update || null }
    }
  } catch {
    return { update: null }
  }
  return { update: null }
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
  const [showDaySummary, setShowDaySummary] = useState(false)
  const [dayScore, setDayScore] = useState(null)
  const [dayMood, setDayMood] = useState(null)
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const [proModalOpen, setProModalOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const AUTO_UPDATE_DELAY_MS = 8000
  const ADMIN_EMAIL = 'hemmings.nacho@gmail.com' 
  const TEST_EMAIL = 'test@test.com'
  
  const { t, language } = useLanguage()
  const MotionDiv = motion.div
  const tabs = ['home', 'stats', 'community', 'apps']
  const tabIndex = tabs.indexOf(activeTab)
  const tabContainerRef = useRef(null)
  const [tabWidth, setTabWidth] = useState(0)
  const x = useMotionValue(0)
  const effectiveWidth = Math.max(tabWidth || 0, typeof window !== 'undefined' ? window.innerWidth : 0)
  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab)
  }
  const [updatePayload, setUpdatePayload] = useState(null)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateUnread, setUpdateUnread] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [testProOverride, setTestProOverride] = useState(() => {
    try {
      return localStorage.getItem('dayclose_simulate_free') !== 'true'
    } catch { return true }
  })

  const reviewHabits = useMemo(() => {
    try {
      const hardDayEnabled = localStorage.getItem('dayclose_hard_day_enabled') === 'true'
      if (!hardDayEnabled) return habits
      const rawIds = localStorage.getItem('dayclose_hard_day_ids')
      const hardDayIds = rawIds ? JSON.parse(rawIds) : []
      if (!Array.isArray(hardDayIds) || hardDayIds.length === 0) return habits
      const allowed = new Set(hardDayIds)
      return habits.filter(h => allowed.has(h.id))
    } catch {
      return habits
    }
  }, [habits])

  const currentHabit = reviewHabits[currentIndex]

  const isTestAccount = session?.user?.email === TEST_EMAIL
  const effectiveIsPro = isTestAccount ? testProOverride : isPro
  const handleToggleTestPro = () => {
    setTestProOverride(prev => {
      const next = !prev
      try {
        localStorage.setItem('dayclose_simulate_free', next ? 'false' : 'true')
      } catch {}
      return next
    })
  }

  // ── Helper: determinar si el plan Pro está activo y no caducado ──────────
  const resolveIsPro = (profileData, userEmail) => {
    const adminEmails = [ADMIN_EMAIL]
    if (adminEmails.includes(userEmail)) return true
    if (profileData?.plan !== 'pro') return false
    const expiresAt = profileData?.pro_expires_at
    // Si no tiene fecha de expiración (activado manualmente), lo consideramos válido
    if (!expiresAt) return true
    return new Date(expiresAt) > new Date()
  }

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
    const updateWidth = () => {
      const width = tabContainerRef.current?.getBoundingClientRect?.().width || window.innerWidth
      if (width) setTabWidth(width)
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    const observer = tabContainerRef.current && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateWidth)
      : null
    if (observer && tabContainerRef.current) observer.observe(tabContainerRef.current)
    return () => {
      window.removeEventListener('resize', updateWidth)
      if (observer) observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!effectiveWidth || tabIndex < 0) return
    const controls = animate(x, -tabIndex * effectiveWidth, {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      mass: 0.8
    })
    return controls.stop
  }, [effectiveWidth, tabIndex, x])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [activeTab])

  useEffect(() => {
    if (!session) return
    let active = true
    const applyAnnouncement = (message) => {
      const { update } = parseAnnouncementMessage(message, language)
      if (!active) return
      setUpdatePayload(update || null)
      if (update?.id) {
        const key = `dayclose_update_seen_${update.id}`
        const seen = localStorage.getItem(key) === 'true'
        setUpdateUnread(!seen)
      } else {
        setUpdateUnread(false)
      }
    }
    const fetchAnnouncement = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('message')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      applyAnnouncement(data?.message || null)
    }
    fetchAnnouncement()
    const channel = supabase
      .channel('public:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncement()
      })
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session, language])

  useEffect(() => {
    if (mode === 'dashboard' && updateUnread && updatePayload && !updateOpen) {
      queueMicrotask(() => setUpdateOpen(true))
    }
  }, [mode, updateUnread, updatePayload, updateOpen])

  const handleCloseUpdate = () => {
    if (updatePayload?.id) {
      try {
        localStorage.setItem(`dayclose_update_seen_${updatePayload.id}`, 'true')
      } catch {
        // ignore
      }
    }
    setUpdateUnread(false)
    setUpdateOpen(false)
  }

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
    setShowDaySummary(false); setDayScore(null); setDayMood(null);
  }

  const handleResetTutorial = async () => {
    if (!session) return
    await supabase.auth.updateUser({ data: { has_finished_tutorial: false } })
    setMode('tutorial')
  }

  const handleResetUpdates = () => {
    if (updatePayload?.id) {
      try {
        localStorage.removeItem(`dayclose_update_seen_${updatePayload.id}`)
      } catch {
        // ignore
      }
    }
    setUpdateUnread(Boolean(updatePayload?.id))
    setUpdateOpen(true)
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

  // ── Cargar plan del usuario al iniciar sesión ────────────────────────────
  useEffect(() => {
    if (!session) return
    const updateProfileState = async () => {
      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('is_blocked')
        .eq('user_id', session.user.id)
        .single()
      setIsBlocked(Boolean(userProfileData?.is_blocked))

      // ✅ Leer plan Y pro_expires_at para determinar isPro correctamente
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, pro_expires_at')
        .eq('id', session.user.id)
        .single()

      setIsPro(resolveIsPro(profileData, session.user.email))

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
    if (!session || !reviewHabits.length || mode !== 'reviewing' || currentIndex < reviewHabits.length || !results.length || hasSaved || saving || !showDaySummary) return
    const saveResults = async () => {
      setSaving(true);
      const payload = results.map(i => ({ user_id: session.user.id, habit_id: i.id, status: i.status, note: i.note || null, created_at: new Date().toISOString() }))
      const { error } = await supabase.from('daily_logs').insert(payload)
      if (!error) {
        setSaveSuccess(t('saved_success'));
        setHasSaved(true);
        await fetchTodayLogs();
        setTimeout(() => { setSwipeStatus(null); setMode('dashboard'); }, 1200);
      } else {
        console.error('Error guardando logs:', error.message)
      }
      setSaving(false)
    }
    saveResults()
  }, [session, reviewHabits, currentIndex, results, hasSaved, saving, mode, fetchTodayLogs, t, showDaySummary])

  if (loadingSession) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white font-black italic tracking-tighter uppercase text-3xl">
        DAYCLOSE
    </div>
  );

  if (!session) {
    if (showAuth) {
      return <Auth onBack={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  if (isBlocked && session?.user?.email !== ADMIN_EMAIL && !isTestAccount) {
    return <BlockedScreen title={t('blocked_title')} message={t('blocked_desc')} />
  }

  if (mode === 'tutorial') {
    return (
      <>
        <Tutorial user={session.user} onComplete={handleFinishTutorial} />
      </>
    )
  }
  if (mode === 'admin') {
    return (
      <>
        <AdminPanel onClose={() => setMode('dashboard')} version={CURRENT_SOFTWARE_VERSION} />
      </>
    )
  }

  if (mode === 'history') {
    return (
      <>
        <History user={session.user} onClose={() => setMode('dashboard')} isPro={effectiveIsPro} />
      </>
    )
  }

  if (mode === 'dashboard') {
    return (
      <div className="relative min-h-screen bg-neutral-900 overflow-x-hidden flex flex-col">

        {/* ✅ ProModal con user y onProActivated */}
        <ProModal
          isOpen={proModalOpen}
          onClose={() => setProModalOpen(false)}
          user={session.user}
          onProActivated={() => window.location.reload()}
        />

        <TopBanner onOpenUpdates={() => setUpdateOpen(true)} />
        <UpdateShowcase isOpen={updateOpen} onClose={handleCloseUpdate} payload={updatePayload} />
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
        
        <div className="flex-1 flex flex-col overflow-hidden w-full" ref={tabContainerRef}>
          <MotionDiv
            className="flex h-full"
            style={{ x }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: -effectiveWidth * (tabs.length - 1), right: 0 }}
            dragElastic={0.06}
            onDragEnd={(_, info) => {
              if (!effectiveWidth) return
              const threshold = effectiveWidth * 0.2
              if (info.offset.x < -threshold && tabIndex < tabs.length - 1) {
                setActiveTab(tabs[tabIndex + 1])
              } else if (info.offset.x > threshold && tabIndex > 0) {
                setActiveTab(tabs[tabIndex - 1])
              } else {
                animate(x, -tabIndex * effectiveWidth, { type: 'spring', damping: 30, stiffness: 300, mass: 0.8 })
              }
            }}
          >
            <div style={{ width: effectiveWidth }} className="shrink-0">
              <Dashboard
                user={session.user} habits={habits} todayLogs={todayLogs}
                onStartReview={handleStartReview} onResetToday={handleResetToday}
                version={CURRENT_SOFTWARE_VERSION} onOpenAdmin={() => setMode('admin')}
                onOpenUpdates={() => setUpdateOpen(true)}
                hasUpdates={updateUnread}
                isTestAccount={isTestAccount}
                onResetTutorial={handleResetTutorial}
                onResetUpdates={handleResetUpdates}
                onOpenHistory={() => setMode('history')}
                isPro={effectiveIsPro}
                onToggleTestPro={handleToggleTestPro}
                onUpgrade={() => setProModalOpen(true)}
              />
            </div>
            <div style={{ width: effectiveWidth }} className="shrink-0">
              <Stats
                user={session.user}
                isPro={effectiveIsPro}
                onUpgrade={() => setProModalOpen(true)}
              />
            </div>
            <div style={{ width: effectiveWidth }} className="shrink-0">
              <CommunityHub user={session.user} />
            </div>
            <div style={{ width: effectiveWidth }} className="shrink-0" onPointerDownCapture={e => e.stopPropagation()}>
              <div className="flex flex-col items-center justify-center flex-1 text-white p-6 text-center">
                <div className="w-full max-w-md space-y-6">
                  <ProgressComparison user={session.user} isPro={effectiveIsPro} onUpgrade={() => setProModalOpen(true)} />
                  <FutureLettersSection isPro={effectiveIsPro} onUpgrade={() => setProModalOpen(true)} />
                  <FeedbackSection user={session.user} />
                  <MoreFeatures />
                </div>
              </div>
            </div>
          </MotionDiv>
        </div>

        <Dock activeTab={activeTab} onTabChange={handleTabChange} />
        <ReminderPopup session={session} isPro={effectiveIsPro} />
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
        ) : !showDaySummary ? (
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-neutral-800/60 rounded-[2rem] border border-white/5 p-6 text-center shadow-xl">
              <p className="text-2xl mb-1">✅</p>
              <p className="text-lg font-black text-white mb-1">{t('review_completed')}</p>
              <p className="text-[11px] text-neutral-500 mb-6">{t('day_summary_subtitle') || 'Antes de cerrar, ¿cómo fue tu día?'}</p>

              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-3">{t('day_score_label') || 'Puntúa tu día'}</p>
              <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    onClick={() => setDayScore(n)}
                    className={`w-9 h-9 rounded-xl text-sm font-black transition-all active:scale-90 ${
                      dayScore === n
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-neutral-700/60 text-neutral-400 border border-white/5'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-3">{t('day_mood_label') || 'Estado de ánimo'}</p>
              <div className="flex justify-center gap-3 mb-6">
                {['😩','😕','😐','🙂','😄'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setDayMood(emoji)}
                    className={`text-2xl w-12 h-12 rounded-2xl transition-all active:scale-90 ${
                      dayMood === emoji
                        ? 'bg-neutral-600 ring-2 ring-white/30 scale-110'
                        : 'bg-neutral-700/40 border border-white/5'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowDaySummary(true)}
                disabled={!dayScore || !dayMood}
                className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {t('close_day_btn') || 'Cerrar el día →'}
              </button>
              <button
                onClick={() => setShowDaySummary(true)}
                className="mt-3 w-full text-[11px] text-neutral-600 active:text-neutral-400"
              >
                {t('skip_summary') || 'Saltar'}
              </button>
            </div>
          </div>
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