import { motion, AnimatePresence } from 'framer-motion'
import { X, LogOut, Settings, ShieldCheck, Heart } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function Sidebar({ isOpen, onClose, user, onLogout, onOpenSettings, version, onOpenAdmin }) {
  const email = user?.email || ''
  const isAdmin = email === 'hemmings.nacho@gmail.com'
  const { t } = useLanguage()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 z-40 backdrop-blur-md" />
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 left-0 bottom-0 w-64 bg-neutral-900 border-r border-white/5 z-50 p-6 shadow-apple" >
            <div className="flex flex-col h-full"> 
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">{t('menu')}</h2>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"> <X size={24} /> </button>
              </div>
              <div className="flex items-center gap-3 mb-10 p-4 bg-neutral-800/50 rounded-2xl border border-white/5 text-white">
                <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center font-black flex-shrink-0"> {email[0]?.toUpperCase() || 'U'} </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate tracking-tight">{user?.user_metadata?.full_name || 'Usuario'}</p>
                  <p className="text-[10px] text-neutral-500 truncate font-mono">{email}</p>
                </div>
              </div>
              <nav className="space-y-3 flex-1">
                <button onClick={() => { onOpenSettings(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-4 text-neutral-400 hover:bg-neutral-800 hover:text-white rounded-2xl transition-all font-medium text-sm" >
                  <Settings size={20} /> <span>{t('profile_settings')}</span>
                </button>
                {isAdmin && (
                  <button onClick={() => { onOpenAdmin(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-4 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-all font-black text-sm border border-blue-500/5" >
                    <ShieldCheck size={20} /> <span className="uppercase tracking-widest text-[10px]">{t('control_tower')}</span>
                  </button>
                )}
              </nav>
              <div className="mb-4">
                <a href="https://ko-fi.com/nachohemmings" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between w-full px-5 py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] transition-all hover:bg-emerald-500/20 active:scale-95 shadow-lg shadow-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform"><Heart size={20} className="text-emerald-400 fill-emerald-400/20" /></div>
                    <div className="text-left"><p className="text-xs font-black text-emerald-400 uppercase tracking-tight leading-none">{t('support_project')}</p><p className="text-[10px] text-emerald-500/60 font-medium mt-1">{t('buy_coffee')}</p></div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </a>
              </div>
              <div className="mt-auto pt-6 border-t border-white/5">
                <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 text-red-400 hover:bg-red-900/20 rounded-2xl transition-all font-bold text-sm mb-6" >
                  <LogOut size={20} /> <span>{t('logout')}</span>
                </button>
                <div className="text-center">
                  <span className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.2em]">{t('build_version')}{version || '1.0.0'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}