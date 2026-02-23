import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
}) : null

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!stripe) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { userId } = await req.json().catch(() => ({}))

    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: 499,
          product_data: { name: 'MiVida Pro (mensual)' },
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      success_url: 'https://mi-vida-app.vercel.app?checkout=success',
      cancel_url: 'https://mi-vida-app.vercel.app?checkout=cancel',
      metadata: { userId }
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Stripe error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
