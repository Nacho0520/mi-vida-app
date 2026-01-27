import { useState, useEffect } from 'react'
import { X, Megaphone } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function TopBanner() {
  const [announcement, setAnnouncement] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const fetchAnnouncement = async () => {
      // 1. Buscamos el último mensaje ACTIVO
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return

      // 2. Comprobamos si el usuario ya cerró ESTE mensaje específico
      // Usamos el ID del mensaje para saber si es uno nuevo o el viejo
      const closedId = localStorage.getItem('closedAnnouncementId')
      
      if (closedId !== data.id.toString()) {
        setAnnouncement(data)
        setVisible(true)
      }
    }

    fetchAnnouncement()
  }, [])

  const handleClose = () => {
    if (!announcement) return
    // Guardamos que el usuario ya vio este mensaje específico
    localStorage.setItem('closedAnnouncementId', announcement.id.toString())
    setVisible(false)
  }

  if (!visible || !announcement) return null

  return (
    <div className="bg-indigo-600 text-white px-4 py-3 shadow-lg relative z-50">
      <div className="max-w-md mx-auto flex items-start gap-3 pr-6">
        <Megaphone className="h-5 w-5 flex-shrink-0 mt-0.5 text-indigo-200" />
        <p className="text-sm font-medium leading-tight">
          {announcement.message}
        </p>
      </div>
      
      <button 
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 text-indigo-200 hover:text-white rounded-full hover:bg-indigo-500/50 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  )
}