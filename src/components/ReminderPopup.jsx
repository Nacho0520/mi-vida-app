import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { Check, Clock, X, Flame } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const HOURS_COOLDOWN = 4
const COOLDOWN_MS = HOURS_COOLDOWN * 60 * 60 * 1000

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

export default function ReminderPopup({ session, isPro }) {
  const [visible, setVisible] = useState(false)
  const [currentHabit, setCurrentHabit] = useState(null)
  const [snoozedHabits, setSnoozedHabits] = useState([])
  const [streakDangerVisible, setStreakDangerVisible] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const { t } = useLanguage()

  const checkPendingHabits = async () => {
    if (!session) return
    if (!isPro) return
    const lastShownStr = localStorage.getItem('lastPopupTime')
    if (lastShownStr) {
      if (Date.now() - parseInt(lastShownStr) < COOLDOWN_MS) return
    }
    const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true)
    if (!habits || habits.length === 0) return
    const todayCode = getTodayFrequencyCode()
    const filteredHabits = habits.filter((habit) => {
      const freq = normalizeFrequency(habit.frequency)
      if (!freq || freq.length === 0) return true
      return freq.includes(todayCode)
    })
    if (filteredHabits.length === 0) return
    const today = new Date().toISOString().split('T')[0]
    const { data: logs } = await supabase.from('daily_logs').select('habit_id').eq('user_id', session.user.id).gte('created_at', `${today}T00:00:00.000Z`).lte('created_at', `${today}T23:59:59.999Z`)
    const completedIds = logs?.map(l => l.habit_id) || []
    const pending = filteredHabits.find(h => !completedIds.includes(h.id) && !snoozedHabits.includes(h.id))
    if (pending) {
      setCurrentHabit(pending)
      setVisible(true)
      localStorage.setItem('lastPopupTime', Date.now().toString())
    }
  }

  useEffect(() => {
    if (!isPro) return
    const initialTimer = setTimeout(checkPendingHabits, 5000)
    const interval = setInterval(checkPendingHabits, 300000)
    return () => { clearTimeout(initialTimer); clearInterval(interval) }
  }, [session, snoozedHabits, isPro])

  useEffect(() => {
    if (!session) return
    const checkStreakDanger = async () => {
      const now = new Date()
      const hours = now.getHours()
      if (hours < 21) return

      const dismissedKey = `dayclose_streak_danger_${now.toISOString().split('T')[0]}`
      if (localStorage.getItem(dismissedKey)) return

      const formatDate = (d) => new Date(d).toISOString().split('T')[0]
      const today = formatDate(new Date())

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('habit_id, status')
        .eq('user_id', session.user.id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)

      const completedToday = logs?.filter(l => l.status === 'completed').length || 0
      if (completedToday > 0) return

      const { data: allLogs } = await supabase
        .from('daily_logs')
        .select('created_at')
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (!allLogs || allLogs.length === 0) return

      const activeDays = [...new Set(allLogs.map(l => formatDate(l.created_at)))]
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = formatDate(yesterday)

      if (!activeDays.includes(yesterdayStr)) return

      let streak = 0
      let check = new Date(yesterday)
      while (activeDays.includes(formatDate(check))) {
        streak++
        check.setDate(check.getDate() - 1)
      }

      if (streak >= 2) {
        setCurrentStreak(streak)
        setStreakDangerVisible(true)
      }
    }

    checkStreakDanger()
    const interval = setInterval(checkStreakDanger, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [session])

  const handleAction = async (action) => {
    if (!currentHabit) return
    if (action === 'done') {
      const { error } = await supabase.from('daily_logs').insert({ user_id: session.user.id, habit_id: currentHabit.id, status: 'completed', note: 'Marcado desde recordatorio', created_at: new Date().toISOString() })
      if (!error) { setVisible(false); window.location.reload() }
    } else if (action === 'later') {
      setSnoozedHabits(prev => [...prev, currentHabit.id])
      setVisible(false)
    } else if (action === 'skip') {
      const { error } = await supabase.from('daily_logs').insert({ user_id: session.user.id, habit_id: currentHabit.id, status: 'skipped', note: 'Omitido desde pop-up', created_at: new Date().toISOString() })
      if (!error) { setVisible(false); window.location.reload() }
    }
  }

  return (
    <AnimatePresence>
      {visible && currentHabit && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-neutral-800 border border-white/5 radius-card p-4 shadow-apple-soft flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${currentHabit.color || 'bg-blue-500'}`}><span className="text-xl">{currentHabit.icon || '📝'}</span></div>
              <div><p className="text-xs text-neutral-400 uppercase font-bold tracking-wide">{t('reminder_title')}</p><p className="text-white font-medium text-lg">{currentHabit.title}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => handleAction('done')} className="flex flex-col items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 py-2 rounded-xl border border-emerald-500/20 transition-colors"><Check size={18} className="mb-1" /><span className="text-xs font-medium">{t('btn_done')}</span></button>
              <button onClick={() => handleAction('later')} className="flex flex-col items-center justify-center bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700/60 py-2 rounded-xl border border-white/5 transition-colors"><Clock size={18} className="mb-1" /><span className="text-xs font-medium">{t('btn_later')}</span></button>
              <button onClick={() => handleAction('skip')} className="flex flex-col items-center justify-center bg-red-900/20 text-red-400 hover:bg-red-900/30 py-2 rounded-xl border border-red-900/50 transition-colors"><X size={18} className="mb-1" /><span className="text-xs font-medium">{t('btn_skip')}</span></button>
            </div>
          </div>
        </motion.div>
      )}
      {streakDangerVisible && !visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-50"
        >
          <div className="bg-neutral-900 border border-orange-500/20 radius-card p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/15 border border-orange-500/20 flex-shrink-0">
                <Flame size={20} className="text-orange-400 fill-orange-400/30" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-orange-400 uppercase font-black tracking-wider">{t('streak_danger_title') || '¡Racha en peligro!'}</p>
                <p className="text-white font-bold text-sm">{currentStreak} {t('streak_label')} — {t('streak_danger_desc') || 'Completa al menos 1 hábito para salvarla'}</p>
              </div>
              <button
                onClick={() => {
                  const key = `dayclose_streak_danger_${new Date().toISOString().split('T')[0]}`
                  localStorage.setItem(key, 'true')
                  setStreakDangerVisible(false)
                }}
                className="text-neutral-600 hover:text-neutral-400 p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
