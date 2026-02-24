import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Calendar, ArrowLeft, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import ProModal from './ProModal'

function formatDateLocal(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function History({ user, onClose, isPro }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [habits, setHabits] = useState([])
  const [range, setRange] = useState('month')
  const [proModalOpen, setProModalOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(formatDateLocal(new Date()).slice(0, 7))
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const distanceToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - distanceToMonday)
    return formatDateLocal(monday)
  })

  // Free: 30 días | Pro: 90 días
  const HISTORY_DAYS = isPro ? 90 : 30

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      setLoading(true)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - HISTORY_DAYS)
      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('id, created_at, status, note, habit_id')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
      const { data: habitsData } = await supabase
        .from('habits')
        .select('id, title, icon, color')
        .eq('user_id', user.id)
      setLogs(logsData || [])
      setHabits(habitsData || [])
      setLoading(false)
    }
    fetchData()
  }, [user, HISTORY_DAYS])

  const habitMap = useMemo(() => {
    const map = new Map()
    habits.forEach(h => map.set(h.id, h))
    return map
  }, [habits])

  // Para Free: bloquear navegación a meses anteriores al último mes
  const currentMonthStr = formatDateLocal(new Date()).slice(0, 7)
  const prevMonthStr = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return formatDateLocal(d).slice(0, 7)
  })()
  const isMonthBlocked = !isPro && selectedMonth < currentMonthStr

  const filteredLogs = useMemo(() => {
    if (isMonthBlocked) return []
    if (range === 'month') {
      return logs.filter(log => formatDateLocal(log.created_at).startsWith(selectedMonth))
    }
    const start = new Date(selectedWeekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return logs.filter(log => {
      const d = new Date(log.created_at)
      return d >= start && d <= end
    })
  }, [logs, range, selectedMonth, selectedWeekStart, isMonthBlocked])

  const grouped = useMemo(() => {
    const map = new Map()
    filteredLogs.forEach(log => {
      const dateKey = formatDateLocal(log.created_at)
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey).push(log)
    })
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
      completed: items.filter(i => i.status === 'completed').length,
      total: items.length
    }))
  }, [filteredLogs])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto px-6 pb-32 pt-6 animate-in fade-in duration-500">
      <ProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-neutral-800/60 border border-white/5 flex items-center justify-center text-neutral-300 hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-white">{t('history_title')}</h2>
          <p className="text-[11px] text-neutral-500">
            {isPro ? 'Últimos 90 días' : 'Últimos 30 días'}
          </p>
        </div>
        {/* Badge Pro o CTA */}
        {!isPro && (
          <button
            onClick={() => setProModalOpen(true)}
            className="flex items-center gap-1.5 bg-violet-600/15 border border-violet-500/30 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
          >
            <Zap size={11} className="text-violet-400 fill-violet-400" />
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider">90 días</span>
          </button>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-neutral-900/60 border border-white/5 rounded-full p-1">
          <button
            onClick={() => setRange('week')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold ${range === 'week' ? 'bg-white text-black' : 'text-neutral-400'}`}
          >
            {t('history_week')}
          </button>
          <button
            onClick={() => setRange('month')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold ${range === 'month' ? 'bg-white text-black' : 'text-neutral-400'}`}
          >
            {t('history_month')}
          </button>
        </div>
        {range === 'month' ? (
          <input
            type="month"
            value={selectedMonth}
            min={isPro ? undefined : prevMonthStr}
            max={currentMonthStr}
            onChange={(e) => {
              if (!isPro && e.target.value < currentMonthStr) {
                setProModalOpen(true)
                return
              }
              setSelectedMonth(e.target.value)
            }}
            className="bg-neutral-900/60 border border-white/5 rounded-full px-3 py-1 text-[11px] text-neutral-300"
          />
        ) : (
          <input
            type="week"
            onChange={(e) => {
              const [year, week] = e.target.value.split('-W')
              const firstDay = new Date(year, 0, 1)
              const days = (Number(week) - 1) * 7
              const monday = new Date(firstDay.getTime() + days * 24 * 60 * 60 * 1000)
              const day = monday.getDay()
              const diff = day === 0 ? -6 : 1 - day
              monday.setDate(monday.getDate() + diff)

              // Free: bloquear semanas fuera de los últimos 30 días
              const cutoff = new Date()
              cutoff.setDate(cutoff.getDate() - 30)
              if (!isPro && monday < cutoff) {
                setProModalOpen(true)
                return
              }
              setSelectedWeekStart(formatDateLocal(monday))
            }}
            className="bg-neutral-900/60 border border-white/5 rounded-full px-3 py-1 text-[11px] text-neutral-300"
          />
        )}
      </div>

      {/* ── Contenido bloqueado (Free navegando a mes anterior) ── */}
      {isMonthBlocked ? (
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          <div className="w-16 h-16 rounded-[1.5rem] bg-violet-600/15 border border-violet-500/20 flex items-center justify-center">
            <Zap size={28} className="text-violet-400 fill-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-black text-lg mb-1">Historial extendido</p>
            <p className="text-neutral-500 text-sm">Con Pro accedes a los últimos<br />90 días de historial completo.</p>
          </div>
          <button
            onClick={() => setProModalOpen(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold px-8 py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
          >
            Ver con Pro
          </button>
          <button onClick={() => setSelectedMonth(currentMonthStr)} className="text-neutral-600 text-xs hover:text-neutral-400 transition-colors">
            Volver al mes actual
          </button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="radius-card border border-white/5 bg-neutral-800/30 p-6 text-center text-neutral-400 shadow-apple-soft">
          <p className="text-body font-medium">{t('history_empty')}</p>
        </div>
      ) : (
        <div className="premium-divider">
          {grouped.map(day => {
            const pct = day.total ? Math.round((day.completed / day.total) * 100) : 0
            return (
              <div key={day.date} className="bg-neutral-800/30 rounded-[2rem] p-5 border border-white/5 shadow-apple-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-neutral-500" />
                    <span className="text-sm font-semibold text-white">{day.date}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    {pct}%
                  </span>
                </div>
                <div className="premium-divider">
                  {day.items.map((item) => {
                    const habit = habitMap.get(item.habit_id)
                    const isDone = item.status === 'completed'
                    return (
                      <div key={item.id} className="flex items-start gap-3 bg-neutral-900/60 border border-white/5 rounded-2xl p-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${habit?.color || 'bg-neutral-800'}`}>
                          <span className="text-base">{habit?.icon || '•'}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{habit?.title || t('history_unknown')}</p>
                          {item.note && (
                            <p className="text-[11px] text-neutral-500 mt-1">{item.note}</p>
                          )}
                        </div>
                        <div className="mt-1">
                          {isDone
                            ? <CheckCircle2 size={18} className="text-emerald-400" />
                            : <XCircle size={18} className="text-red-400" />
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
