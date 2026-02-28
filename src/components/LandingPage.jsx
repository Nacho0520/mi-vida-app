import { motion } from 'framer-motion';
import {
  CheckCircle2, Zap, BarChart3, Smartphone, ArrowRight,
  Moon, Flame, StickyNote, Star, Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function MockHabitCard({ emoji, label, done, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className={`flex items-center justify-between px-5 py-4 rounded-2xl border ${
        done
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-neutral-800/60 border-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <span className={`text-sm font-bold ${done ? 'text-white' : 'text-neutral-400'}`}>
          {label}
        </span>
      </div>
      {done ? (
        <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-white/10 shrink-0" />
      )}
    </motion.div>
  );
}

export default function LandingPage({ onGetStarted }) {
  const { t, language, switchLanguage } = useLanguage();

  const features = [
    {
      icon: <Zap className="text-violet-400" size={22} />,
      color: 'violet',
      title: t('feature_1_title'),
      desc: t('feature_1_desc'),
    },
    {
      icon: <BarChart3 className="text-emerald-400" size={22} />,
      color: 'emerald',
      title: t('feature_2_title'),
      desc: t('feature_2_desc'),
    },
    {
      icon: <Smartphone className="text-blue-400" size={22} />,
      color: 'blue',
      title: t('feature_3_title'),
      desc: t('feature_3_desc'),
    },
  ];

  const colorMap = {
    violet: 'bg-violet-500/10 border-violet-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
  };

  const mockupTexts = {
    today: language === 'es' ? 'Hoy' : 'Today',
    myHabits: language === 'es' ? 'Mis hábitos' : 'My habits',
    noteLabel: language === 'es' ? 'Nota del día' : "Today's note",
    noteText: language === 'es'
      ? '"Hoy fue un día retador pero di lo mejor de mí. Mañana sigo."'
      : '"Today was challenging, but I gave my best. Tomorrow I keep going."',
    habits: language === 'es'
      ? [
          { emoji: '💧', label: 'Tomar agua', done: true },
          { emoji: '🧘', label: 'Meditación', done: true },
          { emoji: '📚', label: 'Leer 20 min', done: false },
          { emoji: '🏃', label: 'Ejercicio', done: false },
        ]
      : [
          { emoji: '💧', label: 'Drink water', done: true },
          { emoji: '🧘', label: 'Meditation', done: true },
          { emoji: '📚', label: 'Read 20 min', done: false },
          { emoji: '🏃', label: 'Exercise', done: false },
        ],
    preview: language === 'es' ? 'Vista previa de la app' : 'App preview',
    progress: '2/4',
  };

  const stats = language === 'es'
    ? [
        { value: '100%', label: 'Gratis para empezar' },
        { value: 'PWA', label: 'Sin descarga en app store' },
        { value: '🔒', label: 'Datos privados y seguros' },
      ]
    : [
        { value: '100%', label: 'Free to start' },
        { value: 'PWA', label: 'No app store download' },
        { value: '🔒', label: 'Private & secure data' },
      ];

  const featureHeading = language === 'es'
    ? { sub: 'Por qué DayClose', title: 'Simple por diseño,', subtitle: 'poderoso por dentro.' }
    : { sub: 'Why DayClose', title: 'Simple by design,', subtitle: 'powerful inside.' };

  const ctaTexts = language === 'es'
    ? {
        title: '¿Listo para cerrar',
        subtitle: 'el día con propósito?',
        desc: 'Gratis, sin tarjeta de crédito, sin excusas.',
      }
    : {
        title: 'Ready to close',
        subtitle: 'the day with purpose?',
        desc: 'Free, no credit card, no excuses.',
      };

  return (
    <div className="min-h-screen bg-neutral-900 text-white selection:bg-violet-500/30 overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="DayClose icon"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span className="font-black tracking-tighter text-xl italic">DAYCLOSE</span>
          </div>

          {/* Acciones del navbar */}
          <div className="flex items-center gap-3">

            {/* ✅ Botón de idioma — muestra el idioma ACTUAL con bandera */}
            <button
              onClick={() => switchLanguage(language === 'es' ? 'en' : 'es')}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all active:scale-95"
            >
              {/* Bandera del idioma actual */}
              <span className="text-base leading-none">
                {language === 'es' ? '🇪🇸' : '🇬🇧'}
              </span>
              {/* Código del idioma actual ✅ CORREGIDO */}
              <span className="text-xs font-black uppercase tracking-widest">
                {language === 'es' ? 'ES' : 'EN'}
              </span>
              <Globe size={13} className="text-neutral-500" />
            </button>

            {/* Botón login */}
            <button
              onClick={onGetStarted}
              className="text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all active:scale-95"
            >
              {t('login_btn')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Star size={10} fill="currentColor" />
              {t('landing_badge')}
            </span>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
              {language === 'es' ? (
                <>
                  Finaliza tu día
                  <br />
                  <span className="text-neutral-500">con éxito.</span>
                </>
              ) : (
                <>
                  Close your day
                  <br />
                  <span className="text-neutral-500">with success.</span>
                </>
              )}
            </h1>

            <p className="text-base md:text-lg text-neutral-400 mb-10 max-w-xl mx-auto font-medium leading-relaxed">
              {t('landing_desc')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black font-black text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-white/10"
              >
                {t('landing_cta')} <ArrowRight size={18} />
              </button>
              <div className="flex items-center gap-2 text-neutral-500 text-sm font-semibold">
                <Smartphone size={15} />
                {t('landing_pwa_hint')}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── App Mockup ── */}
      <section className="px-6 pb-28">
        <div className="max-w-md mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600 mb-5"
          >
            {mockupTexts.preview}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-[3rem] border border-white/10 bg-neutral-800/40 p-5 shadow-[0_0_80px_rgba(139,92,246,0.08)]"
          >
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                  {mockupTexts.today}
                </p>
                <p className="text-lg font-black text-white tracking-tight leading-none">
                  {mockupTexts.myHabits}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-700/50 rounded-full px-3 py-1.5 border border-white/5">
                <Flame size={13} className="text-orange-400" />
                <span className="text-xs font-black text-white">12</span>
              </div>
            </div>

            <div className="space-y-3">
              {mockupTexts.habits.map((h, i) => (
                <MockHabitCard
                  key={i}
                  emoji={h.emoji}
                  label={h.label}
                  done={h.done}
                  delay={0.1 + i * 0.1}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-4 p-4 rounded-2xl bg-neutral-900/60 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-1">
                <StickyNote size={13} className="text-violet-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  {mockupTexts.noteLabel}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium italic leading-relaxed">
                {mockupTexts.noteText}
              </p>
            </motion.div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '50%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
              <span className="text-[10px] font-black text-neutral-500">{mockupTexts.progress}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats / trust ── */}
      <section className="px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center"
        >
          {stats.map((stat, i) => (
            <div key={i} className="p-5 rounded-2xl bg-neutral-800/30 border border-white/5">
              <p className="text-2xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-[11px] text-neutral-500 font-bold leading-snug">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features Grid ── */}
      <section className="px-6 py-20 bg-neutral-950/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">
              {featureHeading.sub}
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mt-3 text-white">
              {featureHeading.title}
              <br />
              <span className="text-neutral-500">{featureHeading.subtitle}</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-7 rounded-[2rem] bg-neutral-800/30 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 border ${colorMap[feature.color]}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black mb-2 text-white">{feature.title}</h3>
                <p className="text-neutral-500 font-semibold text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto text-center"
        >
          <Moon size={36} className="text-violet-400 mx-auto mb-6" />
          <h2 className="text-4xl font-black tracking-tighter mb-4 leading-tight">
            {ctaTexts.title}
            <br />
            <span className="text-neutral-500">{ctaTexts.subtitle}</span>
          </h2>
          <p className="text-neutral-500 text-sm font-semibold mb-8">
            {ctaTexts.desc}
          </p>
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-white text-black font-black text-base flex items-center justify-center gap-2 mx-auto hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-white/10"
          >
            {t('landing_cta')} <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* ── Footer limpio ── */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2">
          <img
            src="/pwa-192x192.png"
            alt="DayClose icon"
            className="w-5 h-5 rounded-md object-cover opacity-50"
          />
          <span className="text-xs font-black italic tracking-tight text-neutral-600">DAYCLOSE</span>
        </div>
      </footer>

    </div>
  );
}