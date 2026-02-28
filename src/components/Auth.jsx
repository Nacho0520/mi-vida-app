import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
const MotionDiv = motion.div
import { Mail, CheckCircle, AlertCircle, Globe, ArrowLeft } from 'lucide-react' 
import { useLanguage } from '../context/LanguageContext'

export default function Auth({ onBack }) { // <-- Añadimos la prop onBack
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [isRecovery, setIsRecovery] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const { t, language, switchLanguage } = useLanguage()

  useEffect(() => {
    const checkEmailVerified = () => {
      const hash = window.location.hash
      if (hash.includes('type=recovery')) {
        setIsRecovery(true)
        window.history.replaceState(null, null, window.location.pathname)
        return
      }
      if (hash.includes('access_token') || hash.includes('type=signup')) {
        setSuccessMsg(t('success_verified'))
        window.history.replaceState(null, null, window.location.pathname)
      }
    }
    checkEmailVerified()
  }, [t])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    let error

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      error = signUpError
      
      if (!error) {
        setSuccessMsg(t('success_check_email'))
        setEmail('')
        setPassword('')
        setFullName('')
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      error = signInError
    }

    if (error) {
      setErrorMsg(error.message)
    }
    setLoading(false)
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMsg(t('reset_password_missing_email'))
      return
    }
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    })
    if (error) {
      setErrorMsg(error.message)
    } else {
      setSuccessMsg(t('reset_password_sent'))
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg(t('reset_password_short'))
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t('reset_password_mismatch'))
      return
    }
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setErrorMsg(error.message)
    } else {
      setSuccessMsg(t('reset_password_updated'))
      setNewPassword('')
      setConfirmPassword('')
      setIsRecovery(false)
    }
    setLoading(false)
  }

  const handleBackToLogin = () => {
    setIsRecovery(false)
    setIsSignUp(false)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const toggleLang = () => switchLanguage(language === 'es' ? 'en' : 'es')

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 px-4 relative">
      
      {/* BOTÓN VOLVER (Superior Izquierda) */}
      <button 
        onClick={onBack}
        className="fixed top-8 left-8 flex items-center gap-2 bg-neutral-800/40 backdrop-blur-md px-4 py-3 rounded-full border border-white/5 hover:bg-neutral-700/70 transition-all active:scale-95 group shadow-xl z-50 text-neutral-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        <span className="text-[10px] font-black uppercase tracking-widest">
          {t('back') || 'Volver'}
        </span>
      </button>

      {/* BOTÓN IDIOMA (Superior Derecha) */}
      <button 
        onClick={toggleLang}
        className="fixed top-8 right-8 flex items-center gap-2 bg-neutral-800/40 backdrop-blur-md px-4 py-3 rounded-full border border-white/5 hover:bg-neutral-700/70 transition-all active:scale-95 group shadow-xl z-50"
      >
        <span className="text-xl">{language === 'es' ? '🇪🇸' : '🇬🇧'}</span>
        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest group-hover:text-white transition-colors">
          {language === 'es' ? 'ES' : 'EN'}
        </span>
        <Globe size={14} className="text-neutral-500 group-hover:text-white transition-colors ml-1" />
      </button>

      <MotionDiv 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm radius-card bg-neutral-800/50 p-8 shadow-apple border border-white/5 backdrop-blur-xl"
      >
        <h1 className="mb-2 text-center text-3xl font-black text-white tracking-tighter">
          {isRecovery ? t('reset_password_title') : isSignUp ? t('create_account') : t('app_name')}
        </h1>
        <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
          {isRecovery ? t('reset_password_subtitle') : isSignUp ? t('signup_subtitle') : t('login_subtitle')}
        </p>

        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-6 flex items-center gap-3 rounded-2xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20"
            >
              <AlertCircle size={18} className="shrink-0" />
              <p>{errorMsg}</p>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-400 border border-emerald-500/20"
            >
              {isSignUp ? <Mail size={18} className="shrink-0" /> : <CheckCircle size={18} className="shrink-0" />}
              <p className="font-medium leading-tight">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {isRecovery ? (
          <form className="space-y-4" onSubmit={handleUpdatePassword}>
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-neutral-500">{t('new_password')}</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-neutral-800/60 bg-neutral-900/50 px-4 py-3 text-sm text-white focus:border-neutral-400/50 focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-neutral-500">{t('confirm_password')}</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-neutral-800/60 bg-neutral-900/50 px-4 py-3 text-sm text-white focus:border-neutral-400/50 focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-4 text-sm font-black text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-white/5"
            >
              {loading ? t('syncing') : t('reset_password_update')}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleAuth}>
            {isSignUp && (
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-neutral-500">{t('your_name')}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border border-neutral-800/60 bg-neutral-900/50 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:border-neutral-400/50 focus:outline-none transition-all"
                placeholder={t('name_placeholder')}
              />
            </div>
          )}

          <div>
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-neutral-500">{t('email_label')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-neutral-800/60 bg-neutral-900/50 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:border-neutral-400/50 focus:outline-none transition-all"
              placeholder={t('email_placeholder')}
            />
          </div>

          <div>
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-neutral-500">{t('password_label')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-neutral-800/60 bg-neutral-900/50 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:border-neutral-400/50 focus:outline-none transition-all"
              placeholder={t('pass_placeholder')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-4 text-sm font-black text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            {loading ? t('syncing') : isSignUp ? t('btn_signup') : t('btn_login')}
          </button>
          </form>
        )}

        {!isSignUp && !isRecovery && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest"
              disabled={loading}
            >
              {t('reset_password')}
            </button>
          </div>
        )}

        {isRecovery && (
          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-500 mb-3">{t('reset_password_updated_hint')}</p>
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              {t('back_to_login')}
            </button>
          </div>
        )}

        {!isRecovery && (
          <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className="text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            {isSignUp ? t('switch_to_login') : t('switch_to_signup')}
          </button>
          </div>
        )}
      </MotionDiv>
    </div>
  )
}