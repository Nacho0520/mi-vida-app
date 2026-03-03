import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, X, Check, UserPlus, Loader2, CheckCircle2, Clock, Mail } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabaseClient'
import {
  acceptFriendCode,
  acceptFriendInvite,
  createFriendCode,
  createFriendInvite,
  createFriendRequest,
  getFriendSummary,
  respondFriendRequest,
  searchUserByEmail
} from '../lib/friends'

const MotionDiv = motion.div
const DAY_MS           = 24 * 60 * 60 * 1000
const FRIENDS_NEW_KEY  = 'dayclose_friends_new_since'
const FRIENDS_NEW_DAYS = 3

// ── Traduce códigos de error de Supabase a mensajes amigables ─────────────────
function friendlyError(error, t) {
  const msg  = error?.message || ''
  const code = error?.code    || ''
  // unique constraint de friend_invites (uq_email_invite o 23505 genérico)
  if (code === '23505' || msg.includes('uq_email_invite') || msg.includes('duplicate')) {
    return t('friends_error_duplicate')
  }
  // fk violation (usuario no encontrado)
  if (code === '23503') return t('friends_error_not_found')
  return error?.message || t('friends_error')
}

export default function FriendsSection({ user, onDataChange }) {
  const { t } = useLanguage()

  // ── Estado base ───────────────────────────────────────────────────────────
  const [isFriendsOpen,   setIsFriendsOpen]   = useState(false)
  const [showFriendsNew,  setShowFriendsNew]  = useState(false)
  const [friends,         setFriends]         = useState([])
  const [pendingIncoming, setPendingIncoming] = useState([])
  const [pendingOutgoing, setPendingOutgoing] = useState([])
  const [pendingInvites,  setPendingInvites]  = useState([])   // recibidas por email
  const [outgoingInvites, setOutgoingInvites] = useState([])   // enviadas por email
  const [friendsLoading,  setFriendsLoading]  = useState(false)
  const [friendTab,       setFriendTab]       = useState('email')

  // ── Campos de formulario ──────────────────────────────────────────────────
  const [inviteEmail,   setInviteEmail]   = useState('')
  const [searchEmail,   setSearchEmail]   = useState('')
  const [searchResult,  setSearchResult]  = useState(null)
  const [searchMessage, setSearchMessage] = useState('')
  const [friendCode,    setFriendCode]    = useState('')
  const [codeInput,     setCodeInput]     = useState('')

  // ── Estado de UX por tab ──────────────────────────────────────────────────
  // 'idle' | 'sending' | 'success' | 'error'
  const [inviteStatus,   setInviteStatus]  = useState('idle')
  const [inviteErrMsg,   setInviteErrMsg]  = useState('')
  const [requestStatus,  setRequestStatus] = useState('idle')
  const [requestErrMsg,  setRequestErrMsg] = useState('')
  const [codeStatus,     setCodeStatus]    = useState('idle')
  const [codeErrMsg,     setCodeErrMsg]    = useState('')

  const autoCloseRef = useRef(null)

  const renderPortal = (node) => {
    if (typeof document === 'undefined') return null
    return createPortal(node, document.body)
  }

  // ── Carga de datos ────────────────────────────────────────────────────────
  const loadFriends = useCallback(async () => {
    if (!user) return
    setFriendsLoading(true)
    try {
      const summary = await getFriendSummary()
      setFriends(summary)

      // Solicitudes directas (friendships)
      const { data: requests } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, created_at, requester:requester_id(email, full_name), addressee:addressee_id(email, full_name)')
        .eq('status', 'pending')

      setPendingIncoming((requests || []).filter(r => r.addressee_id === user.id))
      setPendingOutgoing((requests || []).filter(r => r.requester_id === user.id))

      // Invitaciones por email
      const { data: invites } = await supabase
        .from('friend_invites')
        .select('id, inviter_id, invitee_email, created_at, inviter:inviter_id(email, full_name)')
        .eq('status', 'pending')

      const myEmailLower = user.email?.toLowerCase()

      // Recibidas: alguien me invitó a mí
      setPendingInvites(
        (invites || []).filter(inv => inv.invitee_email?.toLowerCase() === myEmailLower)
      )
      // Enviadas: yo invité a alguien
      setOutgoingInvites(
        (invites || []).filter(inv => inv.inviter_id === user.id)
      )

      // Código de amigo
      const { data: codeRow } = await supabase
        .from('friend_codes').select('code').eq('user_id', user.id).maybeSingle()
      setFriendCode(codeRow?.code || '')

      // Notificar al padre si quiere los datos (e.g. CommunityHub)
      onDataChange?.({ friends: summary })
    } catch (err) {
      console.error('[FriendsSection] loadFriends:', err.message)
    } finally {
      setFriendsLoading(false)
    }
  }, [user, onDataChange])

  useEffect(() => { if (user?.id) loadFriends() }, [user?.id])
  useEffect(() => { if (isFriendsOpen) loadFriends() }, [isFriendsOpen])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FRIENDS_NEW_KEY)
      const since  = stored ? Number(stored) : Date.now()
      if (!stored) localStorage.setItem(FRIENDS_NEW_KEY, String(since))
      setShowFriendsNew((Date.now() - since) / DAY_MS <= FRIENDS_NEW_DAYS)
    } catch { setShowFriendsNew(false) }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('open') === 'friends') {
      setIsFriendsOpen(true)
    }
  }, [])

  useEffect(() => () => { if (autoCloseRef.current) clearTimeout(autoCloseRef.current) }, [])

  // ── Cerrar modal completamente ────────────────────────────────────────────
  const closeModal = () => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current)
    setIsFriendsOpen(false)
    setInviteStatus('idle'); setInviteErrMsg('')
    setRequestStatus('idle'); setRequestErrMsg('')
    setCodeStatus('idle'); setCodeErrMsg('')
    setSearchResult(null); setSearchMessage('')
  }

  // ── Éxito: pantalla de confirmación + cierre automático ──────────────────
  const triggerSuccess = (setStatus, onReset) => {
    setStatus('success')
    autoCloseRef.current = setTimeout(() => {
      closeModal()
      setStatus('idle')
      onReset?.()
      loadFriends()
    }, 2000)
  }

  // ── Notificación push ─────────────────────────────────────────────────────
  const notifyFriendRequest = async (targetUserId) => {
    if (!targetUserId) return
    const senderName = user?.user_metadata?.full_name || user?.email || t('friends_request_unknown')
    try {
      await supabase.functions.invoke('push-notification', {
        body: {
          title:    t('friends_push_title'),
          body:     t('friends_push_body').replace('{name}', senderName),
          url:      'https://dayclose.vercel.app/?open=friends',
          user_ids: [targetUserId],
        }
      })
    } catch { /* ignorar */ }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleInviteEmail = async () => {
    if (!inviteEmail.trim() || inviteStatus === 'sending') return
    setInviteStatus('sending'); setInviteErrMsg('')
    try {
      await createFriendInvite(inviteEmail.trim())
      const found = await searchUserByEmail(inviteEmail.trim())
      if (found?.user_id) await notifyFriendRequest(found.user_id)
      triggerSuccess(setInviteStatus, () => setInviteEmail(''))
    } catch (err) {
      setInviteErrMsg(friendlyError(err, t))
      setInviteStatus('error')
    }
  }

  const handleSearchEmail = async () => {
    if (!searchEmail.trim()) return
    setSearchMessage(''); setSearchResult(null)
    try {
      const result = await searchUserByEmail(searchEmail.trim())
      if (!result) { setSearchMessage(t('friends_search_empty')); return }
      setSearchResult(result)
    } catch { setSearchMessage(t('friends_search_error')) }
  }

  const handleSendRequest = async () => {
    if (!searchResult?.user_id || requestStatus === 'sending') return
    setRequestStatus('sending'); setRequestErrMsg('')
    try {
      await createFriendRequest(searchResult.user_id)
      await notifyFriendRequest(searchResult.user_id)
      triggerSuccess(setRequestStatus, () => { setSearchResult(null); setSearchEmail('') })
    } catch (err) {
      setRequestErrMsg(friendlyError(err, t))
      setRequestStatus('error')
    }
  }

  const handleGenerateCode = async () => {
    try {
      setFriendCode(await createFriendCode())
    } catch (err) {
      console.error('[FriendsSection] generateCode:', err.message)
    }
  }

  const handleAcceptCode = async () => {
    if (!codeInput.trim() || codeStatus === 'sending') return
    setCodeStatus('sending'); setCodeErrMsg('')
    try {
      await acceptFriendCode(codeInput.trim().toUpperCase())
      triggerSuccess(setCodeStatus, () => setCodeInput(''))
    } catch (err) {
      setCodeErrMsg(friendlyError(err, t))
      setCodeStatus('error')
    }
  }

  const handleRespondRequest = async (id, accept) => {
    try { await respondFriendRequest(id, accept); await loadFriends() }
    catch (err) { console.error('[FriendsSection] respondRequest:', err.message) }
  }

  const handleAcceptInvite = async (id) => {
    try { await acceptFriendInvite(id); await loadFriends() }
    catch (err) { console.error('[FriendsSection] acceptInvite:', err.message) }
  }

  const handleCancelRequest = async (id) => {
    try { await supabase.from('friendships').delete().eq('id', id); await loadFriends() }
    catch (err) { console.error('[FriendsSection] cancelRequest:', err.message) }
  }

  const handleCancelInvite = async (id) => {
    try {
      await supabase.from('friend_invites').delete().eq('id', id)
      await loadFriends()
    } catch (err) { console.error('[FriendsSection] cancelInvite:', err.message) }
  }

  const pendingCount = pendingIncoming.length + pendingInvites.length

  // ── Sub-componente: pantalla de éxito ─────────────────────────────────────
  const SuccessScreen = () => (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-10 gap-3 text-center"
    >
      <div className="h-16 w-16 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
        <CheckCircle2 size={30} className="text-violet-400" />
      </div>
      <p className="text-sm font-black text-white">{t('friends_sent_success')}</p>
      <p className="text-[11px] text-neutral-500">{t('friends_sent_success_desc')}</p>
    </motion.div>
  )

  // ── Sub-componente: mensaje de error amigable ─────────────────────────────
  const ErrorBanner = ({ msg }) => (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2"
    >
      <span className="text-amber-400 text-sm mt-px shrink-0">⚠</span>
      <p className="text-[11px] text-amber-300 font-medium leading-snug">{msg}</p>
    </motion.div>
  )

  return (
    <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl relative overflow-hidden">
      <div className="absolute -top-20 right-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* ── Encabezado ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-white shrink-0" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white leading-none">
              {t('more_friends_title')}
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">{t('more_friends_desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-5 min-w-[20px] px-1.5 rounded-full bg-violet-500 text-white text-[10px] font-black flex items-center justify-center tabular-nums"
            >
              {pendingCount}
            </motion.span>
          )}
          {showFriendsNew && (
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
              {t('friends_new')}
            </span>
          )}
          <button
            onClick={() => { setFriendTab('email'); setIsFriendsOpen(true) }}
            className="text-[11px] font-semibold text-neutral-200 bg-white/8 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/15 transition-colors"
          >
            {t('more_friends_invite')}
          </button>
        </div>
      </div>

      {/* ── Solicitudes RECIBIDAS ────────────────────────────────── */}
      <AnimatePresence>
        {pendingCount > 0 && (
          <MotionDiv
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="rounded-[1.5rem] border border-violet-500/20 bg-violet-500/5 p-3 mb-3 relative z-10 space-y-1.5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                {t('friends_requests_title')}
              </p>
              <span className="text-[10px] text-violet-400 font-black tabular-nums">{pendingCount}</span>
            </div>

            {pendingIncoming.map(req => (
              <div key={req.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-violet-500/15 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserPlus size={11} className="text-violet-400 shrink-0" />
                  <p className="text-[12px] text-neutral-200 font-medium truncate">
                    {req.requester?.full_name || req.requester?.email || t('friends_request_unknown')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <motion.button whileTap={{ scale: 0.88 }}
                    onClick={() => handleRespondRequest(req.id, true)}
                    className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  ><Check size={13} /></motion.button>
                  <motion.button whileTap={{ scale: 0.88 }}
                    onClick={() => handleRespondRequest(req.id, false)}
                    className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                  ><X size={13} /></motion.button>
                </div>
              </div>
            ))}

            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-violet-500/15 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={11} className="text-violet-400 shrink-0" />
                  <p className="text-[12px] text-neutral-200 font-medium truncate">
                    {invite.inviter?.full_name || invite.inviter?.email || t('friends_request_unknown')}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.88 }}
                  onClick={() => handleAcceptInvite(invite.id)}
                  className="text-[10px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full hover:bg-emerald-500/20 transition-colors shrink-0 ml-2"
                >
                  {t('friends_accept')}
                </motion.button>
              </div>
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* ── Invitaciones ENVIADAS (bandeja de salida) ────────────── */}
      {(pendingOutgoing.length > 0 || outgoingInvites.length > 0) && (
        <div className="rounded-[1.5rem] border border-white/5 bg-neutral-900/60 p-3 mb-3 relative z-10 space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-1">
            {t('friends_sent_title')}
          </p>

          {pendingOutgoing.map(req => (
            <div key={req.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Clock size={11} className="text-neutral-600 shrink-0" />
                <p className="text-[12px] text-neutral-400 truncate">
                  {req.addressee?.full_name || req.addressee?.email || t('friends_request_unknown')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] text-neutral-600 bg-neutral-800/60 border border-white/5 px-2.5 py-0.5 rounded-full">
                  {t('friends_pending_badge')}
                </span>
                <motion.button whileTap={{ scale: 0.88 }}
                  onClick={() => handleCancelRequest(req.id)}
                  className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600 hover:text-neutral-400 transition-colors"
                ><X size={11} /></motion.button>
              </div>
            </div>
          ))}

          {outgoingInvites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Mail size={11} className="text-neutral-600 shrink-0" />
                <p className="text-[12px] text-neutral-400 truncate">{inv.invitee_email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] text-neutral-600 bg-neutral-800/60 border border-white/5 px-2.5 py-0.5 rounded-full">
                  {t('friends_pending_badge')}
                </span>
                <motion.button whileTap={{ scale: 0.88 }}
                  onClick={() => handleCancelInvite(inv.id)}
                  className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600 hover:text-neutral-400 transition-colors"
                ><X size={11} /></motion.button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lista de amigos aceptados ──────────────────────────── */}
      <div className="rounded-[1.5rem] border border-white/5 bg-neutral-900/60 p-3 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
            {t('friends_list_title')}
          </p>
          <span className="text-[10px] text-neutral-600 tabular-nums">{friends.length}</span>
        </div>
        {friendsLoading ? (
          <div className="flex items-center gap-2 py-1">
            <Loader2 size={12} className="text-neutral-600 animate-spin" />
            <p className="text-[11px] text-neutral-600">{t('friends_loading')}</p>
          </div>
        ) : friends.length === 0 ? (
          <p className="text-[11px] text-neutral-600 py-1">{t('friends_empty')}</p>
        ) : (
          <div className="space-y-1">
            {friends.map(friend => (
              <div key={friend.friend_id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {friend.display_name || t('friends_request_unknown')}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {t('friends_consistency')} {friend.weekly_consistency || 0}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white tabular-nums">{friend.streak || 0}</p>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-600">{t('friends_streak')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL — Invitar amigo (ADN Premium)
      ══════════════════════════════════════════════════════════ */}
      {isFriendsOpen && renderPortal(
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <MotionDiv
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-neutral-900/95 backdrop-blur-xl rounded-[2rem] border border-white/8 shadow-2xl overflow-hidden"
          >
            {/* Franja de acento superior */}
            <div className="h-[3px] w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />

            <div className="p-5">
              {/* ── Cabecera ────────────────────────────────────── */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{t('friends_modal_title')}</h3>
                    <p className="text-[11px] text-neutral-500">{t('friends_modal_subtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="h-8 w-8 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                ><X size={15} /></button>
              </div>

              {/* ── Tabs estilo Dashboard ────────────────────────── */}
              <div className="flex gap-1.5 mb-5 bg-neutral-800/60 rounded-full p-1">
                {['email', 'code', 'search'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setFriendTab(tab)
                      setInviteStatus('idle'); setInviteErrMsg('')
                      setRequestStatus('idle'); setRequestErrMsg('')
                      setCodeStatus('idle'); setCodeErrMsg('')
                      setSearchResult(null); setSearchMessage('')
                    }}
                    className={`flex-1 py-1.5 rounded-full text-[11px] font-black transition-all ${
                      friendTab === tab
                        ? 'bg-white text-black shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {t(`friends_tab_${tab}`)}
                  </button>
                ))}
              </div>

              {/* ── Tab: Email ───────────────────────────────────── */}
              {friendTab === 'email' && (
                <AnimatePresence mode="wait">
                  {inviteStatus === 'success' ? (
                    <SuccessScreen key="ok" />
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      <p className="text-[11px] text-neutral-500">{t('friends_email_hint')}</p>
                      <div className="flex gap-2">
                        <input
                          value={inviteEmail}
                          onChange={e => { setInviteEmail(e.target.value); if (inviteStatus === 'error') { setInviteStatus('idle'); setInviteErrMsg('') } }}
                          onKeyDown={e => e.key === 'Enter' && handleInviteEmail()}
                          placeholder={t('friends_email_placeholder')}
                          className="flex-1 rounded-xl bg-neutral-950/80 border border-white/8 px-3 py-2 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-violet-500/50"
                        />
                        <motion.button whileTap={{ scale: 0.95 }}
                          onClick={handleInviteEmail}
                          disabled={!inviteEmail.trim() || inviteStatus === 'sending'}
                          className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-4 text-xs font-black transition-colors disabled:opacity-40 min-w-[72px] flex items-center justify-center gap-1.5"
                        >
                          {inviteStatus === 'sending' ? <Loader2 size={13} className="animate-spin" /> : t('friends_send')}
                        </motion.button>
                      </div>
                      {inviteStatus === 'error' && <ErrorBanner msg={inviteErrMsg} />}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* ── Tab: Código ──────────────────────────────────── */}
              {friendTab === 'code' && (
                <AnimatePresence mode="wait">
                  {codeStatus === 'success' ? (
                    <SuccessScreen key="ok" />
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {/* Tu código */}
                      <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
                        <div>
                          <p className="text-[10px] text-neutral-500 font-medium">{t('friends_code_label')}</p>
                          <p className="text-sm font-black text-white tracking-[0.15em] mt-0.5">
                            {friendCode || <span className="text-neutral-600 normal-case tracking-normal font-medium text-xs">{t('friends_code_empty')}</span>}
                          </p>
                        </div>
                        <button onClick={handleGenerateCode}
                          className="text-[10px] font-semibold text-neutral-400 bg-neutral-800 border border-white/8 px-3 py-1.5 rounded-full hover:text-white transition-colors"
                        >
                          {friendCode ? t('friends_code_rotate') : t('friends_code_create')}
                        </button>
                      </div>
                      {/* Introducir código ajeno */}
                      <div className="flex gap-2">
                        <input
                          value={codeInput}
                          onChange={e => { setCodeInput(e.target.value); if (codeStatus === 'error') { setCodeStatus('idle'); setCodeErrMsg('') } }}
                          onKeyDown={e => e.key === 'Enter' && handleAcceptCode()}
                          placeholder={t('friends_code_placeholder')}
                          className="flex-1 rounded-xl bg-neutral-950/80 border border-white/8 px-3 py-2 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-violet-500/50 uppercase tracking-widest"
                        />
                        <motion.button whileTap={{ scale: 0.95 }}
                          onClick={handleAcceptCode}
                          disabled={!codeInput.trim() || codeStatus === 'sending'}
                          className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-4 text-xs font-black transition-colors disabled:opacity-40 min-w-[72px] flex items-center justify-center gap-1.5"
                        >
                          {codeStatus === 'sending' ? <Loader2 size={13} className="animate-spin" /> : t('friends_code_accept')}
                        </motion.button>
                      </div>
                      {codeStatus === 'error' && <ErrorBanner msg={codeErrMsg} />}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* ── Tab: Buscar ──────────────────────────────────── */}
              {friendTab === 'search' && (
                <AnimatePresence mode="wait">
                  {requestStatus === 'success' ? (
                    <SuccessScreen key="ok" />
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      <p className="text-[11px] text-neutral-500">{t('friends_search_hint')}</p>
                      <div className="flex gap-2">
                        <input
                          value={searchEmail}
                          onChange={e => setSearchEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSearchEmail()}
                          placeholder={t('friends_search_placeholder')}
                          className="flex-1 rounded-xl bg-neutral-950/80 border border-white/8 px-3 py-2 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-violet-500/50"
                        />
                        <motion.button whileTap={{ scale: 0.95 }}
                          onClick={handleSearchEmail}
                          className="rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white px-4 text-xs font-black transition-colors"
                        >
                          {t('friends_search')}
                        </motion.button>
                      </div>
                      {searchMessage && <p className="text-[11px] text-neutral-500">{searchMessage}</p>}
                      {searchResult && (
                        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <UserPlus size={13} className="text-neutral-500 shrink-0" />
                            <span className="text-sm font-semibold text-white">{searchResult.full_name || searchResult.email}</span>
                          </div>
                          <motion.button whileTap={{ scale: 0.95 }}
                            onClick={handleSendRequest}
                            disabled={requestStatus === 'sending'}
                            className="text-[11px] font-black text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 flex items-center gap-1.5"
                          >
                            {requestStatus === 'sending' ? <Loader2 size={11} className="animate-spin" /> : t('friends_send_request')}
                          </motion.button>
                        </div>
                      )}
                      {requestStatus === 'error' && <ErrorBanner msg={requestErrMsg} />}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* Espacio inferior para respirar */}
              <div className="h-1" />
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  )
}