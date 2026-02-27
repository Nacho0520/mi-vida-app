import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Zap, BarChart2, Calendar, History, Key, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext'

const KOFI_URL = 'https://ko-fi.com/dayclose'

export default function ProModal({ isOpen, onClose, user, onProActivated }) {
  const { t } = useLanguage()
  const [step, setStep] = useState('offer') // 'offer' | 'code'
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const features = [
    { icon: Zap,        text: t('pro_heatmap_title') || 'Mapa de actividad 28 días' },
    { icon: History,    text: t('pro_history_title') || 'Historial extendido 90 días' },
    { icon: BarChart2,  text: t('pro_comparison_title') || 'Estadísticas avanzadas' },
    { icon: Calendar,   text: t('pro_letters_title') || 'Cartas del futuro' },
  ]

  const handleActivate = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      // Llamar a la función de Supabase que valida, quema el código y activa Pro
      const { data, error: rpcErr } = await supabase.rpc('activate_pro', {
        p_code:    code.trim().toUpperCase(),
        p_user_id: user?.id,
      })

      if (rpcErr) {
        console.error(rpcErr)
        setError(t('pro_code_error') || 'Algo salió mal. Inténtalo de nuevo.')
        return
      }

      if (!data?.success) {
        const errMap = {
          code_not_found:    t('pro_code_invalid') || 'Código no válido. Compruébalo e inténtalo de nuevo.',
          code_already_used: t('pro_code_used')    || 'Este código ya ha sido usado.',
          code_expired:      t('pro_code_expired') || 'Este código ha caducado. Contacta con soporte.',
        }
        setError(errMap[data?.error] || t('pro_code_error') || 'Algo salió mal. Inténtalo de nuevo.')
        return
      }

      // Todo correcto
      setSuccess(true)
      setTimeout(() => {
        onProActivated?.()
        onClose()
        window.location.reload()
      }, 2000)

    } catch (err) {
      console.error(err)
      setError(t('pro_code_error') || 'Algo salió mal. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('offer')
    setCode('')
    setError('')
    setSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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

              {/* Header gradiente */}
              <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-8 text-center">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 shadow-lg">
                  <Zap size={32} className="text-white fill-white" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-1">DayClose Pro</h2>
                <p className="text-white/70 text-sm font-medium">
                  {t('pro_modal_subtitle') || 'Lleva tu rutina al siguiente nivel'}
                </p>
              </div>

              <div className="p-6">
                {step === 'offer' ? (
                  <>
                    {/* Features */}
                    <div className="space-y-3 mb-5">
                      {features.map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                            <Icon size={15} className="text-indigo-400" />
                          </div>
                          <span className="text-white text-sm font-medium">{text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Instrucciones Ko-fi */}
                    <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10 space-y-2">
                      <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                        {t('pro_how_it_works') || 'Cómo funciona'}
                      </p>
                      {[
                        t('pro_step_1') || 'Apoya el proyecto en Ko-fi',
                        t('pro_step_2') || 'Recibirás un código único por email',
                        t('pro_step_3') || 'Actívalo aquí y disfruta de Pro',
                      ].map((stepText, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px] text-neutral-300">
                          <span className="text-violet-400 font-black mt-px shrink-0">{i + 1}.</span>
                          <span>{stepText.replace(/^\d+\.\s/, '')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Botón Ko-fi */}
                    <a
                      href={KOFI_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-4 rounded-2xl text-base active:scale-95 transition-all shadow-lg shadow-indigo-500/30 mb-3"
                    >
                      ☕ {t('pro_kofi_cta') || 'Apoyar en Ko-fi'}
                      <ExternalLink size={14} className="opacity-70" />
                    </a>

                    {/* Ya tengo código */}
                    <button
                      onClick={() => setStep('code')}
                      className="w-full flex items-center justify-center gap-2 text-violet-400 text-sm py-2.5 rounded-xl border border-violet-500/25 hover:bg-violet-500/10 transition-all font-semibold"
                    >
                      <Key size={14} />
                      {t('pro_have_code') || 'Ya tengo un código'}
                    </button>

                    <button
                      onClick={handleClose}
                      className="w-full text-neutral-500 text-sm py-2 mt-1 hover:text-neutral-300 transition-colors"
                    >
                      {t('pro_continue_free') || 'Continuar con el plan gratuito'}
                    </button>
                  </>
                ) : success ? (
                  /* ── Éxito ── */
                  <div className="flex flex-col items-center py-6 gap-4">
                    <CheckCircle2 size={52} className="text-emerald-400" />
                    <p className="text-white font-black text-xl text-center">
                      {t('pro_activated') || '¡Pro activado!'}
                    </p>
                    <p className="text-neutral-400 text-sm text-center">
                      {t('pro_activated_desc') || 'Ya tienes acceso a todas las funciones Pro.'}
                    </p>
                  </div>
                ) : (
                  /* ── Introducir código ── */
                  <>
                    <button
                      onClick={() => { setStep('offer'); setError(''); setCode('') }}
                      className="flex items-center gap-1 text-neutral-500 text-xs mb-4 hover:text-neutral-300 transition-colors"
                    >
                      ← {t('back') || 'Volver'}
                    </button>

                    <div className="flex items-center gap-2 mb-3">
                      <Key size={18} className="text-violet-400" />
                      <h3 className="text-white font-bold text-base">
                        {t('pro_enter_code') || 'Introduce tu código'}
                      </h3>
                    </div>

                    <p className="text-neutral-400 text-xs mb-4">
                      {t('pro_code_desc') || 'Introduce el código que recibiste por email tras apoyar el proyecto en Ko-fi.'}
                    </p>

                    <input
                      type="text"
                      value={code}
                      onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
                      placeholder={t('pro_code_placeholder') || 'DAYCLOSE-PRO-XXXX-XXXX'}
                      className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-center text-base tracking-widest placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/60 mb-3"
                      maxLength={24}
                    />

                    {error && (
                      <p className="text-red-400 text-xs text-center mb-3">{error}</p>
                    )}

                    <button
                      onClick={handleActivate}
                      disabled={loading || !code.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-4 rounded-2xl text-base active:scale-95 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
                    >
                      {loading
                        ? <><Loader2 size={16} className="animate-spin" /> {t('syncing') || 'Activando...'}</>
                        : <><CheckCircle2 size={16} /> {t('pro_activate_btn') || 'Activar Pro'}</>
                      }
                    </button>

                    <button
                      onClick={handleClose}
                      className="w-full text-neutral-500 text-sm py-2 mt-2 hover:text-neutral-300 transition-colors"
                    >
                      {t('pro_continue_free') || 'Continuar con el plan gratuito'}
                    </button>
                  </>
                )}
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