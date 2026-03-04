import { useState, useEffect } from "react";
import { X, Globe, Loader2, Zap, CheckCircle2, Key, Bell, BellOff, BellRing } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "../lib/supabaseClient";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  appVersion,
  isPro,
  onUpgrade,
}) {
  const { t, language, switchLanguage } = useLanguage();
  const [profileLoading, setProfileLoading] = useState(true);
  const [resolvedPlan, setResolvedPlan] = useState(null);
  const [notifPermission, setNotifPermission] = useState(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  });
  const [notifRequesting, setNotifRequesting] = useState(false);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const quickSteps = isIOS
    ? [t("push_ios_step1"), t("push_ios_step2"), t("push_ios_step3")]
    : isAndroid
      ? [
          t("push_android_step1"),
          t("push_android_step2"),
          t("push_android_step3"),
        ]
      : [t("push_generic_step1"), t("push_generic_step2")];

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    setNotifRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (
          VAPID_PUBLIC_KEY &&
          !VAPID_PUBLIC_KEY.includes("PEGA_AQUI") &&
          "serviceWorker" in navigator &&
          "PushManager" in window
        ) {
          const registration = await navigator.serviceWorker.ready;
          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
          }
          await supabase.from("push_subscriptions").upsert(
            {
              user_id: user?.id,
              subscription: subscription.toJSON(),
              language,
              app_version: import.meta.env.VITE_APP_VERSION || null,
            },
            { onConflict: "user_id" }
          );
        }
      }
    } catch (err) {
      console.error("[Push] Error desde ajustes:", err.message);
    } finally {
      setNotifRequesting(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    // Usar isPro prop como valor inmediato para evitar flash de "Plan Free"
    setResolvedPlan(isPro ? "pro" : null);
    setProfileLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, pro_expires_at") // ← añadir pro_expires_at
        .eq("id", user.id)
        .maybeSingle();

      // ← En lugar de solo comparar data?.plan === 'pro',
      //    respetar también isPro (que ya viene validado desde App.jsx)
      const dbIsPro =
        data?.plan === "pro" &&
        (!data?.pro_expires_at || new Date(data.pro_expires_at) > new Date());
      setResolvedPlan(isPro || dbIsPro ? "pro" : "free");
      setProfileLoading(false);
    };
    load();
  }, [isOpen, user?.id, isPro]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-neutral-800/80 radius-card p-6 shadow-apple border border-white/5 relative backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">
          {t("settings_title")}
        </h2>

        <div className="premium-divider">
          {/* ── Sección Suscripción ─────────────────────────────── */}
          <div className="bg-neutral-800/60 rounded-2xl border border-white/5 p-4 mb-4">
            <p className="text-xs font-semibold text-neutral-400 mb-3">
              {t("subscription_title")}
            </p>

            {/* Skeleton de carga */}
            {resolvedPlan === null ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 size={13} className="text-neutral-600 animate-spin" />
                <span className="text-xs text-neutral-600">{t("syncing")}</span>
              </div>
            ) : resolvedPlan === "pro" ? (
              /* ── Estado PRO ── */
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-600 text-white text-xs font-bold uppercase tracking-widest">
                    <Zap size={10} /> PRO
                  </span>
                  <p className="text-white font-bold text-sm">
                    {t("plan_pro_title")}
                  </p>
                </div>
                <p className="text-neutral-400 text-xs mb-3">
                  {t("plan_pro_desc")}
                </p>
                <div className="space-y-1.5">
                  {[
                    t("pro_heatmap_title"),
                    t("pro_history_title"),
                    t("pro_letters_title"),
                    t("pro_comparison_title"),
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2
                        size={11}
                        className="text-emerald-400 shrink-0"
                      />
                      <span className="text-[11px] text-neutral-300">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* ── Estado FREE ── */
              <>
                <p className="text-neutral-400 font-medium text-sm mb-1">
                  {t("plan_free_title")}
                </p>
                <p className="text-neutral-500 text-xs mb-4">
                  {t("plan_free_desc")}
                </p>

                {/* CTA Ko-fi */}
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm active:scale-95 transition-all hover:bg-violet-500"
                >
                  <Key size={14} />
                  {t("upgrade_to_pro")}
                </button>
              </>
            )}
          </div>

          {/* ── Idioma ──────────────────────────────────────────── */}
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/60">
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-3">
              <Globe size={14} /> {t("language_label")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchLanguage("es")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${language === "es" ? "bg-white text-black border-white" : "bg-neutral-800 text-neutral-400 border-transparent hover:bg-neutral-700"}`}
              >
                🇪🇸 Español
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("en")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${language === "en" ? "bg-white text-black border-white" : "bg-neutral-800 text-neutral-400 border-transparent hover:bg-neutral-700"}`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>

          {/* ── Permisos del sistema ─────────────────────────────── */}
          <div className="pt-2 border-t border-white/5 mt-4">
            <p className="text-xs text-neutral-400 mb-2">
              {t("system_permissions")}
            </p>
            {!user?.id && (
              <p className="text-xs text-neutral-500 italic">
                {t("loading_permissions")}
              </p>
            )}
          </div>
          {/* ── Estado y botón de notificaciones ───────────────── */}
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/60">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {notifPermission === "granted" ? (
                  <BellRing size={13} className="text-emerald-400" />
                ) : notifPermission === "denied" ? (
                  <BellOff size={13} className="text-red-400" />
                ) : (
                  <Bell size={13} className="text-neutral-400" />
                )}
                <span className="text-xs font-semibold text-neutral-300">
                  {t("notif_label")}
                </span>
              </div>

              {notifPermission === "granted" && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  {t("notif_enabled")}
                </span>
              )}
              {notifPermission === "denied" && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                  {t("notif_denied")}
                </span>
              )}
              {notifPermission === "unsupported" && (
                <span className="px-2 py-0.5 rounded-full bg-neutral-700/60 border border-white/5 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                  {t("notif_unsupported")}
                </span>
              )}
            </div>

            {notifPermission === "denied" && (
              <p className="text-neutral-500 text-[10px] leading-relaxed mt-2">
                {t("notif_denied_hint")}
              </p>
            )}

            {notifPermission === "default" && (
              <button
                type="button"
                onClick={requestNotifPermission}
                disabled={notifRequesting}
                className="w-full flex items-center justify-center gap-2 mt-3 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-bold py-3 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Bell size={14} />
                {notifRequesting ? t("notif_requesting") : t("notif_enable_btn")}
              </button>
            )}
          </div>

          {/* ── Pasos de instalación manual ─────────────────────── */}
          {notifPermission !== "granted" && (
            <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/60">
              <p className="text-xs text-neutral-400 mb-2 font-semibold">
                {t("push_steps_title")}
              </p>
              <div className="premium-divider">
                {quickSteps.map((step, index) => (
                  <div
                    key={`${step}-${index}`}
                    className="flex items-start gap-2 text-[11px] text-neutral-400"
                  >
                    <span className="h-5 w-5 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[9px] font-bold text-neutral-500">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
