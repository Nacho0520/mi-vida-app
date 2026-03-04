import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import {
  Zap, BarChart3, Smartphone, ArrowRight,
  Moon, Star, Globe, Shield
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import LiveCounter from './LiveCounter'
import PWAInstallBanner from './PWAInstallBanner'

const SwipeDemo = lazy(() => import('./SwipeDemo'))

// ── Animaciones reutilizables ─────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
}
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
}
const scaleIn = {
  hidden:  { opacity: 0, scale: 0.93 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
}

// Stagger container para el grid de features
const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
}

const ONCE = { once: true, amount: 0.2 }

// ── Sub-componentes puros ─────────────────────────────────────────────────────
function FeatureCard({ icon, color, title, desc }) {
  const colorMap = {
    violet:  'bg-violet-500/10 border-violet-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    blue:    'bg-blue-500/10 border-blue-500/20',
  }
  return (
    <motion.div
      variants={fadeUp}
      className="p-7 rounded-[2rem] bg-neutral-800/30 border border-white/5 hover:border-white/10 transition-colors"
    >
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 border ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-black mb-2 text-white">{title}</h3>
      <p className="text-neutral-500 font-semibold text-sm leading-relaxed">{desc}</p>
    </motion.div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted }) {
  const { t, language, switchLanguage } = useLanguage()

  // Stats trust bar — ahora con Shield de lucide en lugar de emoji de lock
  const stats = [
    { value: '100%', label: language === 'es' ? 'Gratis para empezar' : 'Free to start' },
    { value: 'PWA',  label: language === 'es' ? 'Sin descarga en store' : 'No store download' },
    { value: <Shield size={22} className="mx-auto text-white" />, label: language === 'es' ? 'Datos privados y seguros' : 'Private & secure data' },
  ]

  const features = [
    { icon: <Zap      className="text-violet-400" size={22} />, color: 'violet',  title: t('feature_1_title'), desc: t('feature_1_desc') },
    { icon: <BarChart3 className="text-emerald-400" size={22} />, color: 'emerald', title: t('feature_2_title'), desc: t('feature_2_desc') },
    { icon: <Smartphone className="text-blue-400" size={22} />, color: 'blue',    title: t('feature_3_title'), desc: t('feature_3_desc') },
  ]

  return (
    <div className="min-h-screen bg-neutral-900 text-white selection:bg-violet-500/30 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/pwa-192x192.png" alt="DayClose icon" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-black tracking-tighter text-xl italic">DAYCLOSE</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Switch idioma */}
            <button
              onClick={() => switchLanguage(language === 'es' ? 'en' : 'es')}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all active:scale-95"
            >
              <span className="text-base leading-none">{language === 'es' ? '🇪🇸' : '🇬🇧'}</span>
              <span className="text-xs font-black uppercase tracking-widest">{language === 'es' ? 'ES' : 'EN'}</span>
              <Globe size={13} className="text-neutral-500" />
            </button>
            {/* Login */}
            <button
              onClick={onGetStarted}
              className="text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all active:scale-95"
            >
              {t('login_btn')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.span
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8"
            >
              <Star size={10} fill="currentColor" />
              {t('landing_badge')}
            </motion.span>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
              {t('landing_h1_line1')}
              <br />
              <span className="text-neutral-500">{t('landing_h1_line2')}</span>
            </h1>

            <p className="text-base md:text-lg text-neutral-400 mb-10 max-w-xl mx-auto font-medium leading-relaxed">
              {t('landing_desc')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black font-black text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-white/10"
              >
                {t('landing_cta')} <ArrowRight size={18} />
              </button>
              <div className="flex items-center gap-2 text-neutral-600 text-xs font-semibold">
                <Smartphone size={13} />
                {t('landing_pwa_hint')}
              </div>
            </div>

            {/* Social proof dinámico */}
            <div className="mt-8">
              <LiveCounter language={language} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SwipeDemo — "Así funciona" ──────────────────────────────────── */}
      <section className="px-6 pb-28">
        <div className="max-w-md mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={ONCE}
            className="text-center mb-10"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">
              {t('landing_how_title')}
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter mt-2 text-white">
              {t('landing_how_sub')}
            </h2>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={ONCE}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              </div>
            }>
              <SwipeDemo />
            </Suspense>
          </motion.div>
        </div>
      </section>

      {/* ── Stats / trust bar ──────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={ONCE}
          className="max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center"
        >
          {stats.map((stat, i) => (
            <motion.div key={i} variants={fadeUp} className="p-5 rounded-2xl bg-neutral-800/30 border border-white/5">
              <p className="text-2xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-[11px] text-neutral-500 font-bold leading-snug">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-neutral-950/50">
        <div className="max-w-5xl mx-auto">
          {/* Heading */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={ONCE}
            className="text-center mb-14"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">
              {language === 'es' ? 'Por qué DayClose' : 'Why DayClose'}
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mt-3 text-white">
              {language === 'es' ? 'Simple por diseño,' : 'Simple by design,'}
              <br />
              <span className="text-neutral-500">
                {language === 'es' ? 'poderoso por dentro.' : 'powerful inside.'}
              </span>
            </h2>
          </motion.div>

          {/* Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={ONCE}
          >
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={ONCE}
          className="max-w-xl mx-auto text-center"
        >
          <Moon size={36} className="text-violet-400 mx-auto mb-6" />
          <h2 className="text-4xl font-black tracking-tighter mb-4 leading-tight">
            {language === 'es' ? '¿Listo para cerrar' : 'Ready to close'}
            <br />
            <span className="text-neutral-500">
              {language === 'es' ? 'el día con propósito?' : 'the day with purpose?'}
            </span>
          </h2>
          <p className="text-neutral-500 text-sm font-semibold mb-8">
            {language === 'es'
              ? 'Gratis, sin tarjeta de crédito, sin excusas.'
              : 'Free, no credit card, no excuses.'}
          </p>
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-white text-black font-black text-base flex items-center justify-center gap-2 mx-auto hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-white/10"
          >
            {t('landing_cta')} <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2">
          <img src="/pwa-192x192.png" alt="DayClose icon" className="w-5 h-5 rounded-md object-cover opacity-50" />
          <span className="text-xs font-black italic tracking-tight text-neutral-600">DAYCLOSE</span>
        </div>
      </footer>

      {/* ── Banner de instalación PWA (fixed bottom, solo móvil) ─────── */}
      <PWAInstallBanner language={language} />
    </div>
  )
}