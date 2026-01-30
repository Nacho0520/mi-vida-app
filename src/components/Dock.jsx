import { motion, AnimatePresence } from 'framer-motion';
import { Home, BarChart3, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Dock({ activeTab, onTabChange }) {
  const { t } = useLanguage();
  const tabs = [
    { id: 'home', icon: Home, label: t('dock_home') },
    { id: 'stats', icon: BarChart3, label: t('dock_stats') },
    { id: 'apps', icon: LayoutGrid, label: t('dock_more') },
  ];

  return (
    <div className="fixed bottom-6 left-4 right-4 z-40 flex justify-center pointer-events-none">
      <motion.nav 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative w-full max-w-md flex items-center justify-around bg-neutral-900/70 backdrop-blur-2xl py-4 radius-pill border border-white/5 shadow-apple pointer-events-auto overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/80 via-neutral-900/60 to-neutral-800/40 pointer-events-none" />
        <div className="absolute inset-x-6 top-0 h-px bg-white/10 pointer-events-none" />
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.45)] pointer-events-none" />
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative z-10 flex flex-col items-center flex-1 py-1 active:scale-90 transition-transform"
            >
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-all duration-300 ${
                  isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-neutral-500'
                }`} 
              />
              <AnimatePresence>
                {isActive && (
                  <motion.div 
                    layoutId="dock-dot"
                    className="absolute -bottom-1.5 h-1 w-1 bg-white rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  />
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </motion.nav>
    </div>
  );
}