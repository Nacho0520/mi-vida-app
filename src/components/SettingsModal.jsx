import { useState, useEffect } from 'react'
import { X, Globe } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabaseClient'

export default function SettingsModal({ isOpen, onClose, user, appVersion }) {
  const { t, language, switchLanguage } = useLanguage()
  const [profile, setProfile] = useState({ plan: 'free', stripe_customer_id: null, stripe_subscription_id: null })
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const quickSteps = isIOS
    ? [t('push_ios_step1'), t('push_ios_step2'), t('push_ios_step3')]
    : isAndroid
      ? [t('push_android_step1'), t('push_android_step2'), t('push_android_step3')]
      : [t('push_generic_step1'), t('push_generic_step2')]

  useEffect(() => {
    if (!isOpen || !user?.id) return
    const load = async () => {
      const { data } = await supabase.from('profiles').select('plan, stripe_customer_id, stripe_subscription_id').eq('id', user.id).maybeSingle()
      setProfile({
        plan: data?.plan === 'pro' ? 'pro' : 'free',
        stripe_customer_id: data?.stripe_customer_id ?? null,
        stripe_subscription_id: data?.stripe_subscription_id ?? null
      })
    }
    load()
  }, [isOpen, user?.id])

  const handleUpgradeToPro = async () => {
    if (!user?.id) return
    setSubscriptionLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: { userId: user.id } })
      if (error) throw error
      const url = data?.url
      if (url) window.location.href = url
      else alert(t('payment_error'))
    } catch (err) {
      console.error(err)
      alert(t('payment_error'))
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    const customerId = profile?.stripe_customer_id
    if (!customerId) {
      alert(t('portal_error'))
      return
    }
    setSubscriptionLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', { body: { customerId } })
      if (error) throw error
      const url = data?.url
      if (url) window.location.href = url
      else alert(t('portal_error'))
    } catch (err) {
      console.error(err)
      alert(t('portal_error'))
    } finally {
      setSubscriptionLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-neutral-800/80 radius-card p-6 shadow-apple border border-white/5 relative backdrop-blur-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={24} /></button>
        <h2 className="text-xl font-bold text-white mb-6">{t('settings_title')}</h2>
        <div className="premium-divider">
          <div className="bg-neutral-800/60 rounded-2xl border border-white/5 p-4 mb-4">
            <p className="text-xs font-semibold text-neutral-400 mb-2">{t('subscription_title')}</p>
            {profile.plan === 'free' ? (
              <>
                <p className="text-neutral-400 font-medium">{t('plan_free_title')}</p>
                <p className="text-neutral-500 text-sm mt-1">{t('plan_free_desc')}</p>
                <button
                  type="button"
                  onClick={handleUpgradeToPro}
                  disabled={subscriptionLoading}
                  className="mt-4 w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  {subscriptionLoading ? t('syncing') : t('upgrade_to_pro')}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-violet-600 text-white text-xs font-semibold uppercase tracking-widest">PRO</span>
                  <p className="text-white font-bold">{t('plan_pro_title')}</p>
                </div>
                <p className="text-neutral-400 text-sm">{t('plan_pro_desc')}</p>
                <button
                  type="button"
                  onClick={handleManageSubscription}
                  disabled={subscriptionLoading}
                  className="mt-4 w-full py-3 rounded-xl bg-neutral-700 text-neutral-300 font-semibold text-sm active:scale-95 transition-all disabled:opacity-50 hover:bg-neutral-600"
                >
                  {subscriptionLoading ? t('syncing') : t('manage_subscription')}
                </button>
              </>
            )}
          </div>
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/60">
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-3"><Globe size={14} /> {t('language_label')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => switchLanguage('es')} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${language === 'es' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-transparent hover:bg-neutral-700'}`}>🇪🇸 Español</button>
              <button type="button" onClick={() => switchLanguage('en')} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${language === 'en' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-transparent hover:bg-neutral-700'}`}>🇺🇸 English</button>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 mt-4">
            <p className="text-xs text-neutral-400 mb-2">{t('system_permissions')}</p>
            {!user?.id && <p className="text-xs text-neutral-500 italic">{t('loading_permissions')}</p>}
          </div>
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/60">
            <p className="text-xs text-neutral-400 mb-2 font-semibold">{t('push_steps_title')}</p>
            <div className="premium-divider">
              {quickSteps.map((step, index) => (
                <div key={`${step}-${index}`} className="flex items-start gap-2 text-[11px] text-neutral-400">
                  <span className="h-5 w-5 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[9px] font-bold text-neutral-500">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}