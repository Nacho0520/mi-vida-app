import { motion } from 'framer-motion'
import { Target, Sparkles, Activity } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
const MotionDiv = motion.div

const FEATURES = [
  { id: 'goals', icon: Target },
  { id: 'insights', icon: Sparkles },
  { id: 'energy', icon: Activity }
]

export default function MoreFeatures() {
  const { t } = useLanguage()

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

      <div className="grid gap-2 sm:gap-3">
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
      </div>

    </div>
  )
}
