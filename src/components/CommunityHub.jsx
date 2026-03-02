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
/** Devuelve la fecha de hoy en formato "YYYY-MM-DD" UTC */
function todayUTC() {
  return new Date().toISOString().split('T')[0]
}

/** Devuelve el timestamp de hace 24 h en ISO */
function last24hISO() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CommunityHub({ user }) {
  const { t } = useLanguage()

  // ── Estado del Check-in ───────────────────────────────────────────────────
  const [checkedInToday, setCheckedInToday]   = useState(false)
  const [checkinLoading, setCheckinLoading]   = useState(false)
  const [checkinChecking, setCheckinChecking] = useState(true) // carga inicial
  const [activeCount, setActiveCount]         = useState(0)   // círculo global

  // ── Verificar si ya hizo check-in hoy + contador global ──────────────────
  const loadCheckinData = useCallback(async () => {
    if (!user?.id) return
    setCheckinChecking(true)
    try {
      // 1. ¿Ya hice check-in hoy?
      const { data: myRow } = await supabase
        .from('community_checkins')
        .select('id')
        .eq('user_id', user.id)
        .gte('checked_at', `${todayUTC()}T00:00:00.000Z`)
        .lte('checked_at', `${todayUTC()}T23:59:59.999Z`)
        .maybeSingle()

      setCheckedInToday(!!myRow)

      // 2. Contador de personas activas en las últimas 24 h (global)
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
        // Si ya existe (race condition), ignorar silenciosamente
        .select()
        .single()

      if (error && error.code !== '23505') {
        // 23505 = unique_violation → ya existía, no es un error real
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
    <div className="flex flex-col items-center justify-start flex-1 text-white px-6 pt-6 pb-32 text-center">
      <div className="w-full max-w-md space-y-4">

        {/* ── Cabecera ──────────────────────────────────────────────── */}
        <div className="text-left px-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Users size={16} className="text-neutral-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                {t('community_title')}
              </h2>
              <p className="text-[11px] text-neutral-500">{t('community_subtitle')}</p>
            </div>
          </div>
          <div className="mt-4 h-px bg-white/5" />
        </div>

        {/* ── Tu Círculo — contador global ──────────────────────────── */}
        <div className="bg-neutral-900/40 rounded-[2rem] border border-white/5 p-5 text-left relative overflow-hidden">
          <div className="absolute -top-16 right-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">
            {t('community_circle_title')}
          </p>
          <div className="flex items-center gap-4">
            {/* Número grande */}
            <div className="relative flex-shrink-0">
              <AnimatePresence mode="wait">
                <motion.span
                  key={activeCount}
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0,  scale: 1    }}
                  exit={{ opacity: 0, y: 8,  scale: 0.85 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 260 }}
                  className="text-4xl font-black text-white tabular-nums leading-none"
                >
                  {activeCount}
                </motion.span>
              </AnimatePresence>
            </div>
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

        {/* ── CHECK-IN ─────────────────────────────────────────────── */}
        <MotionDiv
          whileTap={!checkedInToday && !checkinLoading ? { scale: 0.98 } : {}}
          onClick={handleCheckIn}
          className={`flex items-center gap-3 rounded-2xl p-4 text-left border transition-all cursor-pointer select-none ${
            checkedInToday
              ? 'bg-emerald-500/8 border-emerald-500/20 cursor-default'
              : 'bg-neutral-900/60 border-white/5 hover:border-white/10 active:bg-neutral-900/80'
          }`}
        >
          {/* Icono */}
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors ${
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
              {checkedInToday
                ? t('community_checkin_done_title')
                : t('community_checkin_title')
              }
            </p>
            <p className={`text-[11px] mt-0.5 ${checkedInToday ? 'text-emerald-500/70' : 'text-neutral-500'}`}>
              {checkedInToday
                ? t('community_checkin_done_desc')
                : t('community_checkin_desc')
              }
            </p>
          </div>

          {/* Badge de estado */}
          <div className="flex-shrink-0">
            {checkedInToday ? (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                ✓ {t('community_checkin_done_badge')}
              </span>
            ) : (
              <span className="text-[11px] font-black text-neutral-400 bg-white/5 border border-white/8 px-3 py-1 rounded-full">
                {t('community_checkin_cta')}
              </span>
            )}
          </div>
        </MotionDiv>

        {/* ── Retos y Apoyo — PRÓXIMAMENTE ─────────────────────────── */}
        {[
          { id: 'challenge', icon: Trophy },
          { id: 'support',   icon: HeartHandshake },
        ].map(({ id, icon: Icon }) => (
          <MotionDiv
            key={id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-2xl p-4 text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
              <Icon size={16} className="text-neutral-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{t(`community_${id}_title`)}</p>
              <p className="text-[11px] text-neutral-500">{t(`community_${id}_desc`)}</p>
            </div>
            <span className="badge-subtle">{t('community_soon')}</span>
          </MotionDiv>
        ))}

        {/* ── Sección de Amigos ─────────────────────────────────────── */}
        <FriendsSection user={user} />

        {/* ── Momento de comunidad ──────────────────────────────────── */}
        <div className="bg-neutral-900/40 p-5 radius-card border border-white/5 shadow-apple-soft text-left">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
              <Sparkles size={16} className="text-neutral-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('community_moment_title')}</p>
              <p className="text-[11px] text-neutral-500">{t('community_moment_desc')}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}