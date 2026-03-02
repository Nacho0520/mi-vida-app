import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Plus, Trash2, Zap, CheckCircle2, X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext'

// ── Constantes ────────────────────────────────────────────────────────────────
const MAX_FREE_GOALS = 1

// ── Animación "papel que se despliega" ────────────────────────────────────────
const paperUnfold = {
  hidden:  { opacity: 0, scaleY: 0.4, scaleX: 0.92, y: -20 },
  visible: {
    opacity: 1, scaleY: 1, scaleX: 1, y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 260, mass: 0.7 },
  },
  exit: {
    opacity: 0, scaleY: 0.3, scaleX: 0.9, y: -16,
    transition: { duration: 0.22, ease: 'easeIn' },
  },
}
const backdropAnim = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekStart() {
  const now  = new Date()
  const day  = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

function barColor(pct) {
  if (pct >= 100) return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
  if (pct >= 60)  return 'bg-emerald-600'
  if (pct >= 30)  return 'bg-amber-500'
  return 'bg-neutral-600'
}

// ── Sub-componente: fila de una meta ──────────────────────────────────────────
function GoalRow({ goal, onIncrement, onDelete, t }) {
  const pct      = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  const complete = pct >= 100
  const [pressing, setPressing] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={`flex items-center gap-3 rounded-[1.5rem] p-4 border transition-colors ${
        complete
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-neutral-900/60 border-white/5'
      }`}
    >
      {/* Icono de estado */}
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
        complete
          ? 'bg-emerald-500/15 border-emerald-500/20'
          : 'bg-white/5 border-white/5'
      }`}>
        {complete
          ? <CheckCircle2 size={16} className="text-emerald-400" />
          : <Target size={14} className="text-neutral-400" />
        }
      </div>

      {/* Info + barra */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className={`text-sm font-semibold truncate ${complete ? 'text-emerald-300' : 'text-white'}`}>
            {goal.title}
          </p>
          <span className="text-[11px] font-black text-neutral-400 ml-2 shrink-0 tabular-nums">
            {goal.current_value}
            <span className="text-neutral-600">/{goal.target_value}</span>
            {goal.unit ? <span className="text-neutral-600 ml-0.5">{goal.unit}</span> : null}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-1.5 bg-neutral-700/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 180 }}
            className={`h-full rounded-full ${barColor(pct)}`}
          />
        </div>
      </div>

      {/* Botón "+" o eliminar */}
      {!complete ? (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onPointerDown={() => setPressing(true)}
          onPointerUp={() => setPressing(false)}
          onPointerLeave={() => setPressing(false)}
          onClick={() => onIncrement(goal)}
          className={`h-9 w-9 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
            pressing
              ? 'bg-white text-black border-white'
              : 'bg-white/8 border-white/10 text-white hover:bg-white/15'
          }`}
          aria-label={`Incrementar ${goal.title}`}
        >
          <Plus size={16} />
        </motion.button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onDelete(goal.id)}
          className="h-9 w-9 rounded-xl flex items-center justify-center border bg-red-500/8 border-red-500/10 text-red-500 hover:bg-red-500/20 shrink-0 transition-colors"
          aria-label={`Eliminar ${goal.title}`}
        >
          <Trash2 size={14} />
        </motion.button>
      )}
    </motion.div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function WeeklyGoals({ isPro, onUpgrade, user, onRefresh }) {
  const { t } = useLanguage()

  const [goals,      setGoals]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [saving,     setSaving]     = useState(false)

  const [formTitle,  setFormTitle]  = useState('')
  const [formTarget, setFormTarget] = useState('')
  const [formUnit,   setFormUnit]   = useState('')

  // ── Supabase: carga ───────────────────────────────────────────────────────
  const loadGoals = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', getWeekStart())
      .order('created_at', { ascending: true })
    if (error) console.error('[WeeklyGoals] Error cargando metas:', error.message)
    else setGoals(data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loadGoals() }, [loadGoals])

  const completedCount = useMemo(
    () => goals.filter(g => g.current_value >= g.target_value).length,
    [goals]
  )

  // ── Supabase: crear meta ──────────────────────────────────────────────────
  const handleCreate = async () => {
    const targetNum = parseInt(formTarget, 10)
    if (!formTitle.trim() || isNaN(targetNum) || targetNum <= 0 || !user?.id) return
    setSaving(true)
    const { error } = await supabase.from('weekly_goals').insert({
      user_id:       user.id,
      week_start:    getWeekStart(),
      title:         formTitle.trim(),
      target_value:  targetNum,
      current_value: 0,
      unit:          formUnit.trim() || null,
    })
    if (error) {
      console.error('[WeeklyGoals] Error creando meta:', error.message)
    } else {
      setFormTitle('')
      setFormTarget('')
      setFormUnit('')
      setShowModal(false)
      await loadGoals()
      await onRefresh?.()           // ← sincroniza WeeklySummaryBar del Dashboard
    }
    setSaving(false)
  }

  // ── Supabase: incrementar valor ───────────────────────────────────────────
  const handleIncrement = async (goal) => {
    const newValue = Math.min(goal.current_value + 1, goal.target_value)
    const { error } = await supabase
      .from('weekly_goals')
      .update({ current_value: newValue })
      .eq('id', goal.id)
    if (error) {
      console.error('[WeeklyGoals] Error actualizando meta:', error.message)
    } else {
      // Optimistic update local para respuesta instantánea en UI
      setGoals(prev =>
        prev.map(g => g.id === goal.id ? { ...g, current_value: newValue } : g)
      )
      await onRefresh?.()           // ← sincroniza WeeklySummaryBar del Dashboard
    }
  }

  // ── Supabase: eliminar meta ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    const { error } = await supabase.from('weekly_goals').delete().eq('id', id)
    if (error) {
      console.error('[WeeklyGoals] Error eliminando meta:', error.message)
    } else {
      setGoals(prev => prev.filter(g => g.id !== id))
      await onRefresh?.()           // ← sincroniza WeeklySummaryBar del Dashboard
    }
  }

  // ── Gate Pro: FREE = max 1 meta ───────────────────────────────────────────
  const handleOpenModal = () => {
    if (!isPro && goals.length >= MAX_FREE_GOALS) { onUpgrade?.(); return }
    setShowModal(true)
  }

  const portal = (node) =>
    typeof document !== 'undefined' ? createPortal(node, document.body) : null

  if (!user) return null

  // Condición del badge en la fila de acción: solo FREE + ya tiene 1 meta
  const showProBadgeInCTA = !isPro && goals.length >= MAX_FREE_GOALS

  return (
    <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl relative overflow-hidden mb-6 text-left">

      {/* ── Cabecera — solo icono + título, sin badge ─────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <Target size={18} className="text-white" />
        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
          {t('more_goals_title')}
        </h2>
      </div>

      {/* ── Resumen rápido (si hay metas) ────────────────────────── */}
      {!loading && goals.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] text-neutral-500 font-medium">
            {t('more_goals_desc')}
          </p>
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full tabular-nums ${
            completedCount === goals.length
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-neutral-800/60 text-neutral-400'
          }`}>
            {completedCount}/{goals.length}
          </span>
        </div>
      )}

      {/* ── Cuerpo ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">

          {/* Estado vacío */}
          {goals.length === 0 && (
            <div className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4">
              <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                <Target size={14} className="text-neutral-600" />
              </div>
              <p className="text-[11px] text-neutral-500 font-medium">
                {t('more_goals_empty')}
              </p>
            </div>
          )}

          {/* Lista de metas */}
          <AnimatePresence mode="popLayout">
            {goals.map(goal => (
              <GoalRow
                key={goal.id}
                goal={goal}
                onIncrement={handleIncrement}
                onDelete={handleDelete}
                t={t}
              />
            ))}
          </AnimatePresence>

          {/* ── Fila CTA "Añadir meta" ──────────────────────────── */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenModal}
            className="w-full flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4 hover:border-white/10 transition-colors"
          >
            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
              <Plus size={16} className="text-neutral-300" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-white">{t('more_goals_add')}</p>
              <p className="text-[11px] text-neutral-500 font-medium">{t('more_goals_add_desc')}</p>
            </div>

            {/* Badge: solo cuando FREE y ya tiene ≥1 meta */}
            {showProBadgeInCTA ? (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0">
                <Zap size={10} fill="currentColor" /> Pro
              </span>
            ) : (
              <span className="text-neutral-600 text-lg leading-none shrink-0">+</span>
            )}
          </motion.button>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Crear nueva meta — paperUnfold
      ══════════════════════════════════════════════════════════════ */}
      {portal(
        <AnimatePresence>
          {showModal && (
            <motion.div
              key="goals-backdrop"
              variants={backdropAnim}
              initial="hidden" animate="visible" exit="exit"
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                key="goals-paper"
                variants={paperUnfold}
                initial="hidden" animate="visible" exit="exit"
                className="w-full max-w-sm bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                style={{ transformOrigin: 'top center' }}
              >
                {/* Franja decorativa */}
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-500/50" />

                <div className="p-6">
                  {/* Cabecera del modal */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Target size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-sm leading-none">
                          {t('more_goals_modal_title')}
                        </h3>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">
                          {t('more_goals_modal_subtitle')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Campo: Título */}
                  <div className="mb-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                      {t('more_goals_field_title')}
                    </label>
                    <input
                      autoFocus
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      maxLength={60}
                      placeholder={t('more_goals_placeholder_title')}
                      className="w-full bg-neutral-950/60 border border-white/8 rounded-2xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>

                  {/* Campos: Objetivo + Unidad */}
                  <div className="flex gap-2 mb-6">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                        {t('more_goals_field_target')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={formTarget}
                        onChange={e => setFormTarget(e.target.value)}
                        placeholder="10"
                        className="w-full bg-neutral-950/60 border border-white/8 rounded-2xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500/40 tabular-nums"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                        {t('more_goals_field_unit')}
                      </label>
                      <input
                        value={formUnit}
                        onChange={e => setFormUnit(e.target.value)}
                        maxLength={12}
                        placeholder={t('more_goals_placeholder_unit')}
                        className="w-full bg-neutral-950/60 border border-white/8 rounded-2xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500/40"
                      />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowModal(false)
                        setFormTitle('')
                        setFormTarget('')
                        setFormUnit('')
                      }}
                      className="flex-1 py-3 text-xs font-black text-neutral-600 hover:text-neutral-400 transition-colors"
                    >
                      {t('more_goals_cancel')}
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!formTitle.trim() || !formTarget || isNaN(parseInt(formTarget, 10)) || saving}
                      className="flex-1 py-3 bg-white text-black text-xs font-black rounded-2xl active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      {saving
                        ? <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                        : <><Target size={12} /> {t('more_goals_save')}</>
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}