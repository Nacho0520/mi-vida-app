import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Target, Sparkles, Activity, Users, Mail, Clock, X, Check, UserPlus } from 'lucide-react'
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

const DAY_MS = 24 * 60 * 60 * 1000
const LETTER_STORAGE_KEY = 'mivida_future_letters'
const LETTER_DELAYS = [7, 14, 30]

const loadLetters = () => {
  try {
    const saved = localStorage.getItem(LETTER_STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const FEATURES = [
  { id: 'goals', icon: Target },
  { id: 'insights', icon: Sparkles },
  { id: 'energy', icon: Activity }
]

export default function MoreFeatures({ user }) {
  const { t } = useLanguage()
  const [letters, setLetters] = useState(() => loadLetters())
  const [isLetterOpen, setIsLetterOpen] = useState(false)
  const [letterText, setLetterText] = useState('')
  const [letterDelay, setLetterDelay] = useState(7)
  const [activeLetter, setActiveLetter] = useState(null)
  const [isFriendsOpen, setIsFriendsOpen] = useState(false)
  const [friends, setFriends] = useState([])
  const [pendingIncoming, setPendingIncoming] = useState([])
  const [pendingOutgoing, setPendingOutgoing] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState('')
  const [friendTab, setFriendTab] = useState('email')
  const [inviteEmail, setInviteEmail] = useState('')
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchMessage, setSearchMessage] = useState('')
  const [friendCode, setFriendCode] = useState('')
  const [codeInput, setCodeInput] = useState('')

  const orderedLetters = useMemo(() => {
    return [...letters].sort((a, b) => a.openAt - b.openAt)
  }, [letters])

  const nextLetter = orderedLetters[0]
  const now = Date.now()
  const readyLetters = orderedLetters.filter((letter) => letter.openAt <= now)
  const daysLeft = nextLetter ? Math.max(0, Math.ceil((nextLetter.openAt - now) / DAY_MS)) : null

  const persistLetters = (next) => {
    setLetters(next)
    localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(next))
  }

  const handleSaveLetter = () => {
    const trimmed = letterText.trim()
    if (!trimmed) return
    const openAt = Date.now() + letterDelay * DAY_MS
    const next = [
      ...letters,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, message: trimmed, openAt }
    ]
    persistLetters(next)
    setLetterText('')
    setLetterDelay(7)
    setIsLetterOpen(false)
  }

  const handleDeleteLetter = (id) => {
    persistLetters(letters.filter((letter) => letter.id !== id))
    if (activeLetter?.id === id) setActiveLetter(null)
  }

  const renderPortal = (node) => {
    if (typeof document === 'undefined') return null
    return createPortal(node, document.body)
  }

  const loadFriends = async () => {
    if (!user) return
    setFriendsLoading(true)
    setFriendsError('')
    try {
      const summary = await getFriendSummary()
      setFriends(summary)

      const { data: requests } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, created_at, requester:requester_id(email, full_name), addressee:addressee_id(email, full_name)')
        .eq('status', 'pending')

      const incoming = (requests || []).filter((req) => req.addressee_id === user.id)
      const outgoing = (requests || []).filter((req) => req.requester_id === user.id)
      setPendingIncoming(incoming)
      setPendingOutgoing(outgoing)

      const { data: invites } = await supabase
        .from('friend_invites')
        .select('id, inviter_id, invitee_email, created_at, inviter:inviter_id(email, full_name)')
        .eq('status', 'pending')

      const inviteEmailLower = user.email?.toLowerCase()
      const incomingInvites = (invites || []).filter(
        (invite) => invite.invitee_email?.toLowerCase() === inviteEmailLower
      )
      setPendingInvites(incomingInvites)

      const { data: codeRow } = await supabase
        .from('friend_codes')
        .select('code')
        .eq('user_id', user.id)
        .maybeSingle()
      setFriendCode(codeRow?.code || '')
    } catch (error) {
      setFriendsError(error?.message || t('friends_error'))
    } finally {
      setFriendsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) loadFriends()
  }, [user?.id])

  useEffect(() => {
    if (isFriendsOpen) loadFriends()
  }, [isFriendsOpen])

  const handleInviteEmail = async () => {
    if (!inviteEmail.trim()) return
    setFriendsError('')
    try {
      await createFriendInvite(inviteEmail.trim())
      setInviteEmail('')
      await loadFriends()
    } catch (error) {
      setFriendsError(error?.message || t('friends_error'))
    }
  }

  const handleSearchEmail = async () => {
    if (!searchEmail.trim()) return
    setSearchMessage('')
    setSearchResult(null)
    try {
      const result = await searchUserByEmail(searchEmail.trim())
      if (!result) {
        setSearchMessage(t('friends_search_empty'))
        return
      }
      setSearchResult(result)
    } catch (error) {
      setSearchMessage(t('friends_search_error'))
    }
  }

  const handleSendRequest = async () => {
    if (!searchResult?.user_id) return
    setFriendsError('')
    try {
      await createFriendRequest(searchResult.user_id)
      setSearchResult(null)
      setSearchEmail('')
      await loadFriends()
    } catch (error) {
      setFriendsError(error?.message || t('friends_error'))
    }
  }

  const handleGenerateCode = async () => {
    setFriendsError('')
    try {
      const code = await createFriendCode()
      setFriendCode(code)
    } catch (error) {
      setFriendsError(error?.message || t('friends_error'))
    }
  }

  const handleAcceptCode = async () => {
    if (!codeInput.trim()) return
    setFriendsError('')
    try {
      await acceptFriendCode(codeInput.trim().toUpperCase())
      setCodeInput('')
      await loadFriends()
    } catch (error) {
      setFriendsError(error?.message || t('friends_error'))
    }
  }

  const handleRespondRequest = async (id, accept) => {
    setFriendsError('')
    try {
      await respondFriendRequest(id, accept)
      await loadFriends()
    } catch (error) {
      setFriendsError(error?.message || t('friends_error'))
    }
  }

  const handleAcceptInvite = async (id) => {
    setFriendsError('')
    try {
      await acceptFriendInvite(id)
      await loadFriends()
    } catch (error) {
      setFriendsError(error?.message || t('friends_error'))
    }
  }

  const handleCancelRequest = async (id) => {
    setFriendsError('')
    try {
      await supabase.from('friendships').delete().eq('id', id)
      await loadFriends()
    } catch (error) {
      setFriendsError(error?.message || t('friends_error'))
    }
  }

  return (
    <div className="bg-neutral-800/30 p-5 sm:p-6 radius-card border border-white/5 shadow-apple-soft">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">{t('more_premium_title')}</h2>
          <p className="text-[11px] text-neutral-500">{t('more_premium_subtitle')}</p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
          <span className="text-[10px] text-neutral-400 font-bold">+</span>
        </div>
      </div>

      <div className="grid gap-3 mb-4">
        <MotionDiv
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-neutral-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-apple-soft"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <Users size={16} className="text-neutral-200" />
                </div>
                <p className="text-sm font-semibold text-white">{t('more_friends_title')}</p>
              </div>
              <p className="text-[11px] text-neutral-400">{t('more_friends_desc')}</p>
              <p className="text-[10px] text-neutral-500 mt-2">{t('more_friends_privacy')}</p>
            </div>
            <div className="flex items-center gap-2">
              {['A', 'L', 'M'].map((initial, index) => (
                <MotionDiv
                  key={initial}
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.2 }}
                  className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px] text-neutral-300"
                >
                  {initial}
                </MotionDiv>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              {t('more_friends_tag')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFriendTab('email')
                  setIsFriendsOpen(true)
                }}
                className="text-[11px] text-neutral-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
              >
                {t('more_friends_invite')}
              </button>
              <button
                onClick={() => setIsFriendsOpen(true)}
                className="text-[11px] text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
              >
                {t('more_friends_action')}
              </button>
            </div>
          </div>
        </MotionDiv>

        {(pendingIncoming.length > 0 || pendingInvites.length > 0) && (
          <MotionDiv
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-widest text-emerald-300/80">{t('friends_requests_title')}</p>
              <span className="text-[10px] text-emerald-200">
                {pendingIncoming.length + pendingInvites.length}
              </span>
            </div>
            <div className="space-y-2">
              {pendingIncoming.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 border border-emerald-500/20 px-3 py-2"
                >
                  <p className="text-xs text-neutral-200">
                    {req.requester?.full_name || req.requester?.email || t('friends_request_unknown')}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRespondRequest(req.id, true)}
                      className="h-8 w-8 rounded-full bg-emerald-500/30 border border-emerald-500/40 flex items-center justify-center text-emerald-100"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleRespondRequest(req.id, false)}
                      className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 border border-emerald-500/20 px-3 py-2"
                >
                  <p className="text-xs text-neutral-200">
                    {t('friends_invite_from')} {invite.inviter?.full_name || invite.inviter?.email || t('friends_request_unknown')}
                  </p>
                  <button
                    onClick={() => handleAcceptInvite(invite.id)}
                    className="text-[11px] text-emerald-50 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-full"
                  >
                    {t('friends_accept')}
                  </button>
                </div>
              ))}
            </div>
          </MotionDiv>
        )}

        <div className="rounded-2xl border border-white/5 bg-neutral-950/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-neutral-500">{t('friends_list_title')}</p>
            <span className="text-[10px] text-neutral-500">{friends.length}</span>
          </div>
          {friendsLoading ? (
            <p className="text-[11px] text-neutral-500">{t('friends_loading')}</p>
          ) : friends.length === 0 ? (
            <p className="text-[11px] text-neutral-500">{t('friends_empty')}</p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.friend_id}
                  className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{friend.display_name || t('friends_request_unknown')}</p>
                    <p className="text-[10px] text-neutral-500">
                      {t('friends_consistency')} {friend.weekly_consistency || 0}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{friend.streak || 0}</p>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-500">{t('friends_streak')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <MotionDiv
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-neutral-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-apple-soft"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <Mail size={16} className="text-neutral-200" />
                </div>
                <p className="text-sm font-semibold text-white">{t('more_letters_title')}</p>
              </div>
              <p className="text-[11px] text-neutral-400">{t('more_letters_desc')}</p>
              <div className="flex items-center gap-2 mt-3 text-[10px] text-neutral-500">
                <Clock size={12} />
                {nextLetter ? (
                  readyLetters.length > 0 ? (
                    <span>{t('more_letters_ready')}</span>
                  ) : (
                    <span>
                      {t('more_letters_opens_in')} {daysLeft}d
                    </span>
                  )
                ) : (
                  <span>{t('more_letters_empty')}</span>
                )}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
              <span className="text-[10px] text-neutral-300 font-bold">{letters.length}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            {readyLetters[0] ? (
              <button
                onClick={() => setActiveLetter(readyLetters[0])}
                className="text-[11px] text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
              >
                {t('more_letters_open')}
              </button>
            ) : (
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                {t('more_letters_tag')}
              </span>
            )}
            <button
              onClick={() => setIsLetterOpen(true)}
              className="text-[11px] text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
            >
              {t('more_letters_action')}
            </button>
          </div>
        </MotionDiv>
      </div>

      <MotionDiv
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
        className="grid gap-2 sm:gap-3"
      >
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <MotionDiv
              key={feature.id}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-2xl p-3 sm:p-4"
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                <Icon size={16} className="text-neutral-300" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">{t(`more_${feature.id}_title`)}</p>
                <p className="text-[11px] text-neutral-500">{t(`more_${feature.id}_desc`)}</p>
              </div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-neutral-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                {t('more_soon')}
              </span>
            </MotionDiv>
          )
        })}
      </MotionDiv>

      {isLetterOpen &&
        renderPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm bg-neutral-900/90 radius-card p-5 shadow-apple border border-white/5"
            >
            <h3 className="text-lg font-bold text-white">{t('more_letters_modal_title')}</h3>
            <p className="text-[11px] text-neutral-500 mt-1">{t('more_letters_modal_subtitle')}</p>
            <textarea
              value={letterText}
              onChange={(event) => setLetterText(event.target.value)}
              placeholder={t('more_letters_placeholder')}
              className="w-full mt-3 h-28 rounded-xl bg-neutral-950 border border-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
            />
            <div className="mt-3">
              <p className="text-[11px] text-neutral-500 mb-2">{t('more_letters_schedule')}</p>
              <div className="flex gap-2">
                {LETTER_DELAYS.map((days) => (
                  <button
                    key={days}
                    onClick={() => setLetterDelay(days)}
                    className={`px-3 py-1.5 rounded-full text-[11px] border ${
                      letterDelay === days
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 text-neutral-300 border-white/10'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setIsLetterOpen(false)}
                className="text-xs text-neutral-300 px-3 py-2 rounded-full border border-white/10"
              >
                {t('more_letters_cancel')}
              </button>
              <button
                onClick={handleSaveLetter}
                className="text-xs text-black bg-white px-4 py-2 rounded-full font-semibold"
              >
                {t('more_letters_save')}
              </button>
            </div>
            </MotionDiv>
          </div>
        )}

      {activeLetter &&
        renderPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm bg-neutral-900/90 radius-card p-5 shadow-apple border border-white/5"
            >
            <h3 className="text-lg font-bold text-white">{t('more_letters_open_title')}</h3>
            <p className="text-[11px] text-neutral-500 mt-1">{t('more_letters_open_subtitle')}</p>
            <div className="mt-3 rounded-xl bg-neutral-950 border border-white/5 px-3 py-3 text-sm text-neutral-100 whitespace-pre-wrap">
              {activeLetter.message}
            </div>
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setActiveLetter(null)}
                className="text-xs text-neutral-300 px-3 py-2 rounded-full border border-white/10"
              >
                {t('more_letters_close')}
              </button>
              <button
                onClick={() => handleDeleteLetter(activeLetter.id)}
                className="text-xs text-red-300 px-3 py-2 rounded-full border border-red-400/30"
              >
                {t('more_letters_delete')}
              </button>
            </div>
            </MotionDiv>
          </div>
        )}

      {isFriendsOpen &&
        renderPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md bg-neutral-900/95 radius-card p-5 shadow-apple border border-white/5"
            >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{t('friends_modal_title')}</h3>
                <p className="text-[11px] text-neutral-500">{t('friends_modal_subtitle')}</p>
              </div>
              <button
                onClick={() => setIsFriendsOpen(false)}
                className="h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {friendsError && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                {friendsError}
              </div>
            )}

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/5 bg-neutral-950/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-widest text-neutral-500">{t('friends_list_title')}</p>
                  <span className="text-[10px] text-neutral-500">{friends.length}</span>
                </div>
                {friendsLoading ? (
                  <p className="text-[11px] text-neutral-500">{t('friends_loading')}</p>
                ) : friends.length === 0 ? (
                  <p className="text-[11px] text-neutral-500">{t('friends_empty')}</p>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.friend_id}
                        className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{friend.display_name || t('friends_request_unknown')}</p>
                          <p className="text-[10px] text-neutral-500">
                            {t('friends_consistency')} {friend.weekly_consistency || 0}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{friend.streak || 0}</p>
                          <p className="text-[9px] uppercase tracking-widest text-neutral-500">{t('friends_streak')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(pendingIncoming.length > 0 || pendingInvites.length > 0) && (
                <div className="rounded-2xl border border-white/5 bg-neutral-950/60 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-neutral-500">{t('friends_requests_title')}</p>
                  {pendingIncoming.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                      <p className="text-xs text-neutral-300">
                        {req.requester?.full_name || req.requester?.email || t('friends_request_unknown')}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRespondRequest(req.id, true)}
                          className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-200"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, false)}
                          className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                      <p className="text-xs text-neutral-300">
                        {t('friends_invite_from')} {invite.inviter?.full_name || invite.inviter?.email || t('friends_request_unknown')}
                      </p>
                      <button
                        onClick={() => handleAcceptInvite(invite.id)}
                        className="text-[11px] text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
                      >
                        {t('friends_accept')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {pendingOutgoing.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-neutral-950/60 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-neutral-500">{t('friends_pending_title')}</p>
                  {pendingOutgoing.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                      <p className="text-xs text-neutral-300">
                        {req.addressee?.full_name || req.addressee?.email || t('friends_request_unknown')}
                      </p>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="text-[10px] text-neutral-300 border border-white/10 px-3 py-1.5 rounded-full"
                      >
                        {t('friends_cancel')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="flex gap-2 mb-3">
                {['email', 'code', 'search'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFriendTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-[11px] border ${
                      friendTab === tab
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 text-neutral-300 border-white/10'
                    }`}
                  >
                    {t(`friends_tab_${tab}`)}
                  </button>
                ))}
              </div>

              {friendTab === 'email' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-neutral-500">{t('friends_email_hint')}</p>
                  <div className="flex gap-2">
                    <input
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder={t('friends_email_placeholder')}
                      className="flex-1 rounded-xl bg-neutral-950 border border-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                    />
                    <button
                      onClick={handleInviteEmail}
                      className="rounded-xl bg-white text-black px-3 text-xs font-semibold"
                    >
                      {t('friends_send')}
                    </button>
                  </div>
                </div>
              )}

              {friendTab === 'code' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-neutral-500">{t('friends_code_label')}</p>
                      <p className="text-sm font-semibold text-white">{friendCode || t('friends_code_empty')}</p>
                    </div>
                    <button
                      onClick={handleGenerateCode}
                      className="text-[10px] text-neutral-300 border border-white/10 px-3 py-1.5 rounded-full"
                    >
                      {friendCode ? t('friends_code_rotate') : t('friends_code_create')}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={codeInput}
                      onChange={(event) => setCodeInput(event.target.value)}
                      placeholder={t('friends_code_placeholder')}
                      className="flex-1 rounded-xl bg-neutral-950 border border-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                    />
                    <button
                      onClick={handleAcceptCode}
                      className="rounded-xl bg-white text-black px-3 text-xs font-semibold"
                    >
                      {t('friends_code_accept')}
                    </button>
                  </div>
                </div>
              )}

              {friendTab === 'search' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-neutral-500">{t('friends_search_hint')}</p>
                  <div className="flex gap-2">
                    <input
                      value={searchEmail}
                      onChange={(event) => setSearchEmail(event.target.value)}
                      placeholder={t('friends_search_placeholder')}
                      className="flex-1 rounded-xl bg-neutral-950 border border-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                    />
                    <button
                      onClick={handleSearchEmail}
                      className="rounded-xl bg-white text-black px-3 text-xs font-semibold"
                    >
                      {t('friends_search')}
                    </button>
                  </div>
                  {searchMessage && <p className="text-[11px] text-neutral-500">{searchMessage}</p>}
                  {searchResult && (
                    <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-white">
                        <UserPlus size={14} className="text-neutral-300" />
                        {searchResult.full_name || searchResult.email}
                      </div>
                      <button
                        onClick={handleSendRequest}
                        className="text-[11px] text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
                      >
                        {t('friends_send_request')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            </MotionDiv>
          </div>
        )}
    </div>
  )
}
