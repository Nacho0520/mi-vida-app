import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, User } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function ProfileModal({ isOpen, onClose, user }) {
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const { t } = useLanguage()

  if (!isOpen) return null

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const updates = {}
    if (fullName.trim()) updates.data = { full_name: fullName.trim() }
    if (password) updates.password = password
    const { error } = await supabase.auth.updateUser(updates)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: password ? t('password_changed') : t('profile_updated') })
      setTimeout(() => { onClose(); window.location.reload() }, 1500)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-neutral-800/80 radius-card p-6 shadow-apple border border-white/5 relative backdrop-blur-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={24} /></button>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center">
            <User size={18} className="text-neutral-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('profile_title')}</h2>
            <p className="text-xs text-neutral-500">{user?.email}</p>
          </div>
        </div>
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/30 text-red-300' : 'bg-emerald-900/30 text-emerald-300'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">{t('display_name')}</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800/60 rounded-xl px-4 py-2 text-white focus:border-neutral-400/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">{t('new_password')}</label>
            <input type="password" placeholder={t('password_placeholder_settings')} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800/60 rounded-xl px-4 py-2 text-white focus:border-neutral-400/50 focus:outline-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2">
            {loading ? t('saving') : t('save_changes')}
          </button>
        </form>
      </div>
    </div>
  )
}
