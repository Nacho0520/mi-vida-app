import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Mail, Clock, Zap } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import ProModal from './ProModal'

const MotionDiv = motion.div
const DAY_MS = 24 * 60 * 60 * 1000
const LETTER_STORAGE_KEY = 'mivida_future_letters'
const LETTER_NEW_KEY = 'mivida_letters_new_since'
const LETTER_NEW_DAYS = 3
const LETTER_DELAYS = [7, 14, 30]
const MAX_FREE_LETTERS = 1

const loadLetters = () => {
  try {
    const saved = localStorage.getItem(LETTER_STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

export default function FutureLettersSection({ isPro }) {
  const { t } = useLanguage()
  const [letters, setLetters] = useState(() => loadLetters())
  const [isLetterOpen, setIsLetterOpen] = useState(false)
  const [letterText, setLetterText] = useState('')
  const [letterDelay, setLetterDelay] = useState(7)
  const [activeLetter, setActiveLetter] = useState(null)
  const [showLettersNew, setShowLettersNew] = useState(false)
  const [proModalOpen, setProModalOpen] = useState(false)

  const canWriteLetter = isPro || letters.length < MAX_FREE_LETTERS

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LETTER_NEW_KEY)
      const since = stored ? Number(stored) : Date.now()
      if (!stored) localStorage.setItem(LETTER_NEW_KEY, String(since))
      const elapsedDays = (Date.now() - since) / DAY_MS
      setShowLettersNew(elapsedDays <= LETTER_NEW_DAYS)
    } catch {
      setShowLettersNew(false)
    }
  }, [])

  const handleOpenWriter = () => {
    if (!canWriteLetter) { setProModalOpen(true); return }
    setIsLetterOpen(true)
  }

  const renderPortal = (node) => {
    if (typeof document === 'undefined') return null
    return createPortal(node, document.body)
  }

  return (
    <div className="bg-neutral-900/40 p-5 sm:p-6 radius-card border border-white/5 shadow-apple-soft relative overflow-hidden">
      <ProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
      <div className="absolute -top-24 left-6 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">{t('more_letters_title')}</h2>
          <p className="text-[11px] text-neutral-500">{t('more_letters_desc')}</p>
        </div>
        {showLettersNew && <span className="badge-subtle">{t('friends_new')}</span>}
      </div>

      {isPro ? (
        <>
          {!isPro && letters.length >= MAX_FREE_LETTERS && (
            <button onClick={() => setProModalOpen(true)} className="w-full mb-3 relative z-10 flex items-center justify-between gap-3 bg-violet-600/10 border border-violet-500/20 rounded-2xl px-4 py-2.5 active:scale-95 transition-all">
              <p className="text-[11px] text-neutral-400">Plan Free: máx {MAX_FREE_LETTERS} carta activa</p>
              <div className="flex items-center gap-1 bg-violet-600 px-2.5 py-1 rounded-lg flex-shrink-0">
                <Zap size={10} className="text-white fill-white" />
                <span className="text-[10px] font-black text-white">Pro</span>
              </div>
            </button>
          )}

          <div className="flex items-center justify-between mt-2 relative z-10">
        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
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
        <div className="flex items-center gap-2">
          {readyLetters[0] ? (
            <button
              onClick={() => setActiveLetter(readyLetters[0])}
              className="text-[11px] text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
            >
              {t('more_letters_open')}
            </button>
          ) : null}
          <button
            onClick={handleOpenWriter}
            className={`text-[11px] px-3 py-1.5 rounded-full transition ${
              canWriteLetter
                ? 'text-white bg-white/10 border border-white/10 hover:bg-white/15'
                : 'text-violet-400 bg-violet-600/10 border border-violet-500/20'
            }`}
          >
            {t('more_letters_action')}
          </button>
        </div>
      </div>

      {isLetterOpen &&
        renderPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm bg-neutral-900/90 radius-card p-5 shadow-apple border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <Mail size={14} className="text-neutral-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{t('more_letters_modal_title')}</h3>
                  <p className="text-[11px] text-neutral-500">{t('more_letters_modal_subtitle')}</p>
                </div>
              </div>
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
        </>
      ) : (
        <div className="relative">
          <div className="blur-sm pointer-events-none select-none opacity-60">
            <div className="flex items-center justify-between mt-2 relative z-10">
              <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                <Clock size={12} />
                <span>{t('more_letters_empty')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-[11px] px-3 py-1.5 rounded-full text-white bg-white/10 border border-white/10">
                  {t('more_letters_open')}
                </button>
                <button className="text-[11px] px-3 py-1.5 rounded-full text-white bg-white/10 border border-white/10">
                  {t('more_letters_action')}
                </button>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-neutral-900/70 to-neutral-900/95 rounded-[2rem] backdrop-blur-[2px]">
            <div className="w-12 h-12 rounded-[1.2rem] bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
              <Zap size={22} className="text-violet-400 fill-violet-400/30" />
            </div>
            <div className="text-center">
              <p className="text-base font-black text-white tracking-tight">{t('pro_letters_title')}</p>
              <p className="text-[11px] text-neutral-400 mt-1">{t('pro_letters_desc')}</p>
            </div>
            <button
              onClick={() => setProModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-500/25 active:scale-95 transition-all"
            >
              <Zap size={13} className="fill-white" />
              {t('upgrade_to_pro')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
