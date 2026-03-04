import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle, Bell, Flame } from 'lucide-react'
import SwipeCard from './SwipeCard'
import { useLanguage } from '../context/LanguageContext'

export default function OnboardingRitual({ user, onComplete }) {
  const [phase, setPhase] = useState('manifesto')
  const [swipeDone, setSwipeDone] = useState(false)
  const [notifStatus, setNotifStatus] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })
  const { t } = useLanguage()

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const pushSteps = isIOS
    ? [t('push_ios_step1'), t('push_ios_step2'), t('push_ios_step3')]
    : isAndroid
      ? [t('push_android_step1'), t('push_android_step2'), t('push_android_step3')]
      : [t('push_generic_step1'), t('push_generic_step2')]

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    setNotifStatus(permission)
  }

  const demoHabit = {
    id: 'ritual_demo',
    title: t('ritual_demo_card'),
    icon: '🌅',
    color: 'bg-violet-600',
    time_of_day: '',
  }

  const handleComplete = () => {
    localStorage.setItem('dayclose_ritual_completed', 'true')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden font-sans">
      <AnimatePresence mode="wait">

        {phase === 'manifesto' && (
          <motion.div
            key="manifesto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(109, 40, 217, 0.18) 0%, transparent 65%), #080808',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
              className="max-w-xs w-full"
            >
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-12 h-px bg-violet-500/70 mx-auto mb-10"
              />
              <h1 className="text-[1.85rem] font-black text-white tracking-tight leading-tight mb-5">
                {t('ritual_manifesto_title')}
              </h1>
              <p className="text-neutral-400 text-base leading-relaxed mb-12">
                {t('ritual_manifesto_desc')}
              </p>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={() => setPhase('swipe')}
                className="w-full border border-violet-500/30 bg-violet-500/10 text-violet-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {t('ritual_manifesto_cta')} <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'swipe' && (
          <motion.div
            key="swipe"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-neutral-900"
          >
            <div className="w-full max-w-md flex flex-col items-center">
              <div className="mb-8 text-center px-4">
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                  {t('ritual_swipe_label')}
                </p>
                <h2 className="text-white font-black text-2xl tracking-tight">
                  {t('ritual_swipe_title')}
                </h2>
              </div>
              <AnimatePresence mode="wait">
                {!swipeDone ? (
                  <motion.div
                    key="card"
                    className="w-full relative h-[380px]"
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <SwipeCard
                      habit={demoHabit}
                      onSwipeComplete={() => setSwipeDone(true)}
                      onDrag={() => {}}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="text-center px-6 py-10 w-full"
                  >
                    <div className="text-5xl mb-5">✨</div>
                    <p className="text-white font-black text-xl tracking-tight leading-snug mb-10">
                      {t('ritual_swipe_feedback')}
                    </p>
                    <button
                      onClick={() => setPhase('score')}
                      className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                    >
                      {t('ritual_swipe_next')} <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {phase === 'score' && (
          <motion.div
            key="score"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-neutral-900"
          >
            <div className="w-full max-w-sm">
              <div className="mb-6 text-center">
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                  {t('ritual_score_label')}
                </p>
                <h2 className="text-white font-black text-2xl tracking-tight">
                  {t('ritual_score_title')}
                </h2>
              </div>
              <div className="bg-neutral-800/60 border border-white/5 rounded-3xl p-6 mb-5">
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-4 text-center">
                  {t('day_score_label')}
                </p>
                <div className="flex justify-between gap-1 mb-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <motion.div
                      key={n}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: n * 0.04 }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black text-center ${
                        n === 8
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-neutral-700/40 text-neutral-500'
                      }`}
                    >
                      {n}
                    </motion.div>
                  ))}
                </div>
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">
                  {t('day_mood_label')}
                </p>
                <div className="flex justify-center gap-3">
                  {['😓', '😐', '🙂', '😄', '🤩'].map((emoji, i) => (
                    <motion.span
                      key={emoji}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: i === 3 ? 1.3 : 1 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className={`text-2xl cursor-default select-none ${i === 3 ? '' : 'opacity-30'}`}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
              </div>
              <p className="text-neutral-400 text-sm text-center leading-relaxed mb-6 px-2">
                {t('ritual_score_desc')}
              </p>
              <button
                onClick={() => setPhase('community')}
                className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
              >
                {t('ritual_score_next')} <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'community' && (
          <motion.div
            key="community"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-neutral-900"
          >
            <div className="w-full max-w-sm text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, delay: 0.1 }}
                className="flex justify-center mb-8"
              >
                <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-sm px-5 py-3 rounded-2xl">
                  <Flame size={15} className="fill-orange-400" />
                  {t('ritual_community_counter')}
                </div>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white font-black text-2xl tracking-tight leading-snug mb-4"
              >
                {t('ritual_community_title')}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-neutral-400 text-sm leading-relaxed mb-10"
              >
                {t('ritual_community_desc')}
              </motion.p>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                onClick={() => setPhase('push')}
                className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
              >
                {t('ritual_community_cta')} <ArrowRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {phase === 'push' && (
          <motion.div
            key="push"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center p-6 bg-neutral-900"
          >
            <div className="w-full max-w-sm bg-neutral-800 border border-white/5 rounded-[3rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                  <Bell size={22} />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {t('push_tutorial_title')}
                </h2>
              </div>
              <p className="text-neutral-400 text-xs mb-4 font-bold uppercase tracking-widest">
                {t('push_tutorial_subtitle')}
              </p>

              {notifStatus === 'granted' ? (
                <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl py-3 px-4 mb-6">
                  <CheckCircle size={15} className="text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-bold">{t('notif_enabled')}</span>
                </div>
              ) : notifStatus !== 'unsupported' && (
                <button
                  type="button"
                  onClick={requestNotifPermission}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-3 rounded-2xl mb-4 active:scale-95 transition-all text-sm"
                >
                  <Bell size={15} />
                  {t('notif_enable_btn')}
                </button>
              )}

              <div className="flex flex-col gap-2 mb-6">
                {pushSteps.map((stepText, index) => (
                  <div
                    key={`${stepText}-${index}`}
                    className="flex items-start gap-3 bg-neutral-900/60 border border-white/5 rounded-2xl p-3"
                  >
                    <div className="h-6 w-6 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold flex items-center justify-center text-neutral-400 shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-[12px] leading-relaxed text-neutral-300">{stepText}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPhase('congrats')}
                className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                {t('push_tutorial_cta')}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'congrats' && (
          <motion.div
            key="congrats"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-neutral-900 text-center"
          >
            <div className="w-full max-w-sm">
              <motion.div
                animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="flex justify-center mb-8"
              >
                <div className="p-6 bg-violet-500/20 rounded-[2.5rem] border border-violet-500/30">
                  <span className="text-6xl">🌙</span>
                </div>
              </motion.div>
              <h1 className="text-4xl font-black text-white tracking-tighter mb-4 leading-none">
                {t('ritual_congrats_title')}
              </h1>
              <p className="text-neutral-300 text-base font-medium mb-10 leading-snug px-4">
                {t('ritual_congrats_desc')}
              </p>
              <button
                onClick={handleComplete}
                className="w-full bg-white text-black font-black py-5 rounded-[2rem] text-lg shadow-[0_10px_30px_rgba(255,255,255,0.05)] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {t('ritual_enter')} <CheckCircle size={22} />
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
