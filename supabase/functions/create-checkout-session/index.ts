// Supabase Edge Function: create-checkout-session
// Crea una sesión de Stripe Checkout en modo TEST para el plan Pro mensual

import Stripe from 'https://esm.sh/stripe@11.15.0?target=deno'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set in Supabase secrets')
}

const stripe = new Stripe(stripeSecretKey ?? '', {
  apiVersion: '2023-10-16'
})

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  try {
    const { userId } = await req.json().catch(() => ({}))

    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid userId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe is not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: 499,
            product_data: {
              name: 'MiVida / DayClose Pro (mensual)'
            },
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      success_url: 'https://mi-vida-app.vercel.app?checkout=success',
      cancel_url: 'https://mi-vida-app.vercel.app?checkout=cancel',
      metadata: {
        userId
      }
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (err) {
    console.error('Error creating Stripe Checkout Session:', err)
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})

