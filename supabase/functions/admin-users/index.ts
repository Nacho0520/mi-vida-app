import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { action, user_id } = await req.json()
    if (!user_id || !action) {
      throw new Error("Faltan parámetros (action, user_id)")
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (action === "delete_data" || action === "delete_user") {
      await supabase.from("daily_logs").delete().eq("user_id", user_id)
      await supabase.from("habits").delete().eq("user_id", user_id)
      await supabase.from("push_subscriptions").delete().eq("user_id", user_id)
      await supabase.from("user_profiles").delete().eq("user_id", user_id)
    }

    if (action === "delete_user") {
      const { error } = await supabase.auth.admin.deleteUser(user_id)
      if (error) throw error
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
