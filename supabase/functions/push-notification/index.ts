import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Permite que cualquier web (tu app) llame a esta función sin bloqueo
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Configurar las llaves VAPID
    // IMPORTANTE: Asegúrate de haber añadido VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY
    // en los "Secrets" de tu panel de Supabase.
    const vapidEmail = 'mailto:admin@dayclose.app' 
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!publicKey || !privateKey) {
      throw new Error('Faltan las claves VAPID en las variables de entorno (Secrets de Supabase)')
    }

    webpush.setVapidDetails(vapidEmail, publicKey, privateKey)

    // 2. Conectar a la base de datos Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. Leer payload (personalización)
    const payloadRequest = await req.json().catch(() => ({}))
    const {
      title = '🌙 Momento de reflexión',
      body = '¿Qué tal ha ido el día? Entra en DayClose para cerrar tus hábitos.',
      icon = '/pwa-192x192.png',
      badge = '/pwa-192x192.png',
      url = 'https://dayclose.vercel.app',
      language = null,
      min_version = null,
      max_version = null,
      user_ids = null
    } = payloadRequest || {}

    // 4. Buscar usuarios suscritos (con filtros básicos)
    let query = supabase.from('push_subscriptions').select('*')
    if (language) query = query.eq('language', language)
    if (Array.isArray(user_ids) && user_ids.length > 0) query = query.in('user_id', user_ids)
    const { data: subscriptions, error } = await query

    if (error) throw error

    console.log(`Enviando notificaciones a ${subscriptions.length} dispositivos...`)

    const results = []

    const compareVersions = (a: string, b: string) => {
      const pa = String(a || '').split('.').map(Number)
      const pb = String(b || '').split('.').map(Number)
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const va = pa[i] || 0
        const vb = pb[i] || 0
        if (va > vb) return 1
        if (va < vb) return -1
      }
      return 0
    }

    // 5. Enviar notificación a cada uno
    for (const sub of subscriptions) {
      if (min_version && sub.app_version && compareVersions(sub.app_version, min_version) < 0) {
        continue
      }
      if (max_version && sub.app_version && compareVersions(sub.app_version, max_version) > 0) {
        continue
      }
      const payload = JSON.stringify({
        title,
        body,
        icon,
        badge,
        url
      })

      try {
        // Parsear la suscripción que guardamos en la base de datos
        const pushSubscription = typeof sub.subscription === 'string' 
          ? JSON.parse(sub.subscription) 
          : sub.subscription

        await webpush.sendNotification(pushSubscription, payload)
        results.push({ status: 'success', id: sub.id })
      } catch (err) {
        console.error(`Error enviando a ${sub.id}:`, err)
        
        // Si el usuario ya no existe (error 410/404), borramos la suscripción sucia
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        results.push({ status: 'failed', id: sub.id, error: err.message })
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Error del cliente o servidor
    })
  }
})