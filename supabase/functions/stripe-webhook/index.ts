// Supabase Edge Function: stripe-webhook
// Maneja webhooks de Stripe para actualizar el plan Pro/Free en la tabla profiles

import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const buildCorsHeaders = (req: Request): HeadersInit => {
  const platform = req.headers.get('x-supabase-client-platform') ?? ''
  const version = req.headers.get('x-supabase-client-version') ?? ''

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'x-supabase-client-platform': platform,
    'x-supabase-client-version': version
  }
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    })
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe secrets are not configured')
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: corsHeaders
    })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase service role configuration missing')
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 500,
      headers: corsHeaders
    })
  }

  const signature = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Error verifying Stripe webhook signature:', err)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: corsHeaders
    })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId as string | undefined
        const customerId = session.customer as string | null
        const subscriptionId = session.subscription as string | null

        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({
              plan: 'pro',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId
            })
            .eq('id', userId)

          if (error) {
            console.error('Error updating profile to pro:', error)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string | null

        if (customerId) {
          const { error } = await supabase
            .from('profiles')
            .update({ plan: 'free' })
            .eq('stripe_customer_id', customerId)

          if (error) {
            console.error('Error updating profile to free:', error)
          }
        }
        break
      }

      default:
        // Otros eventos se ignoran por ahora
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: corsHeaders
    })
  } catch (err) {
    console.error('Error handling Stripe webhook event:', err)
    return new Response(JSON.stringify({ error: 'Webhook handler error' }), {
      status: 500,
      headers: corsHeaders
    })
  }
})

