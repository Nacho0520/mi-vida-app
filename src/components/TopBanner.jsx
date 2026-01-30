import { useState, useEffect } from 'react'
import { Megaphone } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext' // <-- Importar contexto

export default function TopBanner() {
  const [rawMessage, setRawMessage] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const { language } = useLanguage() // <-- Obtener idioma actual ('es' o 'en')

  // Función auxiliar para extraer el texto correcto
  const getTranslatedMessage = (raw) => {
    if (!raw) return ''
    try {
      // Intentamos leerlo como JSON bilingüe
      const parsed = JSON.parse(raw)
      // Devolvemos el idioma actual, o español por defecto
      return parsed[language] || parsed['es'] || raw
    } catch (e) {
      // Si no es JSON (mensaje antiguo), lo devolvemos tal cual
      return raw
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

  const displayMessage = getTranslatedMessage(rawMessage)

  return (
    <AnimatePresence>
      {isVisible && displayMessage && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full flex justify-center pt-6 mb-2 px-4 relative z-30"
        >
          <div className="flex items-center gap-4 bg-neutral-800/60 backdrop-blur-xl pl-5 pr-8 py-3 radius-pill shadow-apple-soft border border-white/10 max-w-4xl mx-auto">
            <div className="p-1.5 bg-white/5 rounded-full shrink-0">
              <Megaphone size={14} className="text-neutral-400" />
            </div>
            
            <p className="text-xs font-medium text-neutral-200 tracking-wide leading-snug text-left min-w-[200px] md:min-w-[300px]">
              {displayMessage}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}