import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext'
import { Zap } from 'lucide-react'
import ProModal from './ProModal'

export default function ProgressComparison({ user, isPro }) {
  const [loading, setLoading] = useState(true)
  const [comparison, setComparison] = useState({ day: null, week: null, month: null })
  const [proModalOpen, setProModalOpen] = useState(false)
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

      // Free: solo 30 días | Pro: sin límite
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (isPro ? 9999 : 30))

      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('created_at, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error || !logs) { setLoading(false); return }

      // Día vs ayer
      const todayKey = formatDate(new Date())
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayKey = formatDate(yesterday)
      const todayCount = logs.filter(l => formatDate(l.created_at) === todayKey).length
      const yesterdayCount = logs.filter(l => formatDate(l.created_at) === yesterdayKey).length

      // Semana actual vs semana pasada
      const curr = new Date()
      const distanceToMonday = curr.getDay() === 0 ? 6 : curr.getDay() - 1
      const monday = new Date(curr)
      monday.setDate(curr.getDate() - distanceToMonday)
      let currentWeekTotal = 0
      let lastWeekTotal = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        currentWeekTotal += logs.filter(l => formatDate(l.created_at) === formatDate(d)).length
        const ld = new Date(monday)
        ld.setDate(monday.getDate() - 7 + i)
        lastWeekTotal += logs.filter(l => formatDate(l.created_at) === formatDate(ld)).length
      }

      // Mes actual vs mes pasado
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
  }, [user, isPro])

  if (loading) return null

  return (
    <div className="bg-neutral-900/40 p-5 sm:p-6 radius-card border border-white/5 shadow-apple-soft relative overflow-hidden">
      <ProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />

      <div className="flex items-center justify-between mb-5">
        <div className="text-left">
          <p className="text-sm font-semibold text-white">{t('compare_section_title')}</p>
          <p className="text-[11px] text-neutral-500">{t('compare_section_desc')}</p>
        </div>
      </div>

      {isPro ? (
      <div className="grid grid-cols-3 gap-3">
        {['day', 'week', 'month'].map((key) => {
          const data = comparison[key]
          if (!data) return null

          // Bloquear comparación mensual para Free
          if (key === 'month' && !isPro) {
            return (
              <button
                key={key}
                onClick={() => setProModalOpen(true)}
                className="bg-neutral-900/60 p-4 radius-card border border-violet-500/20 text-center shadow-apple-soft active:scale-95 transition-all"
              >
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2">
                  {t('compare_month')}
                </p>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/20 mx-auto mb-1">
                  <Zap size={14} className="text-violet-400 fill-violet-400" />
                </div>
                <span className="text-[9px] font-black text-violet-400 uppercase tracking-wider">Pro</span>
              </button>
            )
          }

          const isUp = data.delta >= 0
          return (
            <div key={key} className="bg-neutral-900/60 p-4 radius-card border border-white/5 text-center shadow-apple-soft">
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{t(`compare_${key}`)}</p>
              <p className="mt-1 text-2xl font-black text-white tracking-tight">{data.current}</p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                isUp
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-red-400 bg-red-500/10 border border-red-500/20'
              }`}>
                {isUp ? '▲' : '▼'} {Math.abs(data.delta)}%
              </span>
            </div>
          )
        })}
      </div>
      ) : (
        <div className="relative">
          {/* Grid borroso — mismo patrón que heatmap de Stats */}
          <div className="grid grid-cols-3 gap-3 blur-sm pointer-events-none select-none">
            {['day', 'week', 'month'].map((key) => (
              <div key={key} className="bg-neutral-800/60 p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">{t(`compare_${key}`)}</p>
                <p className="text-2xl font-black text-white">12</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10">▲ 24%</span>
              </div>
            ))}
          </div>
          {/* Overlay — mismo patrón que heatmap de Stats */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[2rem] bg-neutral-900/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Zap size={22} className="text-violet-400 fill-violet-400/30" />
              </div>
              <p className="text-sm font-black text-white">{t('pro_comparison_title')}</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed text-center px-4">{t('pro_comparison_desc')}</p>
              <button
                onClick={() => setProModalOpen(true)}
                className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-500 text-white text-xs font-black shadow-lg shadow-violet-500/30 active:scale-95 transition-all"
              >
                <Zap size={13} /> {t('upgrade_to_pro')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
