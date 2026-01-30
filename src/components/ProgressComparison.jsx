import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext'

export default function ProgressComparison({ user }) {
  const [loading, setLoading] = useState(true)
  const [comparison, setComparison] = useState({ day: null, week: null, month: null })
  const { t } = useLanguage()

  const formatDate = (date) => {
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }

  const getMonthKey = (date) => {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const diffPercent = (current, previous) => {
    if (previous === 0 && current === 0) return 0
    if (previous === 0) return 100
    return Math.round(((current - previous) / previous) * 100)
  }

  useEffect(() => {
    async function calculateComparison() {
      if (!user) return
      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('created_at, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
      if (error || !logs) { setLoading(false); return }

      const todayKey = formatDate(new Date())
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayKey = formatDate(yesterday)
      const todayCount = logs.filter(l => formatDate(l.created_at) === todayKey).length
      const yesterdayCount = logs.filter(l => formatDate(l.created_at) === yesterdayKey).length

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
        currentWeekData.push({ day: days[d.getDay()], date: dateStr, count: count })
      }
      const currentWeekTotal = currentWeekData.reduce((acc, curr) => acc + curr.count, 0)

      const lastWeekData = []
      const lastMonday = new Date(monday)
      lastMonday.setDate(monday.getDate() - 7)
      for (let i = 0; i < 7; i++) {
        const d = new Date(lastMonday)
        d.setDate(lastMonday.getDate() + i)
        const dateStr = formatDate(d)
        const count = logs.filter(l => formatDate(l.created_at) === dateStr).length
        lastWeekData.push({ date: dateStr, count })
      }
      const lastWeekTotal = lastWeekData.reduce((acc, curr) => acc + curr.count, 0)

      const currentMonthKey = getMonthKey(new Date())
      const prevMonthDate = new Date()
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
      const lastMonthKey = getMonthKey(prevMonthDate)
      const currentMonthTotal = logs.filter(l => getMonthKey(l.created_at) === currentMonthKey).length
      const lastMonthTotal = logs.filter(l => getMonthKey(l.created_at) === lastMonthKey).length

      setComparison({
        day: { current: todayCount, previous: yesterdayCount, delta: diffPercent(todayCount, yesterdayCount) },
        week: { current: currentWeekTotal, previous: lastWeekTotal, delta: diffPercent(currentWeekTotal, lastWeekTotal) },
        month: { current: currentMonthTotal, previous: lastMonthTotal, delta: diffPercent(currentMonthTotal, lastMonthTotal) }
      })

      setLoading(false)
    }

    calculateComparison()
  }, [user])

  if (loading) return null

  return (
    <div className="bg-neutral-800/30 radius-card border border-white/5 p-5 shadow-apple-soft">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-white">{t('compare_section_title')}</p>
          <p className="text-[11px] text-neutral-500">{t('compare_section_desc')}</p>
        </div>
        <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
          <span className="text-[10px] text-neutral-400 font-bold">%</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {['day', 'week', 'month'].map((key) => {
          const data = comparison[key]
          if (!data) return null
          const isUp = data.delta >= 0
          return (
            <div key={key} className="bg-neutral-900/60 p-4 radius-card border border-white/5 text-center shadow-apple-soft">
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{t(`compare_${key}`)}</p>
              <p className="mt-1 text-2xl font-black text-white tracking-tight">{data.current}</p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${isUp ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(data.delta)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
