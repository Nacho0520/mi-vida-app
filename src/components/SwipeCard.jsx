import { useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { Check, X, Hand, ChevronRight, ChevronLeft } from 'lucide-react'

export default function SwipeCard({ habit, onSwipeComplete, onDrag }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
  
  const background = useTransform(
    x,
    [-150, 0, 150],
    ['rgb(127, 29, 29)', 'rgb(38, 38, 38)', 'rgb(6, 78, 59)'] 
  )

  const checkOpacity = useTransform(x, [50, 150], [0, 1])
  const crossOpacity = useTransform(x, [-50, -150], [0, 1])
  const scale = useTransform(x, [-150, 0, 150], [1.1, 1, 1.1])

  const [hasInteracted, setHasInteracted] = useState(false)

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 100) {
      onSwipeComplete('right')
    } else if (info.offset.x < -100) {
      onSwipeComplete('left')
    }
  }

  return (
    <div className="relative h-96 w-full flex items-center justify-center perspective-1000">
      
      {/* TARJETA (Z-10) */}
      <motion.div
        style={{ x, rotate, opacity, background, scale }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragStart={() => {
            onDrag && onDrag(0)
            setHasInteracted(true) // Al tocar, adiós tutorial
        }} 
        onDrag={(e, info) => onDrag && onDrag(info.offset.x)}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: 'grabbing', scale: 1.05 }}
        className="relative flex h-80 w-72 flex-col items-center justify-center rounded-3xl shadow-apple border border-white/5 cursor-grab z-10 bg-neutral-800"
      >
        {/* Iconos Gigantes de Feedback (Dentro de la tarjeta) */}
        <motion.div style={{ opacity: checkOpacity }} className="absolute inset-0 flex items-center justify-center bg-emerald-500/80 rounded-3xl z-0 pointer-events-none">
            <Check size={80} className="text-white drop-shadow-lg" />
        </motion.div>
        <motion.div style={{ opacity: crossOpacity }} className="absolute inset-0 flex items-center justify-center bg-red-900/80 rounded-3xl z-0 pointer-events-none">
            <X size={80} className="text-white drop-shadow-lg" />
        </motion.div>

        {/* Contenido de la Tarjeta */}
        <div className="z-10 flex flex-col items-center gap-6 p-6 pointer-events-none">
          <div className={`flex h-24 w-24 items-center justify-center rounded-full shadow-inner ${habit.color} border-4 border-white/10`}>
            <span className="text-5xl drop-shadow-md">{habit.icon}</span>
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">{habit.title}</h2>
            <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 bg-black/20 rounded-full text-xs font-medium text-neutral-300 backdrop-blur-sm">
                    {habit.time_of_day === 'morning' ? 'Mañana' : habit.time_of_day === 'afternoon' ? 'Tarde' : 'Noche'}
                </span>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-6 w-12 h-1.5 bg-white/20 rounded-full" />
      </motion.div>

      {/* --- TUTORIAL (Z-50 = ENCIMA DE TODO) --- */}
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {/* Lado Izquierdo (Texto Flotante fuera de la tarjeta) */}
            <motion.div 
              animate={{ x: [-10, 0, -10], opacity: [0.5, 1, 0.5] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute left-0 flex flex-col items-center gap-1"
            >
              <ChevronLeft className="text-red-400 w-10 h-10 drop-shadow-md" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest drop-shadow-md bg-black/50 px-2 py-1 rounded">Saltar</span>
            </motion.div>

            {/* MANO GIGANTE BARRIENDO SOBRE LA TARJETA */}
            <div className="absolute inset-0 flex items-center justify-center mt-20">
                <motion.div
                    // Animación: Va al centro -> Derecha (Hecho) -> Centro -> Izquierda (Saltar) -> Centro
                    animate={{ 
                        x: [0, 60, 0, -60, 0], 
                        rotate: [0, 15, 0, -15, 0],
                        scale: [1, 1.1, 1, 0.9, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="drop-shadow-2xl"
                >
                    <Hand className="w-16 h-16 text-white stroke-[1.5]" fill="rgba(255,255,255,0.2)" />
                </motion.div>
                
                {/* Texto guía debajo de la mano */}
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute top-20 text-sm text-white font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20"
                >
                    Desliza para completar
                </motion.p>
            </div>

            {/* Lado Derecho (Texto Flotante fuera de la tarjeta) */}
            <motion.div 
              animate={{ x: [10, 0, 10], opacity: [0.5, 1, 0.5] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute right-0 flex flex-col items-center gap-1"
            >
              <ChevronRight className="text-emerald-400 w-10 h-10 drop-shadow-md" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest drop-shadow-md bg-black/50 px-2 py-1 rounded">Hecho</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}