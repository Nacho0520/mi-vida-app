import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Users, X, Check, UserPlus } from 'lucide-react'
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
const FRIENDS_NEW_KEY = 'dayclose_friends_new_since'
const FRIENDS_NEW_DAYS = 3

export default function FriendsSection({ user }) {
  const { t } = useLanguage()
  const [isFriendsOpen, setIsFriendsOpen] = useState(false)
  const [showFriendsNew, setShowFriendsNew] = useState(false)
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FRIENDS_NEW_KEY)
      const since = stored ? Number(stored) : Date.now()
      if (!stored) localStorage.setItem(FRIENDS_NEW_KEY, String(since))
      const elapsedDays = (Date.now() - since) / DAY_MS
      setShowFriendsNew(elapsedDays <= FRIENDS_NEW_DAYS)
    } catch {
      setShowFriendsNew(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('open') === 'friends') {
      setIsFriendsOpen(true)
    }
  }, [])

  const notifyFriendRequest = async (targetUserId) => {
    if (!targetUserId) return
    const senderName =
      user?.user_metadata?.full_name || user?.email || t('friends_request_unknown')
    const title = t('friends_push_title')
    const body = t('friends_push_body').replace('{name}', senderName)
    try {
      await supabase.functions.invoke('push-notification', {
        body: {
          title,
          body,
          url: 'https://dayclose.vercel.app/?open=friends',
          user_ids: [targetUserId]
        }
      })
    } catch {
      // ignore push errors to avoid blocking UI
    }
  }

  const handleInviteEmail = async () => {
    if (!inviteEmail.trim()) return
    setFriendsError('')
    try {
      await createFriendInvite(inviteEmail.trim())
      const found = await searchUserByEmail(inviteEmail.trim())
      if (found?.user_id) {
        await notifyFriendRequest(found.user_id)
      }
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
      await notifyFriendRequest(searchResult.user_id)
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
    <div className="bg-neutral-900/40 p-5 sm:p-6 radius-card border border-white/5 shadow-apple-soft relative overflow-hidden">
      <div className="absolute -top-20 right-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">{t('more_friends_title')}</h2>
          <p className="text-[11px] text-neutral-500">{t('more_friends_desc')}</p>
        </div>
        {showFriendsNew && <span className="badge-subtle">{t('friends_new')}</span>}
      </div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <p className="text-[11px] text-neutral-500">{t('more_friends_privacy')}</p>
        <button
          onClick={() => {
            setFriendTab('email')
            setIsFriendsOpen(true)
          }}
          className="text-[11px] text-neutral-200 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/15 transition"
        >
          {t('more_friends_invite')}
        </button>
      </div>

      {(pendingIncoming.length > 0 || pendingInvites.length > 0) && (
        <MotionDiv
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-3 relative z-10"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-emerald-300/80">{t('friends_requests_title')}</p>
            <span className="text-[10px] text-emerald-200">
              {pendingIncoming.length + pendingInvites.length}
            </span>
          </div>
          <div className="premium-divider">
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

      <div className="rounded-2xl border border-white/5 bg-neutral-950/60 p-3 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-neutral-500">{t('friends_list_title')}</p>
          <span className="text-[10px] text-neutral-500">{friends.length}</span>
        </div>
        {friendsLoading ? (
          <p className="text-[11px] text-neutral-500">{t('friends_loading')}</p>
        ) : friends.length === 0 ? (
          <p className="text-[11px] text-neutral-500">{t('friends_empty')}</p>
        ) : (
          <div className="premium-divider">
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

      {isFriendsOpen &&
        renderPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md bg-neutral-900/95 radius-card p-5 shadow-apple border border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                    <Users size={16} className="text-neutral-200" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{t('friends_modal_title')}</h3>
                    <p className="text-[11px] text-neutral-500">{t('friends_modal_subtitle')}</p>
                  </div>
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
                  <div className="premium-divider">
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
                  <div className="premium-divider">
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
                  <div className="premium-divider">
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

                {pendingOutgoing.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-white/5 bg-neutral-950/60 p-3 premium-divider">
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
            </MotionDiv>
          </div>
        )}
    </div>
  )
}
