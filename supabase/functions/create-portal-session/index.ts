import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    })
  : null

function buildCorsHeaders(req: Request): Record<string, string> {
  const platform = req.headers.get('x-supabase-client-platform') ?? ''
  const version = req.headers.get('x-supabase-client-version') ?? ''
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'x-supabase-client-platform': platform,
    'x-supabase-client-version': version
  }
}

serve(async (req: Request): Promise<Response> => {
  const cors = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (!stripe) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: cors
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: cors
    })
  }

  try {
    const { customerId } = await req.json().catch(() => ({}))

    if (!customerId || typeof customerId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing customerId' }), {
        status: 400,
        headers: cors
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://mi-vida-app.vercel.app'
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: cors
    })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: cors
    })
  }
})
