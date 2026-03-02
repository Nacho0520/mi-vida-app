import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Sparkles, HeartHandshake, Trophy,
  MessageCircle, CheckCircle2, Loader2,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabaseClient'
import FriendsSection from './FriendsSection'

const MotionDiv = motion.div

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayUTC() {
  return new Date().toISOString().split('T')[0]
}
function last24hISO() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CommunityHub({ user }) {
  const { t } = useLanguage()

  const [checkedInToday,  setCheckedInToday]  = useState(false)
  const [checkinLoading,  setCheckinLoading]  = useState(false)
  const [checkinChecking, setCheckinChecking] = useState(true)
  const [activeCount,     setActiveCount]     = useState(0)

  // ── Carga inicial: estado del check-in + contador global ─────────────────
  const loadCheckinData = useCallback(async () => {
    if (!user?.id) return
    setCheckinChecking(true)
    try {
      const { data: myRow } = await supabase
        .from('community_checkins')
        .select('id')
        .eq('user_id', user.id)
        .gte('checked_at', `${todayUTC()}T00:00:00.000Z`)
        .lte('checked_at', `${todayUTC()}T23:59:59.999Z`)
        .maybeSingle()
      setCheckedInToday(!!myRow)

      const { count } = await supabase
        .from('community_checkins')
        .select('id', { count: 'exact', head: true })
        .gte('checked_at', last24hISO())
      setActiveCount(count ?? 0)
    } catch (err) {
      console.error('[CommunityHub] Error cargando check-in data:', err.message)
    } finally {
      setCheckinChecking(false)
    }
  }, [user?.id])

  useEffect(() => { loadCheckinData() }, [loadCheckinData])

  // ── Acción: hacer check-in ────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (checkedInToday || checkinLoading || !user?.id) return
    setCheckinLoading(true)
    try {
      const { error } = await supabase
        .from('community_checkins')
        .insert({ user_id: user.id, mood_emoji: null })
        .select()
        .single()
      if (error && error.code !== '23505') {
        console.error('[CommunityHub] Error insertando check-in:', error.message)
      } else {
        setCheckedInToday(true)
        setActiveCount(prev => prev + 1)
      }
    } finally {
      setCheckinLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-6 pt-6 pb-32 space-y-6">

      {/* ══════════════════════════════════════════════════════════════
          1. CABECERA
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <Users size={16} className="text-neutral-300" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
            {t('community_title')}
          </h2>
          <p className="text-[11px] text-neutral-500">{t('community_subtitle')}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. SECCIÓN RESUMEN — Tu Círculo (impacto inmediato)
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 right-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">
          {t('community_circle_title')}
        </p>

        <div className="flex items-center gap-4">
          {/* Número animado */}
          <AnimatePresence mode="wait">
            <motion.span
              key={activeCount}
              initial={{ opacity: 0, y: -8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y:  8, scale: 0.85 }}
              transition={{ type: 'spring', damping: 18, stiffness: 260 }}
              className="text-5xl font-black text-white tabular-nums leading-none shrink-0"
            >
              {activeCount}
            </motion.span>
          </AnimatePresence>

          <div>
            <p className="text-sm font-semibold text-white leading-snug">
              {t('community_circle_label')}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {t('community_circle_desc')}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          3. LISTA DE FUNCIONES — filas uniformes
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl space-y-2">

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">
          {t('community_features_title')}
        </p>

        {/* ── CHECK-IN (activo) ─────────────────────────────────── */}
        <MotionDiv
          whileTap={!checkedInToday && !checkinLoading ? { scale: 0.98 } : {}}
          onClick={handleCheckIn}
          className={`flex items-center gap-3 rounded-[1.5rem] p-4 border transition-all ${
            checkedInToday
              ? 'bg-emerald-500/5 border-emerald-500/15 cursor-default'
              : 'bg-neutral-900/60 border-white/5 hover:border-white/10 cursor-pointer active:bg-neutral-900/80'
          }`}
        >
          {/* Icono */}
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
            checkedInToday
              ? 'bg-emerald-500/15 border-emerald-500/20'
              : 'bg-white/5 border-white/5'
          }`}>
            {checkinChecking ? (
              <Loader2 size={16} className="text-neutral-500 animate-spin" />
            ) : checkedInToday ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : checkinLoading ? (
              <Loader2 size={16} className="text-neutral-400 animate-spin" />
            ) : (
              <MessageCircle size={16} className="text-neutral-300" />
            )}
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${checkedInToday ? 'text-emerald-300' : 'text-white'}`}>
              {checkedInToday ? t('community_checkin_done_title') : t('community_checkin_title')}
            </p>
            <p className={`text-[11px] mt-0.5 ${checkedInToday ? 'text-emerald-500/70' : 'text-neutral-500'}`}>
              {checkedInToday ? t('community_checkin_done_desc') : t('community_checkin_desc')}
            </p>
          </div>

          {/* Badge — violeta si completado, CTA si pendiente */}
          {checkedInToday ? (
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
              ✓ {t('community_checkin_done_badge')}
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-black text-neutral-400 bg-neutral-800/60 border border-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
              {t('community_checkin_cta')}
            </span>
          )}
        </MotionDiv>

        {/* ── RETO 7 DÍAS (próximamente) ───────────────────────── */}
        <div className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
            <Trophy size={16} className="text-neutral-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t('community_challenge_title')}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">{t('community_challenge_desc')}</p>
          </div>
          {/* Badge gris neutro — PRÓXIMAMENTE */}
          <span className="shrink-0 text-[10px] font-black text-neutral-500 bg-neutral-800/60 border border-white/5 px-2.5 py-1 rounded-full uppercase tracking-widest">
            {t('community_soon')}
          </span>
        </div>

        {/* ── APOYO MUTUO (próximamente) ───────────────────────── */}
        <div className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
            <HeartHandshake size={16} className="text-neutral-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t('community_support_title')}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">{t('community_support_desc')}</p>
          </div>
          {/* Badge gris neutro — PRÓXIMAMENTE */}
          <span className="shrink-0 text-[10px] font-black text-neutral-500 bg-neutral-800/60 border border-white/5 px-2.5 py-1 rounded-full uppercase tracking-widest">
            {t('community_soon')}
          </span>
        </div>

        {/* ── MOMENTO DE COMUNIDAD ─────────────────────────────── */}
        <div className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-neutral-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t('community_moment_title')}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">{t('community_moment_desc')}</p>
          </div>
          {/* Badge gris neutro — PRÓXIMAMENTE */}
          <span className="shrink-0 text-[10px] font-black text-neutral-500 bg-neutral-800/60 border border-white/5 px-2.5 py-1 rounded-full uppercase tracking-widest">
            {t('community_soon')}
          </span>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          4. SECCIÓN DE GESTIÓN — Amigos (al final)
      ══════════════════════════════════════════════════════════════ */}
      <FriendsSection user={user} />

    </div>
  )
}