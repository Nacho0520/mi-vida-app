import { useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const DEMO_HABITS = {
  es: [
    { emoji: '💧', label: 'Tomar agua',  color: 'bg-blue-500/20' },
    { emoji: '🧘', label: 'Meditación',  color: 'bg-violet-500/20' },
    { emoji: '📚', label: 'Leer 20 min', color: 'bg-amber-500/20' },
  ],
  en: [
    { emoji: '💧', label: 'Drink water', color: 'bg-blue-500/20' },
    { emoji: '🧘', label: 'Meditation',  color: 'bg-violet-500/20' },
    { emoji: '📚', label: 'Read 20 min', color: 'bg-amber-500/20' },
  ],
}

function DemoCard({ habit, onSwipe }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-180, 180], [-20, 20])
  const background = useTransform(
    x,
    [-120, 0, 120],
    ['rgb(127, 29, 29)', 'rgb(38, 38, 38)', 'rgb(6, 78, 59)']
  )
  const checkOpacity = useTransform(x, [40, 120], [0, 1])
  const crossOpacity = useTransform(x, [-40, -120], [0, 1])
  const cardOpacity = useTransform(x, [-180, -140, 0, 140, 180], [0, 1, 1, 1, 0])

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 90)  onSwipe('right')
    else if (info.offset.x < -90) onSwipe('left')
  }

  return (
    <motion.div
      style={{ x, rotate, background, opacity: cardOpacity, touchAction: 'pan-y' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.04, cursor: 'grabbing' }}
      className="absolute flex h-64 w-60 flex-col items-center justify-center rounded-3xl border border-white/10 shadow-2xl cursor-grab select-none"
    >
      {/* Feedback overlay — completado */}
      <motion.div
        style={{ opacity: checkOpacity }}
        className="absolute inset-0 flex items-center justify-center bg-emerald-500/80 rounded-3xl pointer-events-none"
      >
        <Check size={64} className="text-white drop-shadow-lg" />
      </motion.div>

      {/* Feedback overlay — no completado */}
      <motion.div
        style={{ opacity: crossOpacity }}
        className="absolute inset-0 flex items-center justify-center bg-red-900/80 rounded-3xl pointer-events-none"
      >
        <X size={64} className="text-white drop-shadow-lg" />
      </motion.div>

      {/* Contenido */}
      <div className="z-10 flex flex-col items-center gap-5 pointer-events-none">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${habit.color} border-2 border-white/10`}>
          <span className="text-4xl">{habit.emoji}</span>
        </div>
        <span className="text-white font-black text-lg tracking-tight">{habit.label}</span>
      </div>

      <div className="absolute bottom-5 w-10 h-1 bg-white/20 rounded-full" />
    </motion.div>
  )
}

export default function SwipeDemo() {
  const { t, language } = useLanguage()
  const habits = DEMO_HABITS[language] ?? DEMO_HABITS.es
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState([])
  const [exiting, setExiting] = useState(null)

  const current = habits[index % habits.length]
  const next    = habits[(index + 1) % habits.length]

  const handleSwipe = (dir) => {
    setExiting(dir)
    setResults(prev => [...prev, dir])
    setTimeout(() => {
      setIndex(i => i + 1)
      setExiting(null)
    }, 220)
  }

  const completed = results.length

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Indicadores de dirección */}
      <div className="flex items-center gap-16 text-xs font-black uppercase tracking-widest">
        <span className="flex items-center gap-1 text-red-400 opacity-70">
          <ChevronLeft size={14} />
          {language === 'es' ? 'No' : 'Skip'}
        </span>
        <span className="flex items-center gap-1 text-emerald-400 opacity-70">
          {language === 'es' ? 'Sí' : 'Done'}
          <ChevronRight size={14} />
        </span>
      </div>

      {/* Stack de tarjetas */}
      <div className="relative h-64 w-60 flex items-center justify-center">
        {/* Tarjeta de fondo (siguiente) */}
        <div
          className="absolute h-64 w-60 rounded-3xl border border-white/5 bg-neutral-800/40"
          style={{ transform: 'scale(0.93) translateY(8px)', zIndex: 0 }}
        >
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${next.color} border-2 border-white/10 opacity-50`}>
              <span className="text-4xl">{next.emoji}</span>
            </div>
          </div>
        </div>

        {/* Tarjeta activa */}
        <AnimatePresence mode="wait">
          {exiting === null && (
            <DemoCard
              key={index}
              habit={current}
              onSwipe={handleSwipe}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Progreso visual */}
      <div className="flex gap-2">
        {habits.map((_, i) => {
          const pos = i - (index % habits.length)
          const isDone = results[i] !== undefined
          return (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isDone
                  ? results[i] === 'right'
                    ? 'bg-emerald-500 w-5'
                    : 'bg-red-600 w-5'
                  : pos === 0
                  ? 'bg-white/60 w-5'
                  : 'bg-white/15 w-3'
              }`}
            />
          )
        })}
      </div>

      {/* Microcopy debajo */}
      <p className="text-[11px] font-bold text-neutral-600 uppercase tracking-[0.2em] text-center">
        {completed === 0
          ? (language === 'es' ? '← Arrastra la tarjeta →' : '← Drag the card →')
          : completed < habits.length
          ? (language === 'es' ? `${completed}/${habits.length} hábitos` : `${completed}/${habits.length} habits`)
          : (language === 'es' ? '✓ Ritual completado' : '✓ Ritual complete')}
      </p>
    </div>
  )
}
