import { motion } from 'framer-motion';
import { CheckCircle2, Zap, BarChart3, Smartphone, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LandingPage({ onGetStarted }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-neutral-900 text-white selection:bg-violet-500/30">
      {/* --- Navbar --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-black rounded-sm" />
            </div>
            <span className="font-black tracking-tighter text-xl italic">DAYCLOSE</span>
          </div>
          <button 
            onClick={onGetStarted}
            className="text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all active:scale-95"
          >
            {t('login_btn') || 'Entrar'}
          </button>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              {t('landing_badge') || 'Tu mejor versión empieza al cerrar el día'}
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
              Finaliza tu día <br />
              <span className="text-neutral-500 font-black">con éxito.</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              {t('landing_desc') || 'DayClose es el rastreador de hábitos minimalista diseñado para personas que buscan claridad, no distracciones.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black font-black text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-white/10"
              >
                {t('landing_cta') || 'Empezar ahora'} <ArrowRight size={20} />
              </button>
              <div className="flex items-center gap-2 text-neutral-500 text-sm font-bold">
                <Smartphone size={16} /> {t('landing_pwa_hint') || 'Instalable en iOS & Android'}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- App Showcase (Mockup) --- */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative mx-auto rounded-[2.5rem] border border-white/10 bg-neutral-800/40 p-4 shadow-[0_0_100px_rgba(255,255,255,0.05)]"
          >
            {/* Simulación de la App dentro de la Landing */}
            <div className="rounded-[2rem] bg-neutral-900 aspect-[16/10] overflow-hidden flex flex-col items-center justify-center p-8 border border-white/5">
                <div className="w-full max-w-md space-y-4 opacity-50">
                    <div className="h-20 bg-neutral-800/50 rounded-[2rem] border border-white/5" />
                    <div className="h-20 bg-neutral-800/50 rounded-[2rem] border border-white/5" />
                    <div className="h-20 bg-neutral-800/50 rounded-[2rem] border border-white/5" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-neutral-800 p-8 rounded-[3rem] border border-white/10 shadow-2xl scale-110">
                        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                        <p className="font-black text-xl tracking-tighter italic uppercase text-center">HAZ QUE CUENTE</p>
                    </div>
                </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- Features Grid --- */}
      <section className="px-6 py-20 bg-neutral-950/50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Zap className="text-violet-400" />, 
              title: t('feature_1_title') || 'Interfaz Zero-Friction', 
              desc: t('feature_1_desc') || 'Diseñada para que completes tus hábitos en menos de 10 segundos.' 
            },
            { 
              icon: <BarChart3 className="text-emerald-400" />, 
              title: t('feature_2_title') || 'Estadísticas Visuales', 
              desc: t('feature_2_desc') || 'Mapas de calor y rachas que te motivan a no romper la cadena.' 
            },
            { 
              icon: <Smartphone className="text-blue-400" />, 
              title: t('feature_3_title') || 'Privacidad Total', 
              desc: t('feature_3_desc') || 'Tus datos son tuyos. Sincronizados de forma segura en todos tus dispositivos.' 
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-[2rem] bg-neutral-800/30 border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black mb-3">{feature.title}</h3>
              <p className="text-neutral-500 font-bold text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-neutral-600">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4">© 2026 DAYCLOSE – ALL RIGHTS RESERVED</p>
        <div className="flex justify-center gap-6 text-xs font-bold">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
}