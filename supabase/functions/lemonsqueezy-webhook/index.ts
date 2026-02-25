import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ----------------------------------------------------------------
// Verifica la firma HMAC-SHA256 que envia LemonSqueezy
// ----------------------------------------------------------------
async function verifySignature(body: string, signature: string): Promise<boolean> {
  const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
  if (!secret) {
    console.error("LEMONSQUEEZY_WEBHOOK_SECRET no configurado");
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
    );
    const bodyBytes = new TextEncoder().encode(body);

    return await crypto.subtle.verify("HMAC", key, sigBytes, bodyBytes);
  } catch (e) {
    console.error("Error verificando firma:", e);
    return false;
  }
}

// ----------------------------------------------------------------
// Handler principal
// ----------------------------------------------------------------
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  const isValid = await verifySignature(body, signature);
  if (!isValid) {
    console.error("Firma invalida");
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventName: string = payload.meta?.event_name ?? "";
  const email: string = payload.data?.attributes?.user_email ?? "";
  const orderId: string = String(payload.data?.id ?? "");

  console.log(`Evento: ${eventName} | Email: ${email}`);

  if (!email) {
    return new Response("No email in payload", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ——— ACTIVAR PRO ———
  // Sincroniza is_pro=true Y plan='pro' para mantener consistencia
  if (
    eventName === "order_created" ||
    eventName === "subscription_created" ||
    eventName === "subscription_resumed"
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_pro: true,
        plan: "pro",
        pro_since: new Date().toISOString(),
        ls_order_id: orderId,
      })
      .eq("email", email);

    if (error) {
      console.error("Error activando Pro:", error.message);
      return new Response("DB Error", { status: 500 });
    }

    console.log(`✅ Pro ACTIVADO para ${email}`);
  }

  // ——— DESACTIVAR PRO ———
  // Sincroniza is_pro=false Y plan='free'
  if (
    eventName === "subscription_cancelled" ||
    eventName === "subscription_expired"
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_pro: false,
        plan: "free",
      })
      .eq("email", email);

    if (error) {
      console.error("Error desactivando Pro:", error.message);
      return new Response("DB Error", { status: 500 });
    }

    console.log(`❌ Pro DESACTIVADO para ${email}`);
  }

  return new Response("OK", { status: 200 });
});
