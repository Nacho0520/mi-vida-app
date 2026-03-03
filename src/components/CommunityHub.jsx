import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Sparkles, HeartHandshake, Trophy,
  MessageCircle, CheckCircle2, Loader2, Send, X,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabaseClient'
import FriendsSection from './FriendsSection'

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayUTC() {
  return new Date().toISOString().split('T')[0]
}
function last24hISO() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}
function nowISO() {
  return new Date().toISOString()
}

// Emojis de apoyo disponibles
const SUPPORT_EMOJIS = [
  { type: 'high-five', emoji: '🙌', label: '¡Choca esos cinco!' },
  { type: 'fire',      emoji: '🔥', label: '¡Estás en llamas!'  },
  { type: 'heart',     emoji: '❤️', label: '¡Te apoyo!'          },
]

// ── Sub-componente: Toast de apoyos recibidos ─────────────────────────────────
function SupportToast({ items, onDismiss }) {
  if (!items.length) return null
  return (
    <AnimatePresence>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0,  scale: 1   }}
          exit={{    opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 18, stiffness: 280 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl"
        >
          <span className="text-2xl">{item.emoji}</span>
          <div>
            <p className="text-sm font-black text-white">{item.label}</p>
            <p className="text-[10px] text-neutral-500">
              {item.sender_name} te envió apoyo
            </p>
          </div>
          <button
            onClick={() => onDismiss(item.id)}
            className="ml-2 text-neutral-600 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CommunityHub({ user, friends = [], isPro = false, onUpgrade }) {
  const { t } = useLanguage()

  // ── Check-in ──────────────────────────────────────────────────────────────
  const [checkedInToday,  setCheckedInToday]  = useState(false)
  const [checkinLoading,  setCheckinLoading]  = useState(false)
  const [checkinChecking, setCheckinChecking] = useState(true)
  const [activeCount,     setActiveCount]     = useState(0)

  // ── Reto 7 días ───────────────────────────────────────────────────────────
  const [challenge,         setChallenge]         = useState(null)  // row de BD o null
  const [challengeLoading,  setChallengeLoading]  = useState(false)

  // ── Apoyo en un toque ─────────────────────────────────────────────────────
  const [supportMenuOpen,   setSupportMenuOpen]   = useState(false)   // qué amigo
  const [supportTarget,     setSupportTarget]     = useState(null)    // { id, name }
  const [supportSending,    setSupportSending]    = useState(false)
  const [supportToasts,     setSupportToasts]     = useState([])      // apoyos recibidos
  const [sentToday,         setSentToday]         = useState(new Set())// IDs de amigos ya apoyados hoy

  // ── Momentos compartidos ──────────────────────────────────────────────────
  const [moments,           setMoments]           = useState([])
  const [momentInput,       setMomentInput]       = useState('')
  const [momentEmoji,       setMomentEmoji]       = useState('✨')
  const [momentModalOpen,   setMomentModalOpen]   = useState(false)
  const [momentSaving,      setMomentSaving]      = useState(false)
  const [myMoment,          setMyMoment]          = useState(null)   // momento propio activo

  // ── Carga inicial ─────────────────────────────────────────────────────────
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
      console.error('[CommunityHub] checkin data:', err.message)
    } finally {
      setCheckinChecking(false)
    }
  }, [user?.id])

  const loadChallenge = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('community_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    setChallenge(data || null)
  }, [user?.id])

  const loadMoments = useCallback(async () => {
    if (!user?.id) return
    // Momentos de todos (vigentes)
    const { data } = await supabase
      .from('shared_moments')
      .select('id, user_id, content, emoji, expires_at, created_at')
      .gte('expires_at', nowISO())
      .order('created_at', { ascending: false })
      .limit(20)
    setMoments(data || [])
    const mine = (data || []).find(m => m.user_id === user.id)
    setMyMoment(mine || null)
  }, [user?.id])

  const loadSupportReceived = useCallback(async () => {
    if (!user?.id) return
    // Apoyos no vistos dirigidos a mí
    const { data } = await supabase
      .from('community_support')
      .select('id, sender_id, type, created_at')
      .eq('receiver_id', user.id)
      .eq('seen', false)
      .gte('created_at', last24hISO())
    if (!data?.length) return

    // Mapear a toasts
    const toasts = data.map(s => ({
      id:          s.id,
      emoji:       SUPPORT_EMOJIS.find(e => e.type === s.type)?.emoji ?? '🙌',
      label:       SUPPORT_EMOJIS.find(e => e.type === s.type)?.label ?? '¡Apoyo!',
      sender_name: 'Un amigo',
    }))
    setSupportToasts(toasts)

    // Marcar como vistos
    await supabase
      .from('community_support')
      .update({ seen: true })
      .in('id', data.map(s => s.id))
  }, [user?.id])

  useEffect(() => {
    loadCheckinData()
    loadChallenge()
    loadMoments()
    loadSupportReceived()
  }, [loadCheckinData, loadChallenge, loadMoments, loadSupportReceived])

  // ── Check-in ──────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (checkedInToday || checkinLoading || !user?.id) return
    setCheckinLoading(true)
    try {
      const { error } = await supabase
        .from('community_checkins')
        .insert({ user_id: user.id, mood_emoji: null })
        .select().single()
      if (error && error.code !== '23505') {
        console.error('[CommunityHub] insert checkin:', error.message)
      } else {
        setCheckedInToday(true)
        setActiveCount(prev => prev + 1)
        // Si hay reto activo, añadir hoy a confirmed_days
        if (challenge?.id) {
          const today = todayUTC()
          const newDays = Array.from(new Set([
            ...(challenge.confirmed_days || []),
            today,
          ]))
          const completed = newDays.length >= 7
          const { data: updated } = await supabase
            .from('community_challenges')
            .update({
              confirmed_days: newDays,
              status: completed ? 'completed' : 'active',
            })
            .eq('id', challenge.id)
            .select().single()
          setChallenge(updated)
        }
      }
    } finally {
      setCheckinLoading(false)
    }
  }

  // ── Reto 7 días ───────────────────────────────────────────────────────────
  const handleStartChallenge = async () => {
    if (challenge || challengeLoading || !user?.id) return
    setChallengeLoading(true)
    try {
      const today = todayUTC()
      const { data, error } = await supabase
        .from('community_challenges')
        .insert({
          user_id:        user.id,
          start_date:     today,
          confirmed_days: checkedInToday ? [today] : [],
          status:         'active',
        })
        .select().single()
      if (error) console.error('[CommunityHub] start challenge:', error.message)
      else setChallenge(data)
    } finally {
      setChallengeLoading(false)
    }
  }

  const challengeDays   = challenge?.confirmed_days?.length ?? 0
  const challengeDone   = challenge?.status === 'completed'
  const challengeActive = !!challenge && !challengeDone

  // ── Apoyo en un toque ─────────────────────────────────────────────────────
  const handleSendSupport = async (type) => {
    if (!supportTarget?.id || supportSending) return
    setSupportSending(true)
    try {
      const { error } = await supabase
        .from('community_support')
        .insert({ sender_id: user.id, receiver_id: supportTarget.id, type })
      if (!error) {
        setSentToday(prev => new Set([...prev, supportTarget.id]))
      }
    } finally {
      setSupportSending(false)
      setSupportMenuOpen(false)
      setSupportTarget(null)
    }
  }

  // ── Momentos compartidos ──────────────────────────────────────────────────
  const handlePostMoment = async () => {
    if (!momentInput.trim() || momentSaving || !user?.id) return
    setMomentSaving(true)
    try {
      // Eliminar momento previo propio si existe
      if (myMoment) {
        await supabase.from('shared_moments').delete().eq('id', myMoment.id)
      }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const { error } = await supabase
        .from('shared_moments')
        .insert({
          user_id:    user.id,
          content:    momentInput.trim().slice(0, 50),
          emoji:      momentEmoji,
          expires_at: expiresAt,
        })
      if (error) console.error('[CommunityHub] post moment:', error.message)
      else {
        setMomentInput('')
        setMomentModalOpen(false)
        await loadMoments()
      }
    } finally {
      setMomentSaving(false)
    }
  }

  const handleDeleteMoment = async () => {
    if (!myMoment) return
    await supabase.from('shared_moments').delete().eq('id', myMoment.id)
    setMyMoment(null)
    setMoments(prev => prev.filter(m => m.id !== myMoment.id))
  }

  // ── EMOJIS selector de momento ────────────────────────────────────────────
  const MOMENT_EMOJIS = ['✨','🎯','💪','🌱','🔥','😌','🚀','❤️','🏆','🌟']

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
          2. TU CÍRCULO
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 right-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">
          {t('community_circle_title')}
        </p>
        <div className="flex items-center gap-4">
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
          3. FEED DE MOMENTOS (carrusel horizontal)
      ══════════════════════════════════════════════════════════════ */}
      {moments.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3 px-1">
            {t('community_moments_feed_title')}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {moments.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex-shrink-0 w-36 rounded-[1.5rem] border p-3 relative ${
                  m.user_id === user.id
                    ? 'bg-violet-500/8 border-violet-500/20'
                    : 'bg-neutral-900/60 border-white/5'
                }`}
              >
                <span className="text-2xl mb-1 block">{m.emoji}</span>
                <p className="text-[11px] text-white font-medium leading-snug line-clamp-3">
                  {m.content}
                </p>
                {m.user_id === user.id && (
                  <button
                    onClick={handleDeleteMoment}
                    className="absolute top-2 right-2 h-5 w-5 rounded-full bg-white/5 flex items-center justify-center text-neutral-600 hover:text-white transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          4. LISTA DE ACCIONES
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">
          {t('community_features_title')}
        </p>

        {/* ── CHECK-IN ─────────────────────────────────────────── */}
        <motion.div
          whileTap={!checkedInToday && !checkinLoading ? { scale: 0.95 } : {}}
          onClick={handleCheckIn}
          className={`flex items-center gap-3 rounded-[1.5rem] p-4 border transition-all ${
            checkedInToday
              ? 'bg-emerald-500/5 border-emerald-500/15 cursor-default'
              : 'bg-neutral-900/60 border-white/5 hover:border-white/10 cursor-pointer'
          }`}
        >
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
            checkedInToday ? 'bg-emerald-500/15 border-emerald-500/20' : 'bg-white/5 border-white/5'
          }`}>
            {checkinChecking
              ? <Loader2 size={16} className="text-neutral-500 animate-spin" />
              : checkedInToday
                ? <CheckCircle2 size={16} className="text-emerald-400" />
                : checkinLoading
                  ? <Loader2 size={16} className="text-neutral-400 animate-spin" />
                  : <MessageCircle size={16} className="text-neutral-300" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${checkedInToday ? 'text-emerald-300' : 'text-white'}`}>
              {checkedInToday ? t('community_checkin_done_title') : t('community_checkin_title')}
            </p>
            <p className={`text-[11px] mt-0.5 ${checkedInToday ? 'text-emerald-500/70' : 'text-neutral-500'}`}>
              {checkedInToday ? t('community_checkin_done_desc') : t('community_checkin_desc')}
            </p>
          </div>
          {checkedInToday ? (
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
              ✓ {t('community_checkin_done_badge')}
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-black text-neutral-400 bg-neutral-800/60 border border-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
              {t('community_checkin_cta')}
            </span>
          )}
        </motion.div>

        {/* ── RETO 7 DÍAS ───────────────────────────────────────── */}
        <motion.div
          whileTap={!challengeActive && !challengeDone ? { scale: 0.95 } : {}}
          onClick={!challenge && !challengeLoading ? handleStartChallenge : undefined}
          className={`flex items-center gap-3 rounded-[1.5rem] p-4 border transition-all ${
            challengeDone
              ? 'bg-amber-500/8 border-amber-500/20 cursor-default'
              : challengeActive
                ? 'bg-neutral-900/60 border-white/5 cursor-default'
                : 'bg-neutral-900/60 border-white/5 cursor-pointer hover:border-white/10'
          }`}
        >
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
            challengeDone ? 'bg-amber-500/15 border-amber-500/20' : 'bg-white/5 border-white/5'
          }`}>
            {challengeLoading
              ? <Loader2 size={16} className="text-neutral-400 animate-spin" />
              : <Trophy size={16} className={challengeDone ? 'text-amber-400' : 'text-neutral-300'} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${challengeDone ? 'text-amber-300' : 'text-white'}`}>
              {challengeDone ? t('community_challenge_done_title') : t('community_challenge_title')}
            </p>
            {/* Barra de 7 puntos */}
            {challengeActive && (
              <div className="flex items-center gap-1 mt-1.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < challengeDays ? 'bg-amber-400' : 'bg-neutral-700'
                    }`}
                  />
                ))}
                <span className="text-[10px] text-neutral-500 ml-1 tabular-nums">{challengeDays}/7</span>
              </div>
            )}
            {!challengeActive && !challengeDone && (
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {t('community_challenge_desc')}
              </p>
            )}
            {challengeDone && (
              <p className="text-[11px] text-amber-500/70 mt-0.5">
                {t('community_challenge_done_desc')}
              </p>
            )}
          </div>
          {challengeDone ? (
            <span className="shrink-0 text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
              🏆
            </span>
          ) : !challenge ? (
            <span className="shrink-0 text-[10px] font-black text-neutral-400 bg-neutral-800/60 border border-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
              {t('community_challenge_cta')}
            </span>
          ) : null}
        </motion.div>

        {/* ── APOYO EN UN TOQUE ─────────────────────────────────── */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (friends.length > 0) {
              setSupportTarget(friends[0])
              setSupportMenuOpen(true)
            }
          }}
          className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4 cursor-pointer hover:border-white/10 transition-all"
        >
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
            <HeartHandshake size={16} className="text-neutral-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t('community_support_title')}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">{t('community_support_desc')}</p>
          </div>
          {friends.length === 0 ? (
            <span className="shrink-0 text-[10px] font-black text-neutral-500 bg-neutral-800/60 border border-white/5 px-2.5 py-1 rounded-full uppercase tracking-widest">
              {t('community_support_no_friends')}
            </span>
          ) : (
            <span className="text-xl leading-none shrink-0">🙌</span>
          )}
        </motion.div>

        {/* ── MOMENTO COMPARTIDO ────────────────────────────────── */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={() => setMomentModalOpen(true)}
          className={`flex items-center gap-3 rounded-[1.5rem] p-4 border cursor-pointer hover:border-white/10 transition-all ${
            myMoment ? 'bg-violet-500/5 border-violet-500/15' : 'bg-neutral-900/60 border-white/5'
          }`}
        >
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
            myMoment ? 'bg-violet-500/15 border-violet-500/20' : 'bg-white/5 border-white/5'
          }`}>
            <Sparkles size={16} className={myMoment ? 'text-violet-400' : 'text-neutral-300'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${myMoment ? 'text-violet-300' : 'text-white'}`}>
              {myMoment ? t('community_moment_active_title') : t('community_moment_title')}
            </p>
            <p className={`text-[11px] mt-0.5 truncate ${myMoment ? 'text-violet-500/70' : 'text-neutral-500'}`}>
              {myMoment ? `${myMoment.emoji} ${myMoment.content}` : t('community_moment_desc')}
            </p>
          </div>
          {myMoment ? (
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
              ✓
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-black text-neutral-400 bg-neutral-800/60 border border-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
              {t('community_moment_cta')}
            </span>
          )}
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          5. AMIGOS (al final)
      ══════════════════════════════════════════════════════════════ */}
      <FriendsSection user={user} />

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Apoyo en un toque
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {supportMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9000] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => { setSupportMenuOpen(false); setSupportTarget(null) }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0,  opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-neutral-900 rounded-[2rem] border border-white/10 p-6 shadow-2xl"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">
                {t('community_support_modal_title')}
              </p>

              {/* Selector de amigo */}
              {friends.length > 1 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {friends.map(f => (
                    <button
                      key={f.friend_id}
                      onClick={() => setSupportTarget({ id: f.friend_id, name: f.display_name })}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                        supportTarget?.id === f.friend_id
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 border-white/10 text-neutral-300'
                      }`}
                    >
                      {f.display_name}
                    </button>
                  ))}
                </div>
              )}

              {/* Emojis de apoyo */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {SUPPORT_EMOJIS.map(({ type, emoji, label }) => {
                  const alreadySent = sentToday.has(supportTarget?.id)
                  return (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.88 }}
                      disabled={supportSending || alreadySent}
                      onClick={() => handleSendSupport(type)}
                      className="flex flex-col items-center gap-1 p-4 rounded-[1.5rem] bg-neutral-800/60 border border-white/5 hover:border-white/15 transition-all disabled:opacity-40"
                    >
                      <span className="text-3xl">{emoji}</span>
                      <span className="text-[10px] text-neutral-500 font-medium text-center leading-tight">
                        {label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>

              {sentToday.has(supportTarget?.id) && (
                <p className="text-[11px] text-emerald-400 text-center font-semibold">
                  ✓ {t('community_support_sent')}
                </p>
              )}

              <button
                onClick={() => { setSupportMenuOpen(false); setSupportTarget(null) }}
                className="w-full mt-3 py-3 text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                {t('community_support_cancel')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Momento compartido
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {momentModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setMomentModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -16 }}
              animate={{ opacity: 1, scale: 1,   y: 0   }}
              exit={{    opacity: 0, scale: 0.9, y: -16  }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-neutral-900 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl"
              style={{ transformOrigin: 'top center' }}
            >
              {/* Franja decorativa */}
              <div className="h-1.5 w-full bg-gradient-to-r from-violet-500/50 via-fuchsia-500/50 to-violet-500/50" />

              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <Sparkles size={16} className="text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-sm leading-none">
                        {t('community_moment_modal_title')}
                      </h3>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">
                        {t('community_moment_modal_subtitle')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMomentModalOpen(false)}
                    className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Selector de emoji */}
                <div className="flex gap-2 flex-wrap mb-3">
                  {MOMENT_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setMomentEmoji(e)}
                      className={`text-xl p-1.5 rounded-xl transition-all ${
                        momentEmoji === e
                          ? 'bg-white/15 scale-110'
                          : 'opacity-50 hover:opacity-100'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="relative mb-4">
                  <input
                    autoFocus
                    value={momentInput}
                    onChange={e => setMomentInput(e.target.value.slice(0, 50))}
                    placeholder={t('community_moment_placeholder')}
                    className="w-full bg-neutral-950/60 border border-white/8 rounded-2xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-violet-500/40 pr-12"
                    onKeyDown={e => e.key === 'Enter' && handlePostMoment()}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 tabular-nums">
                    {momentInput.length}/50
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMomentModalOpen(false)}
                    className="flex-1 py-3 text-xs font-black text-neutral-600 hover:text-neutral-400 transition-colors"
                  >
                    {t('community_moment_cancel')}
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePostMoment}
                    disabled={!momentInput.trim() || momentSaving}
                    className="flex-1 py-3 bg-white text-black text-xs font-black rounded-2xl active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {momentSaving
                      ? <Loader2 size={14} className="animate-spin" />
                      : <><Send size={12} /> {t('community_moment_publish')}</>
                    }
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          TOASTS: Apoyos recibidos
      ══════════════════════════════════════════════════════════════ */}
      <SupportToast
        items={supportToasts}
        onDismiss={(id) => setSupportToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  )
}