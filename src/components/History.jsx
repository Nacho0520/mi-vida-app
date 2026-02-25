import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Calendar, ArrowLeft, CheckCircle2, XCircle, Loader2, Zap, MessageSquare } from 'lucide-react'
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

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-neutral-800/60 border border-white/5 flex items-center justify-center text-neutral-300"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-white">{t('history_title')}</h2>
          <p className="text-[11px] text-neutral-500">
            {isPro ? t('history_days_pro') : t('history_days_free')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-neutral-900/60 border border-white/5 rounded-full p-1">
          <button onClick={() => setRange('week')} className={`px-3 py-1 rounded-full text-[11px] font-bold ${range === 'week' ? 'bg-white text-black' : 'text-neutral-400'}`}>
            {t('history_week')}
          </button>
          <button onClick={() => setRange('month')} className={`px-3 py-1 rounded-full text-[11px] font-bold ${range === 'month' ? 'bg-white text-black' : 'text-neutral-400'}`}>
            {t('history_month')}
          </button>
        </div>
        <input
          type={range === 'month' ? "month" : "week"}
          value={range === 'month' ? selectedMonth : undefined}
          onChange={(e) => {
             // Lógica de bloqueo Pro aquí si es necesario
             if (range === 'month') setSelectedMonth(e.target.value)
          }}
          className="bg-neutral-900/60 border border-white/5 rounded-full px-3 py-1 text-[11px] text-neutral-300"
        />
      </div>

      {grouped.map(day => (
        <div key={day.date} className="bg-neutral-800/30 rounded-[2rem] p-5 border border-white/5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-black text-white uppercase">{day.date}</span>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {Math.round((day.completed / day.total) * 100)}%
            </span>
          </div>
          <div className="space-y-3">
            {day.items.map((item) => {
              const habit = habitMap.get(item.habit_id)
              return (
                <div key={item.id} className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${habit?.color || 'bg-neutral-800'}`}>
                      <span className="text-xl">{habit?.icon || '•'}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white leading-tight">{habit?.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                         {item.status === 'completed' ? (
                           <CheckCircle2 size={12} className="text-emerald-500" />
                         ) : (
                           <XCircle size={12} className="text-red-500" />
                         )}
                         <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'completed' ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                           {t(item.status)}
                         </span>
                      </div>
                    </div>
                  </div>
                  {/* Visualización de la Nota */}
                  {item.note && (
                    <div className="mt-3 flex gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                      <MessageSquare size={12} className="text-neutral-600 mt-0.5" />
                      <p className="text-[11px] text-neutral-400 leading-relaxed italic">
                        "{item.note}"
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}