import { motion } from 'framer-motion'
import { Activity, Zap } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const MotionDiv = motion.div

// "goals"    → WeeklyGoals.jsx   (real, tab Apps)
// "insights" → SmartInsights.jsx (real, tab Stats)
// Solo "energy" permanece como Coming Soon
const FEATURES = [
  { id: 'energy', icon: Activity },
]

export default function MoreFeatures() {
  const { t } = useLanguage()

  return (
    <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl relative overflow-hidden mb-6 text-left">

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-white" />
          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
            {t('more_premium_title')}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-neutral-700/30 border-white/10 text-neutral-500 text-[10px] font-black uppercase tracking-widest">
          <Zap size={10} fill="currentColor" /> {t('more_soon')}
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
              className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4"
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-neutral-300" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">{t(`more_${feature.id}_title`)}</p>
                <p className="text-[11px] text-neutral-500 font-medium">{t(`more_${feature.id}_desc`)}</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-neutral-800/60 border border-white/5 text-neutral-500">
                {t('more_soon')}
              </span>
            </MotionDiv>
          )
        })}
      </div>
    </div>
  )
}