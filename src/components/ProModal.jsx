import { createPortal } from 'react-dom'
import { X, Zap, BarChart2, Infinity, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

export default function ProModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const features = [
    { icon: Infinity, text: 'Hábitos ilimitados' },
    { icon: BarChart2, text: 'Historial completo (30/90 días)' },
    { icon: Bell, text: 'Recordatorios inteligentes' },
    { icon: Zap, text: 'Acceso anticipado a nuevas funciones' },
  ]

  const handleCheckout = async () => {
    try {
      const { data: { user } = {} } = await supabase.auth.getUser()

      if (!user?.id) {
        alert('Debes iniciar sesión para continuar.')
        return
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { userId: user.id }
      })

      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error creando la sesión de Stripe:', error)
        alert('No se ha podido iniciar el pago. Inténtalo de nuevo más tarde.')
        return
      }

      const url = data?.url
      if (!url) {
        alert('No se ha podido obtener la página de pago.')
        return
      }

      onClose()
      window.location.href = url
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error conectando con Stripe:', err)
      alert('Ha ocurrido un error al conectar con el servicio de pago.')
    }
  }

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-6"
          >
            <div className="w-full max-w-[380px] bg-[#1C1C1E] rounded-3xl overflow-hidden shadow-2xl">

              {/* Header con gradiente */}
              <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-8 text-center">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 shadow-lg">
                  <Zap size={32} className="text-white fill-white" />
                </div>

                <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                  DayClose Pro
                </h2>
                <p className="text-white/70 text-sm font-medium">
                  Lleva tu rutina al siguiente nivel
                </p>
              </div>

              {/* Features */}
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  {features.map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                        <Icon size={16} className="text-indigo-400" />
                      </div>
                      <span className="text-white text-sm font-medium">{text}</span>
                    </div>
                  ))}
                </div>

                {/* Precio */}
                <div className="bg-white/5 rounded-2xl p-4 mb-4 text-center border border-white/10">
                  <p className="text-neutral-400 text-xs font-medium mb-1">PLAN PRO</p>
                  <p className="text-white text-3xl font-black tracking-tight">
                    €4.99
                    <span className="text-neutral-400 text-base font-medium">/mes</span>
                  </p>
                  <p className="text-emerald-400 text-xs font-medium mt-1">
                    o €39.99/año — ahorras 33%
                  </p>
                </div>

                {/* CTA Button — inicia Stripe Checkout en modo test */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 
                             text-white font-bold py-4 rounded-2xl text-base
                             active:scale-95 transition-all shadow-lg
                             shadow-indigo-500/30"
                >
                  Empezar con Pro
                </button>

                <button
                  onClick={onClose}
                  className="w-full text-neutral-500 text-sm py-3 mt-2 
                             hover:text-neutral-300 transition-colors"
                >
                  Continuar con el plan gratuito
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
