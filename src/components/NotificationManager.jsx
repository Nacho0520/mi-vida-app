import { useState, useEffect } from 'react'
import { Bell, Check } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext' // <-- Importamos el contexto

const PUBLIC_VAPID_KEY = 'BJM3Xuf-sBQSaXlrjQ442rXjLGHegavE8qhGxkhJpNQ4JQQnWnqx9f1E97lpg4n1XSpk01MwVEO1Qkr-NeVaiF4' 

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function NotificationManager({ userId, appVersion }) {
  // BLINDAJE PARA SAFARI: No accedemos a Notification.permission directamente al inicio
  const [permission, setPermission] = useState('default')
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  
  const { language } = useLanguage() // <-- Obtenemos el idioma actual ('es' o 'en')

  useEffect(() => {
    // Verificamos el permiso solo cuando el componente se monta y con seguridad
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // --- NUEVA FUNCIÓN: Sincronizar idioma ---
  // Si el usuario cambia el idioma en Ajustes, actualizamos su registro en la BD de notificaciones
  // para que los futuros mensajes le lleguen en el nuevo idioma.
  useEffect(() => {
    const updateLanguagePreference = async () => {
      // Solo actualizamos si ya tiene permiso concedido y hay un usuario
      if (userId && permission === 'granted') {
        const { error } = await supabase.from('push_subscriptions')
          .update({ language: language, app_version: appVersion || null }) // <-- Actualizamos idioma y versión
          .eq('user_id', userId)
        if (error && (String(error.message || '').includes("language") || String(error.message || '').includes("app_version"))) {
          // La columna no existe: evitamos romper la experiencia
          return
        }
      }
    }
    updateLanguagePreference()
  }, [language, userId, permission])
  // ----------------------------------------

  const handleSubscribe = async () => {
    // Comprobación de seguridad para navegadores antiguos o Safari sin PWA
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return alert('Tu dispositivo no soporta notificaciones push. Asegúrate de añadir la App a la pantalla de inicio.')
    }
    
    setLoading(true)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        const registration = await navigator.serviceWorker.ready
        
        // Verificamos si ya existe una suscripción para no duplicar
        const existingSub = await registration.pushManager.getSubscription()
        if (existingSub) {
          await existingSub.unsubscribe()
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        })

        // MODIFICACIÓN: Guardamos también el idioma
        const { error } = await supabase.from('push_subscriptions').insert({
          user_id: userId,
          subscription: subscription,
          language: language, // <-- Guardamos 'es' o 'en'
          app_version: appVersion || null
        })

        if (error && (String(error.message || '').includes("language") || String(error.message || '').includes("app_version"))) {
          // Fallback si la columna no existe
          const { error: fallbackError } = await supabase.from('push_subscriptions').insert({
            user_id: userId,
            subscription: subscription
          })
          if (fallbackError) throw fallbackError
        } else if (error) {
          throw error
        }
        
        setSubscribed(true)
        alert('¡Notificaciones activadas!')
      }
    } catch (err) {
      console.error('Error en suscripción:', err)
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Si no hay soporte, mostramos un aviso sutil en lugar de romper la app
  if (typeof window !== 'undefined' && !('Notification' in window)) {
    return (
      <p className="text-[10px] text-neutral-500 mt-2 italic">
        Notificaciones no disponibles en este navegador.
      </p>
    )
  }

  if (permission === 'denied') {
    return (
      <p className="text-xs text-red-400 mt-4">
        Las notificaciones están bloqueadas en los ajustes de tu iPhone.
      </p>
    )
  }

  if (subscribed || permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-900/50 mt-4">
        <Check size={14} />
        <span>Notificaciones activas</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="mt-4 w-full flex items-center justify-center gap-2 bg-white hover:bg-neutral-200 text-black py-3 rounded-xl transition-colors text-sm font-bold"
    >
      {loading ? 'Activando...' : <><Bell size={18} /> Activar Recordatorio</>}
    </button>
  )
}