import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Flame, Trophy, TrendingUp, Calendar, Loader2, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext'

export default function Stats({ user }) {
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [weeklyData, setWeeklyData] = useState([])
  const [protectorUses, setProtectorUses] = useState(() => {
    try {
      const raw = localStorage.getItem('mivida_streak_protector_uses')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [isProtectorActive, setProtectorActive] = useState(false)
  const { t } = useLanguage()
  const MAX_PROTECTORS_PER_MONTH = 2
  
  const formatDate = (date) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const getMonthKey = (date) => formatDate(date).slice(0, 7)
  const getUsesThisMonth = (date) => {
    const monthKey = getMonthKey(date)
    return protectorUses.filter((d) => typeof d === 'string' && d.startsWith(monthKey)).length
  }

  useEffect(() => {
    async function calculateStats() {
      if (!user) return
      const { data: logs, error } = await supabase.from('daily_logs').select('created_at, status').eq('user_id', user.id).eq('status', 'completed').order('created_at', { ascending: false })
      if (error || !logs) { setLoading(false); return }

      const activeDays = new Set(logs.map(log => formatDate(log.created_at)))
      const protectedDays = new Set()
      protectorUses.forEach((dateStr) => protectedDays.add(dateStr))

      const today = new Date()
      const todayStr = formatDate(today)
      const usesThisMonth = getUsesThisMonth(today)
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      const yesterdayStr = formatDate(yesterday)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(today.getDate() - 2)
      const twoDaysAgoStr = formatDate(twoDaysAgo)

      const eligible = !activeDays.has(yesterdayStr) && activeDays.has(twoDaysAgoStr) && usesThisMonth < MAX_PROTECTORS_PER_MONTH
      if (eligible) {
        const nextUses = Array.from(new Set([...protectorUses, yesterdayStr]))
        protectedDays.add(yesterdayStr)
        try {
          localStorage.setItem('mivida_streak_protector_uses', JSON.stringify(nextUses))
        } catch {
          // ignore
        }
        setProtectorUses(nextUses)
      }

      const isActive = (dateStr) => activeDays.has(dateStr) || protectedDays.has(dateStr)
      let currentStreak = 0
      let checkDate = new Date(today)

      if (!isActive(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1)
        if (!isActive(formatDate(checkDate))) currentStreak = 0
        else { currentStreak = 1; checkDate.setDate(checkDate.getDate() - 1) }
      } else {
        currentStreak = 1; checkDate.setDate(checkDate.getDate() - 1)
      }

      while (currentStreak > 0) {
        if (isActive(formatDate(checkDate))) { currentStreak++; checkDate.setDate(checkDate.getDate() - 1) }
        else break
      }
      
      setStreak(currentStreak)
      setTotalCompleted(logs.length)
      setProtectorActive(protectedDays.has(yesterdayStr))

      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const currentWeekData = []
      const curr = new Date()
      const currentDay = curr.getDay() 
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1
      const monday = new Date(curr)
      monday.setDate(curr.getDate() - distanceToMonday)
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dateStr = formatDate(d)
        const count = logs.filter(l => formatDate(l.created_at) === dateStr).length
        currentWeekData.push({ day: days[d.getDay()], date: dateStr, count: count, isToday: dateStr === todayStr })
      }
      setWeeklyData(currentWeekData)
      setLoading(false)
    }
    calculateStats()
  }, [user, protectorUses])

  if (loading) return <div className="flex h-full items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>

  return (
    <div className="w-full max-w-md mx-auto px-6 pb-32 pt-6 animate-in fade-in duration-500">
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-[2.5rem] p-8 text-center border border-white/5 shadow-2xl mb-6">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Flame size={120} /></div>
        <div className="relative z-10">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className={`inline-flex items-center justify-center p-4 rounded-full mb-4 border shadow-[0_0_30px_rgba(249,115,22,0.2)] ${
            isProtectorActive
              ? 'bg-emerald-500/15 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
              : streak > 0
                ? 'bg-orange-500/20 border-orange-500/20'
                : 'bg-neutral-800/60 border-white/5'
          }`}>
            {isProtectorActive ? (
              <Lock size={32} className="text-emerald-400" />
            ) : (
              <Flame size={32} className={streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-neutral-600'} />
            )}
          </motion.div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-1">{streak}</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-[0.3em]">{t('streak_label')}</p>
        </div>
      </div>

      <div className="bg-neutral-800/40 p-5 rounded-[2rem] border border-white/5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">{t('streak_protector_title')}</p>
            <p className="text-[11px] text-neutral-500">{t('streak_protector_desc')}</p>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border text-neutral-400 bg-white/5 border-white/5">
            {t('streak_protector_monthly')} {getUsesThisMonth(new Date())}/{MAX_PROTECTORS_PER_MONTH}
          </span>
        </div>
        <p className="mt-3 text-[11px] text-neutral-500">
          {t('streak_protector_cooldown')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-neutral-800/50 p-6 rounded-[2rem] border border-white/5">
          <Trophy className="text-yellow-500 mb-3" size={24} />
          <p className="text-2xl font-black text-white">{totalCompleted}</p>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{t('total_wins')}</p>
        </div>
        <div className="bg-neutral-800/50 p-6 rounded-[2rem] border border-white/5">
          <TrendingUp className="text-emerald-500 mb-3" size={24} />
          <p className="text-2xl font-black text-white">{weeklyData.reduce((acc, curr) => acc + curr.count, 0)}</p>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{t('this_week')}</p>
        </div>
      </div>

      <div className="bg-neutral-800/30 p-8 rounded-[2.5rem] border border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <Calendar size={18} className="text-neutral-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">{t('weekly_perf')}</h3>
        </div>
        <div className="flex items-end justify-between h-32 gap-2">
          {weeklyData.map((d, i) => {
            const max = Math.max(...weeklyData.map(w => w.count)) || 1
            const height = d.count === 0 ? 5 : (d.count / max) * 100 
            return (
              <div key={i} className="flex flex-col items-center flex-1 group">
                <div className="w-full relative flex items-end justify-center h-full">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: i * 0.1, type: "spring" }} className={`w-full rounded-xl min-h-[6px] transition-colors ${d.isToday ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : d.count > 0 ? 'bg-neutral-700 group-hover:bg-neutral-600' : 'bg-neutral-800'}`} />
                  {d.count > 0 && (<div className="absolute -top-6 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</div>)}
                </div>
                <p className={`mt-3 text-[10px] font-bold uppercase ${d.isToday ? 'text-emerald-500' : 'text-neutral-600'}`}>{d.day[0]}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}