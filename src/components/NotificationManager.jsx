import { useState, useEffect } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// ¡PEGA AQUÍ TU PUBLIC KEY DE VAPIDKEYS.COM!
const PUBLIC_VAPID_KEY = 'BJM3Xuf-sBQSaXlrjQ442rXjLGHegavE8qhGxkhJpNQ4JQQnWnqx9f1E97lpg4n1XSpk01MwVEO1Qkr-NeVaiF4' 

// Función auxiliar para convertir la clave
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

export default function NotificationManager({ userId }) {
  const [permission, setPermission] = useState(Notification.permission)
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator)) return alert('Tu navegador no soporta esto.')
    
    setLoading(true)

    try {
      // 1. Pedir permiso al sistema (iOS preguntará aquí)
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        // 2. Preparar el Service Worker
        const registration = await navigator.serviceWorker.ready
        
        // 3. Suscribirse a Apple/Google Push Service
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        })

        // 4. Guardar la dirección en Supabase
        const { error } = await supabase.from('push_subscriptions').insert({
          user_id: userId,
          subscription: subscription
        })

        if (error) throw error
        
        setSubscribed(true)
        alert('¡Notificaciones activadas! Recibirás avisos nocturnos.')
      }
    } catch (err) {
      console.error(err)
      alert('Error al activar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Si ya está denegado o no soportado, no mostramos nada para no molestar
  if (permission === 'denied') return null

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
      className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition-colors text-sm font-medium"
    >
      {loading ? 'Activando...' : <><Bell size={18} /> Activar Recordatorio Nocturno</>}
    </button>
  )
}