import { X, Globe } from 'lucide-react'
import NotificationManager from './NotificationManager'
import { useLanguage } from '../context/LanguageContext'

export default function SettingsModal({ isOpen, onClose, user }) {
  const { t, language, switchLanguage } = useLanguage()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-neutral-800/80 radius-card p-6 shadow-apple border border-white/5 relative backdrop-blur-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={24} /></button>
        <h2 className="text-xl font-bold text-white mb-6">{t('settings_title')}</h2>
        <div className="space-y-4">
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/60">
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-3"><Globe size={14} /> {t('language_label')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => switchLanguage('es')} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${language === 'es' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-transparent hover:bg-neutral-700'}`}>🇪🇸 Español</button>
              <button type="button" onClick={() => switchLanguage('en')} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${language === 'en' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-transparent hover:bg-neutral-700'}`}>🇺🇸 English</button>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 mt-4">
            <p className="text-xs text-neutral-400 mb-2">{t('system_permissions')}</p>
            {user?.id ? (<NotificationManager userId={user.id} />) : (<p className="text-xs text-neutral-500 italic">{t('loading_permissions')}</p>)}
          </div>
        </div>
      </div>
    </div>
  )
}