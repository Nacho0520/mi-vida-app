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
        className="w-full max-w-md flex items-center justify-around bg-neutral-800/60 backdrop-blur-2xl py-4 radius-pill border border-white/5 shadow-apple pointer-events-auto"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center flex-1 py-1 active:scale-90 transition-transform"
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