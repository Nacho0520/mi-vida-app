import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const FALLBACK_COUNT = 84

export default function LiveCounter({ language }) {
  const [count, setCount] = useState(null)
  const [prev, setPrev] = useState(null)

  useEffect(() => {
    let mounted = true

    const fetchCount = async () => {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count: n, error } = await supabase
          .from('community_checkins')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since)

        if (mounted && !error && n !== null) {
          setPrev(c => c)
          setCount(n)
        }
      } catch {
        // fallo silencioso — se muestra fallback
      }
    }

    fetchCount()
    return () => { mounted = false }
  }, [])

  const displayCount = count ?? FALLBACK_COUNT
  const label = language === 'es'
    ? `${displayCount} personas cerraron su día ayer`
    : `${displayCount} people closed their day yesterday`

  return (
    <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm font-semibold">
      <Users size={14} className="shrink-0 text-violet-500/60" />
      <span>
        <AnimatePresence mode="wait">
          <motion.span
            key={displayCount}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="inline-block font-black text-neutral-400"
          >
            {displayCount.toLocaleString()}
          </motion.span>
        </AnimatePresence>
        {' '}{language === 'es' ? 'personas cerraron su día ayer' : 'people closed their day yesterday'}
      </span>
    </div>
  )
}
