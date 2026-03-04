import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, X, Share2, PlusSquare } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall'

export default function PWAInstallBanner({ language }) {
  const { installPrompt, isInstalled, isIOS, triggerInstall } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)

  // Solo mostrar en móvil, no instalado, no descartado
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const show = !isInstalled && !dismissed && (installPrompt || isIOS) && isMobile

  const t = {
    es: {
      android: 'Instala DayClose en tu pantalla de inicio',
      androidBtn: 'Instalar',
      ios: 'Instala DayClose: toca',
      iosThen: 'y luego "Añadir a pantalla de inicio"',
    },
    en: {
      android: 'Add DayClose to your home screen',
      androidBtn: 'Install',
      ios: 'Install DayClose: tap',
      iosThen: 'then "Add to Home Screen"',
    },
  }[language] ?? {
    android: 'Add DayClose to your home screen',
    androidBtn: 'Install',
    ios: 'Install DayClose: tap',
    iosThen: 'then "Add to Home Screen"',
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
        >
          <div className="max-w-md mx-auto bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <img src="/pwa-192x192.png" alt="DayClose" className="w-7 h-7 rounded-lg" />
            </div>

            {isIOS ? (
              <p className="flex-1 text-xs text-neutral-400 font-semibold leading-snug">
                {t.ios}{' '}
                <Share2 size={12} className="inline text-blue-400 mx-0.5" />
                {' '}{t.iosThen}
              </p>
            ) : (
              <>
                <p className="flex-1 text-xs text-neutral-300 font-semibold leading-snug">
                  {t.android}
                </p>
                <button
                  onClick={triggerInstall}
                  className="shrink-0 px-4 py-2 rounded-xl bg-white text-black text-xs font-black active:scale-95 transition-transform"
                >
                  {t.androidBtn}
                </button>
              </>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 p-1 text-neutral-600 hover:text-neutral-400 transition-colors"
              aria-label="Cerrar"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
