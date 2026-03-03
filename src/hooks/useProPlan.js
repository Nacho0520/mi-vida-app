import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const LS_KEY = 'dayclose_plan_override'

export function useProPlan({ session, isAdmin }) {
  const [dbIsPro, setDbIsPro] = useState(false)
  const [localOverride, setLocalOverride] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) || null
    } catch { return null }
  })

  // ── [FIX] Nueva Jerarquía: El override manda para permitir pruebas ──
  // Si hay override (botón pulsado), usamos eso. 
  // Si no, comprobamos si es Admin o si tiene Pro en la BD.
  const effectiveIsPro = localOverride !== null 
    ? localOverride === 'pro' 
    : (isAdmin || dbIsPro);

  const resolveDbIsPro = (profileData) => {
    if (profileData?.plan !== 'pro') return false
    const expiresAt = profileData?.pro_expires_at
    if (!expiresAt) return true
    return new Date(expiresAt) > new Date()
  }

  useEffect(() => {
    if (!session) return
    const loadPlan = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, pro_expires_at')
        .eq('id', session.user.id)
        .single()
      setDbIsPro(resolveDbIsPro(profileData))
    }
    loadPlan()
  }, [session])

  const handleToggleTestPro = () => {
    setLocalOverride(prev => {
      // Calculamos el siguiente estado basándonos en el actual efectivo
      const next = effectiveIsPro ? 'free' : 'pro'
      try {
        localStorage.setItem(LS_KEY, next)
      } catch {}
      return next
    })
  }

  return {
    isPro: effectiveIsPro,
    effectiveIsPro,
    handleToggleTestPro,
    hasLocalOverride: localOverride !== null,
  }
}