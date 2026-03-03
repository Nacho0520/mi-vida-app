import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, SkipForward } from 'lucide-react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabaseClient'
import SwipeCard from './SwipeCard'
import NoteModal from './NoteModal'
import { useLanguage } from '../context/LanguageContext'

const MotionDiv = motion.div

function launchConfetti() {
  const count = 180
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }
  function fire(particleRatio, opts) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) })
  }
  fire(0.25, { origin: { x: 0.2, y: 0.6 }, colors: ['#a855f7', '#6366f1', '#ffffff'] })
  fire(0.25, { origin: { x: 0.8, y: 0.6 }, colors: ['#10b981', '#34d399', '#ffffff'] })
  setTimeout(() => {
    fire(0.35, { origin: { x: 0.5, y: 0.5 }, colors: ['#f59e0b', '#ffffff', '#a855f7'] })
  }, 180)
}

function getTimeBasedBgClass() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'bg-orange-950/20'
  if (hour >= 12 && hour < 20) return 'bg-indigo-950/20'
  return 'bg-neutral-900'
}

const REFLECTION_DURATION_MS = 3500

export default function ReviewScreen({ habits, todayLogs, session, onReviewComplete, yesterdaySummary = null }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const confettiFired = useRef(false)
  const timeBasedBgClass = useRef(getTimeBasedBgClass()).current

  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState([])
  const [swipeStatus, setSwipeStatus] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingHabit, setPendingHabit] = useState(null)
  const [showDaySummary, setShowDaySummary] = useState(false)
  const [dayScore, setDayScore] = useState(null)
  const [dayMood, setDayMood] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)

  const hasYesterdayData = yesterdaySummary?.score != null
  const [showReflection, setShowReflection] = useState(hasYesterdayData)

  useEffect(() => {
    if (!showReflection) return
    const timer = setTimeout(() => setShowReflection(false), REFLECTION_DURATION_MS)
    return () => clearTimeout(timer)
  }, [showReflection])

  const pendingHabits = useMemo(() => {
    const loggedIds = new Set((todayLogs || []).map(l => l.habit_id))
    return (habits || []).filter(h => !loggedIds.has(h.id))
  }, [habits, todayLogs])

  const reviewHabits = useMemo(() => {
    try {
      const hardDayEnabled = localStorage.getItem('dayclose_hard_day_enabled') === 'true'
      if (!hardDayEnabled) return pendingHabits
      const rawIds = localStorage.getItem('dayclose_hard_day_ids')
      const hardDayIds = rawIds ? JSON.parse(rawIds) : []
      const allowed = new Set(hardDayIds)
      return pendingHabits.filter(h => allowed.has(h.id))
    } catch { return pendingHabits }
  }, [pendingHabits])

  const currentHabit = reviewHabits[currentIndex]
  const allSwiped = habits && currentIndex >= reviewHabits.length

  useEffect(() => {
    if (habits && reviewHabits.length === 0 && !showReflection && !showDaySummary && !hasSaved && !saving) {
      navigate('/', { replace: true })
    }
  }, [reviewHabits, habits, navigate, showReflection, showDaySummary, hasSaved, saving])

  useEffect(() => {
    if (allSwiped && !showReflection && !showDaySummary && !confettiFired.current && reviewHabits.length > 0) {
      confettiFired.current = true
      setTimeout(launchConfetti, 300)
    }
  }, [allSwiped, showReflection, showDaySummary, reviewHabits.length])

  // ── [FIX] Guardado de resultados movido a useEffect ──────────────────────
  const saveResults = useCallback(async () => {
    if (!session || hasSaved || saving) return
    setSaving(true)

    const payload = results.map(i => ({
      user_id: session.user.id,
      habit_id: i.id,
      status: i.status,
      note: i.note || null,
      created_at: new Date().toISOString()
    }))

    payload.push({
      user_id: session.user.id,
      habit_id: null,
      status: 'summary',
      score: dayScore,
      mood: dayMood,
      created_at: new Date().toISOString()
    })

    const { error } = await supabase.from('daily_logs').insert(payload)
    if (!error) {
      setHasSaved(true)
      if (onReviewComplete) onReviewComplete()
    } else {
      setSaving(false)
      alert("Error: " + error.message)
    }
  }, [session, results, hasSaved, saving, dayScore, dayMood, onReviewComplete])

  // Disparar el guardado automáticamente cuando se activa el estado final
  useEffect(() => {
    if (showDaySummary && !hasSaved && !saving) {
      saveResults()
    }
  }, [showDaySummary, hasSaved, saving, saveResults])

  if (!habits) return <div className="min-h-screen bg-neutral-900" />

  return (
    <div className={`app-screen flex items-center justify-center transition-colors duration-300 relative ${
      swipeStatus === 'done' ? 'bg-emerald-900' : 
      swipeStatus === 'not-done' ? 'bg-red-900' : timeBasedBgClass
    }`}>
      
      <button onClick={() => navigate('/')} className="fixed top-6 right-6 z-[100] flex items-center gap-1 px-4 py-2 bg-neutral-800/80 backdrop-blur-md border border-white/5 rounded-full text-neutral-400">
        <X size={18} />
        <span className="text-xs font-medium uppercase tracking-widest">{t('exit')}</span>
      </button>

      <div className="w-full max-w-md mx-auto px-4">
        <AnimatePresence mode="wait">
          
          {showReflection && hasYesterdayData && (
            <MotionDiv key="reflection" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} className="text-center">
              <div className="bg-neutral-800/60 rounded-[2rem] border border-white/5 p-7 text-center shadow-xl">
                <p className="text-5xl mb-4">{yesterdaySummary.mood || '📅'}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 mb-2">{t('yesterday_reflection_title')}</p>
                <p className="text-4xl font-black text-white tracking-tighter mb-1">{yesterdaySummary.score}<span className="text-neutral-500 text-lg font-bold">/10</span></p>
                <p className="text-sm text-neutral-400 mt-3 mb-6 leading-relaxed">
                  {`${yesterdaySummary.score}/10 — ¿Cómo te sientes hoy?`}
                </p>
                <div className="w-full h-1 rounded-full bg-neutral-700/50 overflow-hidden mb-5">
                  <MotionDiv className="h-full bg-violet-500/70 rounded-full" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: REFLECTION_DURATION_MS / 1000, ease: 'linear' }} />
                </div>
                <button onClick={() => setShowReflection(false)} className="flex items-center gap-1.5 mx-auto text-[11px] text-neutral-500 hover:text-neutral-300">
                  <SkipForward size={12} />
                  <span className="uppercase tracking-widest font-bold">{t('skip_summary')}</span>
                </button>
              </div>
            </MotionDiv>
          )}

          {!showReflection && currentHabit && (
            <motion.div key="swipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
              <SwipeCard
                habit={currentHabit}
                onSwipeComplete={(dir) => {
                  if (dir === 'right') {
                    setResults(p => [...p, { id: currentHabit.id, title: currentHabit.title, status: 'completed' }])
                    setCurrentIndex(c => c + 1)
                  } else {
                    setPendingHabit(currentHabit)
                    setIsModalOpen(true)
                  }
                }}
                onDrag={(x) => setSwipeStatus(x > 100 ? 'done' : x < -100 ? 'not-done' : null)}
              />
            </motion.div>
          )}

          {!showReflection && allSwiped && !showDaySummary && !hasSaved && (
            <MotionDiv key="summary" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-sm mx-auto">
              <div className="bg-neutral-800/60 rounded-[2rem] border border-white/5 p-6 text-center shadow-xl">
                <p className="text-3xl mb-1">✅</p>
                <p className="text-lg font-black text-white mb-1">{t('review_completed')}</p>
                <p className="text-[11px] text-neutral-500 mb-6">{t('day_summary_subtitle')}</p>
                
                <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-3">{t('day_score_label')}</p>
                <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setDayScore(n)} className={`w-9 h-9 rounded-xl text-sm font-black transition-all active:scale-90 ${dayScore === n ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-neutral-700/60 text-neutral-400 border border-white/5'}`}>{n}</button>
                  ))}
                </div>

                <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-3">{t('day_mood_label')}</p>
                <div className="flex justify-center gap-3 mb-6">
                  {['😩','😕','😐','🙂','😄'].map(e => (
                    <button key={e} onClick={() => setDayMood(e)} className={`text-2xl w-12 h-12 rounded-2xl transition-all active:scale-90 ${dayMood === e ? 'bg-neutral-600 ring-2 ring-white/30 scale-110' : 'bg-neutral-700/40 border border-white/5'}`}>{e}</button>
                  ))}
                </div>

                <button onClick={() => setShowDaySummary(true)} disabled={!dayScore || !dayMood} className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm active:scale-95 transition-all disabled:opacity-30">{t('close_day_btn')}</button>
              </div>
            </MotionDiv>
          )}

          {hasSaved && (
            <MotionDiv key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2rem] bg-neutral-800 p-6 text-center border border-white/5">
              <p className="text-xl font-bold mb-2">{t('review_completed')}</p>
              <p className="text-sm text-emerald-400 mb-6">{t('saved_success')}</p>
              
              <button onClick={() => navigate('/')} className="w-full py-4 bg-white text-black font-bold rounded-2xl active:scale-95 transition-all">
                {t('back_dashboard')}
              </button>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      <NoteModal isOpen={isModalOpen} habitTitle={pendingHabit?.title} onSave={(note) => { setResults(p => [...p, { id: pendingHabit.id, status: 'skipped', note }]); setIsModalOpen(false); setCurrentIndex(c => c + 1); }} onSkip={() => { setResults(p => [...p, { id: pendingHabit.id, status: 'skipped' }]); setIsModalOpen(false); setCurrentIndex(c => c + 1); }} />
    </div>
  )
}