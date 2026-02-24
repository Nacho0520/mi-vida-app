import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LogOut, Settings, ShieldCheck, Heart, ChevronRight, Sparkles, Beaker, Archive, Zap } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function Sidebar({ isOpen, onClose, user, onLogout, onOpenSettings, onOpenProfile, version, onOpenAdmin, onOpenUpdates, hasUpdates, isTestAccount, onResetTutorial, onResetUpdates, onOpenHistory, isPro, onUpgradePro }) {
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
              <button
                onClick={() => { onOpenProfile(); onClose(); }}
                className="w-full flex items-center gap-3 mb-10 p-4 bg-neutral-800/50 rounded-2xl border border-white/5 text-white hover:bg-neutral-800 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center font-black flex-shrink-0 overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span>{email[0]?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className="overflow-hidden flex-1 text-left">
                  <p className="text-sm font-bold truncate tracking-tight">{user?.user_metadata?.full_name || 'Usuario'}</p>
                  <p className="text-[10px] text-neutral-500 truncate font-mono">{email}</p>
                  <p className="mt-1 text-[10px] text-neutral-600 uppercase tracking-widest">{t('profile_hint')}</p>
                </div>
                <ChevronRight size={18} className="text-neutral-600" />
              </button>
              <nav className="premium-divider flex-1">
                <button onClick={() => { onOpenSettings(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-4 text-neutral-300 bg-neutral-800/60 hover:bg-neutral-800/80 hover:text-white rounded-2xl transition-all font-medium text-sm border border-white/5" >
                  <div className="h-9 w-9 rounded-xl bg-neutral-900/70 border border-white/5 flex items-center justify-center">
                    <Settings size={18} className="text-neutral-300" />
                  </div>
                  <span>{t('profile_settings')}</span>
                </button>
                <button
                  onClick={() => { onOpenHistory?.(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-4 text-neutral-300 bg-neutral-800/40 hover:bg-neutral-800/70 hover:text-white rounded-2xl transition-all font-medium text-sm border border-white/5"
                >
                  <div className="h-9 w-9 rounded-xl bg-neutral-900/70 border border-white/5 flex items-center justify-center">
                    <Archive size={18} className="text-neutral-300" />
                  </div>
                  <span className="flex-1 text-left">{t('history_title')}</span>
                </button>
                <button
                  onClick={() => { onOpenUpdates?.(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-4 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-2xl transition-all font-medium text-sm border border-indigo-500/20"
                >
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Sparkles size={18} className="text-indigo-200" />
                  </div>
                  <span className="flex-1 text-left">{t('updates_title')}</span>
                  {hasUpdates && <span className="h-2 w-2 rounded-full bg-indigo-300" />}
                </button>
                {isTestAccount && (
                  <div className="mt-2 rounded-2xl border border-white/5 bg-neutral-900/60 p-3">
                    <div className="flex items-center gap-2 mb-2 text-neutral-500 text-[10px] uppercase tracking-widest font-bold">
                      <Beaker size={12} /> {t('test_mode_title')}
                    </div>
                    <button
                      onClick={() => { onResetTutorial?.(); onClose(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-neutral-800/80 transition-colors"
                    >
                      {t('test_reset_tutorial')}
                    </button>
                    <button
                      onClick={() => { onResetUpdates?.(); onClose(); }}
                      className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-neutral-800/80 transition-colors"
                    >
                      {t('test_reset_updates')}
                    </button>
                  </div>
                )}
                {isAdmin && (
                  <button onClick={() => { onOpenAdmin(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-4 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-all font-black text-sm border border-blue-500/5" >
                    <ShieldCheck size={20} /> <span className="uppercase tracking-widest text-[10px]">{t('control_tower')}</span>
                  </button>
                )}
              </nav>
              {!isPro && (
                <button
                  onClick={() => { onUpgradePro?.(); onClose(); }}
                  className="mb-4 group flex items-center justify-between w-full px-5 py-5 bg-violet-500/10 border border-violet-500/20 rounded-[2rem] transition-all hover:bg-violet-500/20 active:scale-95 shadow-lg shadow-violet-500/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Zap size={20} className="text-violet-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-violet-400 uppercase tracking-tight leading-none">Plan Pro</p>
                      <p className="text-[10px] text-violet-500/60 font-medium mt-1">Desbloquea todo</p>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                </button>
              )}
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