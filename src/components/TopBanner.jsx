import { useState, useEffect } from 'react'
import { Megaphone, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext' // <-- Importar contexto

export default function TopBanner({ onOpenUpdates, updateAvailable = false }) {
  const [rawMessage, setRawMessage] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const { language, t } = useLanguage() // <-- Obtener idioma actual ('es' o 'en')

  const parseAnnouncement = (raw) => {
    if (!raw) return { banner: '', update: null }
    try {
      const parsed = JSON.parse(raw)
      const langPayload = parsed[language] || parsed['es'] || raw
      if (typeof langPayload === 'string') return { banner: langPayload, update: null }
      if (langPayload && typeof langPayload === 'object') {
        return { banner: langPayload.banner || '', update: langPayload.update || null }
      }
      return { banner: raw, update: null }
    } catch (e) {
      return { banner: raw, update: null }
    }
  }

  useEffect(() => {
    const fetchAnnouncement = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('message')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data && data.message) {
        setRawMessage(data.message)
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    fetchAnnouncement()

    const channel = supabase
      .channel('public:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncement()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const { banner: displayMessage, update } = parseAnnouncement(rawMessage)

  return (
    <>
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none"
        >
          <div className="inline-flex items-center gap-2 bg-neutral-800/90 backdrop-blur-xl pl-4 pr-2 py-1.5 radius-pill border border-white/5 shadow-apple-soft pointer-events-auto">
            <div className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0 animate-pulse" />
            <span className="text-[11px] font-medium text-neutral-300 whitespace-nowrap">
              {t('new_version_available')}
            </span>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-200 hover:bg-white/20 active:scale-95 transition-all whitespace-nowrap"
            >
              <RefreshCw size={9} />
              {t('update_now')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    <AnimatePresence>
      {isVisible && displayMessage && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full flex justify-center pt-6 mb-2 px-4 relative z-30"
        >
          <div className="flex items-center gap-4 bg-neutral-800/60 backdrop-blur-xl pl-5 pr-4 py-3 radius-pill shadow-apple-soft border border-white/10 max-w-4xl mx-auto">
            <div className="p-1.5 bg-white/5 rounded-full shrink-0">
              <Megaphone size={14} className="text-neutral-400" />
            </div>
            
            <p className="text-xs font-medium text-neutral-200 tracking-wide leading-snug text-left min-w-[200px] md:min-w-[300px]">
              {displayMessage}
            </p>
            {update && onOpenUpdates && (
              <button
                onClick={onOpenUpdates}
                className="ml-auto rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-200 hover:bg-white/20"
              >
                {t('updates_cta')}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}