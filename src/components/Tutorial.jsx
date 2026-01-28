import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Layout, MousePointer2, ArrowRight } from 'lucide-react'
import SwipeCard from './SwipeCard' // Importamos el componente de swipe real

const PRACTICE_STEPS = [
  {
    id: 'p1',
    title: "Prueba el Swipe",
    desc: "Desliza esta carta a la derecha para marcar este hábito como completado.",
    icon: "💧",
    color: "bg-blue-500",
    instruction: "Desliza a la derecha para el ÉXITO"
  },
  {
    id: 'p2',
    title: "Añade una nota",
    desc: "Desliza a la izquierda si no pudiste cumplirlo. Podrás explicar qué pasó.",
    icon: "🧘",
    color: "bg-purple-500",
    instruction: "Desliza a la izquierda para el SKIP"
  }
]

export default function Tutorial({ user, onComplete }) {
  const [phase, setPhase] = useState('welcome') // 'welcome' o 'practice'
  const [step, setStep] = useState(0)

  // Función que maneja el final del swipe
  const handleSwipe = (direction) => {
    // En el tutorial no importa la dirección, solo que el usuario aprenda el gesto
    if (step < PRACTICE_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-neutral-900 flex items-center justify-center p-6 overflow-hidden">
      <AnimatePresence mode="wait">
        
        {/* FASE 1: BIENVENIDA FLOTANTE */}
        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            className="w-full max-w-sm bg-neutral-800 border border-neutral-700 rounded-[3rem] p-8 shadow-2xl relative z-10"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-500/10 rounded-3xl border border-blue-500/20">
                <Star className="text-blue-400" size={32} fill="currentColor" />
              </div>
            </div>
            
            <h1 className="text-3xl font-black text-white text-center tracking-tighter mb-4 leading-none">
              Bienvenido/a a MiVida
            </h1>
            
            <p className="text-neutral-400 text-center text-sm mb-8 leading-relaxed font-medium">
              Hola <span className="text-white font-bold">{user?.user_metadata?.full_name || 'campeón'}</span>. 
              Estás a segundos de dominar tu rutina. Vamos a practicar los gestos básicos. MiVida te ayudará a ser constante mediante revisiones nocturnas.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-xs text-neutral-300 font-bold">
                <Layout size={18} className="text-blue-500" />
                <span>Interfaz limpia y sin distracciones</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-300 font-bold">
                <MousePointer2 size={18} className="text-emerald-500" />
                <span>Control total mediante gestos naturales</span>
              </div>
            </div>

            <button 
              onClick={() => setPhase('practice')}
              className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
            >
              ENSEÑAME! <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {/* FASE 2: TUTORIAL INTERACTIVO CON SWIPE REAL */}
        {phase === 'practice' && (
          <motion.div
            key="practice"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md flex flex-col items-center"
          >
            <div className="mb-8 text-center px-4">
               <h2 className="text-white font-black text-xl tracking-tight mb-2">
                 {PRACTICE_STEPS[step].title}
               </h2>
               <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">
                 {PRACTICE_STEPS[step].instruction}
               </p>
            </div>

            {/* Inyectamos el componente SwipeCard real */}
            <div className="w-full relative h-[400px]">
              <SwipeCard 
                key={PRACTICE_STEPS[step].id}
                habit={PRACTICE_STEPS[step]} 
                onSwipeComplete={handleSwipe}
                onDrag={() => {}} // No necesitamos feedback de color en el tutorial
              />
            </div>

            <div className="mt-12 flex justify-center gap-2">
              {PRACTICE_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-white' : 'w-2 bg-neutral-700'}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fondo decorativo sutil para el tutorial */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px]" />
      </div>
    </div>
  )
}