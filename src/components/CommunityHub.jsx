import { motion } from 'framer-motion'
import { Users, Sparkles, HeartHandshake, Trophy, MessageCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import FriendsSection from './FriendsSection'

const MotionDiv = motion.div

const COMMUNITY_CARDS = [
  { id: 'checkin', icon: MessageCircle },
  { id: 'challenge', icon: Trophy },
  { id: 'support', icon: HeartHandshake }
]

export default function CommunityHub({ user }) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center flex-1 text-white p-6 text-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-left px-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Users size={16} className="text-neutral-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">{t('community_title')}</h2>
              <p className="text-[11px] text-neutral-500">{t('community_subtitle')}</p>
            </div>
          </div>
          <div className="mt-4 h-px bg-white/5" />
        </div>

        <FriendsSection user={user} />

        <div className="grid gap-3">
          {COMMUNITY_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <MotionDiv
                key={card.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-2xl p-4 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <Icon size={16} className="text-neutral-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{t(`community_${card.id}_title`)}</p>
                  <p className="text-[11px] text-neutral-500">{t(`community_${card.id}_desc`)}</p>
                </div>
                <span className="text-[9px] uppercase tracking-widest font-bold text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                  {t('community_soon')}
                </span>
              </MotionDiv>
            )
          })}
        </div>

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
