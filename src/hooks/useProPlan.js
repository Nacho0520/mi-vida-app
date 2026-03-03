import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const VITE_TEST_EMAIL = import.meta.env.VITE_TEST_EMAIL || null

// Clave de localStorage para el override local del plan.
// Funciona para cualquier usuario — la cuenta test la tenía en exclusiva,
// ahora la comparten todos.
const LS_KEY = 'dayclose_plan_override' // 'pro' | 'free' | null (sin override)

/**
 * Gestiona el plan Pro del usuario.
 *
 * Jerarquía de resolución:
 *   1. isAdmin              → siempre PRO, sin override posible
 *   2. localOverride        → 'pro' | 'free'  (cualquier usuario puede toglear)
 *   3. BD (profiles.plan)  → valor real persistido
 *
 * El toggle guarda en localStorage para que sobreviva recargas, pero NO
 * modifica la BD — es un override de vista, exactamente como la cuenta test.
 */
export function useProPlan({ session, isAdmin }) {
  // ── Plan real de BD ───────────────────────────────────────────────────────
  const [dbIsPro, setDbIsPro] = useState(false)

  // ── Override local (cualquier usuario) ───────────────────────────────────
  // null  → sin override, usar el valor de BD
  // 'pro' → simular PRO
  // 'free'→ simular FREE
  const [localOverride, setLocalOverride] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) || null
    } catch { return null }
  })

  // ── Compatibilidad hacia atrás: cuenta test usaba 'dayclose_simulate_free' ─
  const isTestAccount = VITE_TEST_EMAIL
    ? session?.user?.email === VITE_TEST_EMAIL
    : false

  // ── Plan efectivo ─────────────────────────────────────────────────────────
  // Admin → siempre PRO, nunca se puede bajar a FREE mediante toggle
  // Otros → override local si existe, si no el valor de BD
  const effectiveIsPro = isAdmin
    ? true
    : localOverride !== null
      ? localOverride === 'pro'
      : dbIsPro

  // ── Resolución del plan desde BD ──────────────────────────────────────────
  const resolveDbIsPro = (profileData) => {
    if (profileData?.plan !== 'pro') return false
    const expiresAt = profileData?.pro_expires_at
    if (!expiresAt) return true
    return new Date(expiresAt) > new Date()
  }

  useEffect(() => {
    if (!session) return
    const loadPlan = async () => {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('plan, pro_expires_at')
        .eq('id', session.user.id)
        .single()
      if (error) console.error('[useProPlan] Error:', error.message)
      setDbIsPro(resolveDbIsPro(profileData))
    }
    loadPlan()
  }, [session, isAdmin])

  // ── Toggle — igual para todos, igual que la cuenta test ──────────────────
  // Alterna entre 'pro' y 'free'.
  // Si el usuario está en el estado real de BD, el primer toggle lo lleva
  // al estado opuesto (independientemente de cuál sea el real).
  const handleToggleTestPro = () => {
    setLocalOverride(prev => {
      // Estado actual efectivo (lo que ve el usuario antes de pulsar)
      const currentEffective = isAdmin ? true : (prev !== null ? prev === 'pro' : dbIsPro)
      const next = currentEffective ? 'free' : 'pro'
      try {
        localStorage.setItem(LS_KEY, next)
        // Limpiar la clave antigua de la cuenta test para evitar conflictos
        localStorage.removeItem('dayclose_simulate_free')
      } catch {}
      return next
    })
  }

  // ── Resetear override (opcional — para restaurar el valor real de BD) ────
  const resetPlanOverride = () => {
    setLocalOverride(null)
    try {
      localStorage.removeItem(LS_KEY)
      localStorage.removeItem('dayclose_simulate_free')
    } catch {}
  }

  // isPro se mantiene como alias de dbIsPro para no romper nada que lo use
  return {
    isPro: effectiveIsPro,        // ← efectivo (con override aplicado)
    isTestAccount,                // ← para compatibilidad
    effectiveIsPro,               // ← idéntico a isPro, alias explícito
    handleToggleTestPro,          // ← toggle para cualquier usuario
    resetPlanOverride,            // ← extra: restaurar estado real
    hasLocalOverride: localOverride !== null,  // ← saber si hay override activo
  }
}