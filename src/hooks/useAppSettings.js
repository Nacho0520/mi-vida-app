import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const CURRENT_SOFTWARE_VERSION = '2.1.0'

/**
 * Gestiona la configuración global de la app:
 * mantenimiento, versión, mensaje de mantenimiento y anuncios.
 */
export function useAppSettings({ session, loadingSession, language }) {
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updatePayload, setUpdatePayload] = useState(null)
  const [updateUnread, setUpdateUnread] = useState(false)

  const handleVersionCheck = (dbVersion) => {
    if (dbVersion && dbVersion !== CURRENT_SOFTWARE_VERSION) {
      setUpdateAvailable(true)
      return
    }
    setUpdateAvailable(false)
    if (dbVersion === CURRENT_SOFTWARE_VERSION) {
      localStorage.removeItem('last_version_reload')
    }
  }

  const applyAnnouncement = (message) => {
    if (!message) {
      setUpdatePayload(null)
      setUpdateUnread(false)
      return
    }
    try {
      const parsed = JSON.parse(message)
      const langPayload = parsed[language] || parsed['es'] || null
      const update = (langPayload && typeof langPayload === 'object') ? (langPayload.update || null) : null
      setUpdatePayload(update)
      if (update?.id) {
        const seen = localStorage.getItem(`dayclose_update_seen_${update.id}`) === 'true'
        setUpdateUnread(!seen)
      } else {
        setUpdateUnread(false)
      }
    } catch {
      setUpdatePayload(null)
      setUpdateUnread(false)
    }
  }

  // Cargar ajustes de la app
  useEffect(() => {
    if (loadingSession) return
    const initSettings = async () => {
      const { data, error } = await supabase.from('app_settings').select('key, value')
      if (error) console.error('[useAppSettings] Error cargando app_settings:', error.message)
      if (data) {
        const maint = data.find(s => s.key === 'maintenance_mode')
        const vers = data.find(s => s.key === 'app_version')
        if (maint) setIsMaintenance(maint.value === 'true' || maint.value === true)
        if (vers) handleVersionCheck(vers.value)
      }

      const { data: textData, error: textError } = await supabase
        .from('app_settings_text')
        .select('value')
        .eq('key', 'maintenance_message')
        .single()
      // PGRST116 = no row found, estado normal si no hay mensaje
      if (textError && textError.code !== 'PGRST116') {
        console.error('[useAppSettings] Error cargando maintenance_message:', textError.message)
      }
      if (textData?.value) setMaintenanceMessage(textData.value)

      const subscription = supabase
        .channel('settings_realtime')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, (payload) => {
          if (payload.new.key === 'maintenance_mode') setIsMaintenance(payload.new.value === 'true' || payload.new.value === true)
          if (payload.new.key === 'app_version') handleVersionCheck(payload.new.value)
        })
        .subscribe()
      return () => subscription.unsubscribe()
    }
    initSettings()
  }, [loadingSession, session])

  // Cargar y suscribirse a anuncios
  useEffect(() => {
    if (!session) return
    let active = true

    const fetchAnnouncement = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('message')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      // PGRST116 = sin anuncio activo, estado normal
      if (error && error.code !== 'PGRST116') {
        console.error('[useAppSettings] Error cargando announcement:', error.message)
      }
      if (active) applyAnnouncement(data?.message || null)
    }

    fetchAnnouncement()
    const channel = supabase
      .channel('public:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAnnouncement)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session, language])

  const markUpdateSeen = (id) => {
    if (!id) return
    try { localStorage.setItem(`dayclose_update_seen_${id}`, 'true') } catch {}
    setUpdateUnread(false)
  }

  const resetUpdateSeen = (id) => {
    if (!id) return
    try { localStorage.removeItem(`dayclose_update_seen_${id}`) } catch {}
    setUpdateUnread(true)
  }

  return {
    isMaintenance,
    maintenanceMessage,
    updateAvailable,
    updatePayload,
    updateUnread,
    setUpdateUnread,
    markUpdateSeen,
    resetUpdateSeen,
  }
}