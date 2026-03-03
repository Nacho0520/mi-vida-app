import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

// ── Helpers de normalización (copiados de App.jsx para mantener paridad) ──────

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

export function getTodayFrequencyCode() {
  const day = new Date().getDay()
  const map = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  return map[day]
}

export function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

// ── [NUEVO] Devuelve la fecha de ayer en formato YYYY-MM-DD ───────────────────
function getYesterdayDateString() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
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
    return value.map((item, index) => {
      if (!item) return null
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item)
          if (parsed && typeof parsed === 'object') {
            const title = parsed.title || parsed.name || ''
            if (!title) return null
            return { title, icon: parsed.icon || getDefaultIconForTitle(title, index), color: parsed.color || getDefaultColorForIndex(index) }
          }
        } catch { /* use plain string */ }
        return { title: item, icon: getDefaultIconForTitle(item, index), color: getDefaultColorForIndex(index) }
      }
      if (typeof item === 'object') {
        const title = item.title || item.name || ''
        if (!title) return null
        return { title, icon: item.icon || getDefaultIconForTitle(title, index), color: item.color || getDefaultColorForIndex(index) }
      }
      return null
    }).filter(Boolean)
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return normalizeMiniHabits(parsed)
    } catch { /* fallback */ }
    return value.split(',').map(v => v.trim()).filter(Boolean).map((raw, index) => {
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          const title = parsed.title || parsed.name || ''
          if (!title) return null
          return { title, icon: parsed.icon || getDefaultIconForTitle(title, index), color: parsed.color || getDefaultColorForIndex(index) }
        }
      } catch { /* use raw */ }
      return { title: raw, icon: getDefaultIconForTitle(raw, index), color: getDefaultColorForIndex(index) }
    }).filter(Boolean)
  }
  return []
}

/**
 * Gestiona la carga de hábitos del día y sus logs diarios.
 */
export function useHabits({ session, mode }) {
  const [habits, setHabits] = useState([])
  const [todayLogs, setTodayLogs] = useState([])
  // ── [NUEVO] Estado para el resumen de ayer ────────────────────────────────
  const [yesterdaySummary, setYesterdaySummary] = useState(null)

  const fetchTodayLogs = useCallback(async () => {
    if (!session) return
    const today = getTodayDateString()
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
    if (error) console.error('[useHabits] Error cargando daily_logs de hoy:', error.message)
    setTodayLogs(data || [])
  }, [session])

  // ── [NUEVO] Carga el resumen del día anterior (habit_id IS NULL) ──────────
  const fetchYesterdaySummary = useCallback(async () => {
    if (!session) return
    const yesterday = getYesterdayDateString()
    const { data, error } = await supabase
      .from('daily_logs')
      .select('score, mood, created_at')
      .eq('user_id', session.user.id)
      .is('habit_id', null)                              // registro de resumen diario
      .gte('created_at', `${yesterday}T00:00:00.000Z`)
      .lte('created_at', `${yesterday}T23:59:59.999Z`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[useHabits] Error cargando resumen de ayer:', error.message)
      return
    }
    // data puede ser null si el usuario no cerró el día ayer — es un caso válido
    setYesterdaySummary(data || null)
  }, [session])

  useEffect(() => {
    if (!session || mode === 'tutorial') return
    const fetchHabits = async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .eq('user_id', session.user.id)
      if (error) {
        console.error('[useHabits] Error cargando habits:', error.message)
        return
      }
      if (data) {
        const todayCode = getTodayFrequencyCode()
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)

        const filtered = data.filter((habit) => {
          // ── [NUEVO] Filtro de Modo Pausa ────────────────────────────────────
          // Si el hábito tiene paused_until y hoy es anterior a esa fecha,
          // no debe aparecer en la revisión de hoy.
          if (habit.paused_until) {
            const pausedUntil = new Date(habit.paused_until)
            pausedUntil.setHours(0, 0, 0, 0)
            if (todayDate < pausedUntil) return false
          }
          // ── Filtro de frecuencia (comportamiento original) ─────────────────
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

  // ── [NUEVO] Cargar el resumen de ayer al montar (solo una vez por sesión) ─
  useEffect(() => {
    if (session && mode !== 'tutorial') {
      fetchYesterdaySummary()
    }
  }, [session, mode, fetchYesterdaySummary])

  // Hábitos filtrados por Hard Day Mode
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

  return {
    habits,
    todayLogs,
    reviewHabits,
    fetchTodayLogs,
    // ── [NUEVO] ────────────────────────────────────────────────────────────
    yesterdaySummary,       // { score, mood } | null
    fetchYesterdaySummary,  // función manual por si se necesita refrescar
  }
}