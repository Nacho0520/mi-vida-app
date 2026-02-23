import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Calendar, Clock, Palette, Sparkles, Trash2, Save, Smile, ChevronDown, Settings } from 'lucide-react' // Añadido Smile
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext'
import ProModal from './ProModal'

const COLORS = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-red-600', 'bg-cyan-600']

// BIBLIOTECA DE ICONOS EXPANDIDA (+60 opciones)
const ICONS = [
  '📚', '💧', '🏃', '🧘', '💊', '💤', '📝', '🧹', '🥦', '💰', '🎸', '📵',
  '🏋️', '🚴', '🏊', '🚶', '🍎', '🥗', '🥤', '🦷', '💻', '✍️', '🧠', '🎯',
  '⏰', '📧', '💼', '🎓', '🧺', '🍳', '🪴', '🛁', '🛌', '🚿', '🧼', '🎨',
  '🎮', '🎬', '📷', '🎧', '♟️', '🧶', '👫', '🐕', '🐈', '☕', '🍺', '🍦',
  '✈️', '🛒', '👔', '🛠️', '🚗', '📈', '💎', '💡', '☀️', '🌑', '🌊', '⛰️',
  '🌳', '🕯️', '✨', '🔓', '🚭', '💪', '🤳', '🧽'
]

const DAYS = [{ id: 'L', label: 'L' }, { id: 'M', label: 'M' }, { id: 'X', label: 'X' }, { id: 'J', label: 'J' }, { id: 'V', label: 'V' }, { id: 'S', label: 'S' }, { id: 'D', label: 'D' }]
const MotionDiv = motion.div

const normalizeMiniHabits = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (!item) return null
        if (typeof item === 'string') {
          try {
            const parsed = JSON.parse(item)
            if (parsed && typeof parsed === 'object') {
              const title = parsed.title || parsed.name || ''
              if (!title) return null
              return {
                title,
                icon: parsed.icon || ICONS[index % ICONS.length],
                color: parsed.color || COLORS[index % COLORS.length]
              }
            }
          } catch {
            // Keep as plain string
          }
          return { title: item, icon: ICONS[index % ICONS.length], color: COLORS[index % COLORS.length] }
        }
        if (typeof item === 'object') {
          const title = item.title || item.name || ''
          if (!title) return null
          return {
            title,
            icon: item.icon || ICONS[index % ICONS.length],
            color: item.color || COLORS[index % COLORS.length]
          }
        }
        return null
      })
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return normalizeMiniHabits(parsed)
    } catch {
      // Fallback to comma-separated strings
    }
    return value
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map((raw, index) => {
        try {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            const title = parsed.title || parsed.name || ''
            if (!title) return null
            return {
              title,
              icon: parsed.icon || ICONS[index % ICONS.length],
              color: parsed.color || COLORS[index % COLORS.length]
            }
          }
        } catch {
          // Use raw string
        }
        return {
          title: raw,
          icon: ICONS[index % ICONS.length],
          color: COLORS[index % COLORS.length]
        }
      })
      .filter(Boolean)
  }
  return []
}

export default function HabitCreator({ isOpen, onClose, userId, onHabitCreated, habitToEdit = null }) {
  const [title, setTitle] = useState('')
  const [selectedDays, setSelectedDays] = useState(['L', 'M', 'X', 'J', 'V'])
  const [timeOfDay, setTimeOfDay] = useState('night')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0])
  const [miniHabits, setMiniHabits] = useState([])
  const [miniHabitInput, setMiniHabitInput] = useState('')
  const [miniHabitIcon, setMiniHabitIcon] = useState(ICONS[0])
  const [miniHabitColor, setMiniHabitColor] = useState(COLORS[0])
  const [editingMiniIndex, setEditingMiniIndex] = useState(null)
  const [showMiniHabits, setShowMiniHabits] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showProModal, setShowProModal] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setTitle(habitToEdit.title)
        setSelectedDays(habitToEdit.frequency || [])
        setTimeOfDay(habitToEdit.time_of_day || 'night')
        setSelectedColor(habitToEdit.color || COLORS[0])
        setSelectedIcon(habitToEdit.icon || ICONS[0])
        setMiniHabits(normalizeMiniHabits(habitToEdit.mini_habits))
        setMiniHabitIcon(ICONS[0])
        setMiniHabitColor(COLORS[0])
        setMiniHabitInput('')
        setEditingMiniIndex(null)
        setShowMiniHabits(normalizeMiniHabits(habitToEdit.mini_habits).length > 0)
      } else {
        setTitle('')
        setSelectedDays(['L', 'M', 'X', 'J', 'V'])
        setTimeOfDay('night')
        setSelectedColor(COLORS[0])
        setSelectedIcon(ICONS[0])
        setMiniHabits([])
        setMiniHabitInput('')
        setMiniHabitIcon(ICONS[0])
        setMiniHabitColor(COLORS[0])
        setEditingMiniIndex(null)
        setShowMiniHabits(false)
      }
    }
  }, [isOpen, habitToEdit])

  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) setSelectedDays(prev => prev.filter(d => d !== dayId))
    } else {
      setSelectedDays(prev => [...prev, dayId])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const { data: { user } = {} } = await supabase.auth.getUser()

      // Leer localStorage aquí, en cada intento de crear hábito
      const ADMIN_EMAIL = 'hemmings.nacho@gmail.com'
      const TEST_EMAIL = 'test@test.com'
      const isSimulatingFree = localStorage.getItem('dayclose_simulate_free') === 'true'
      const isPrivileged =
        (user?.email === ADMIN_EMAIL) ||
        (user?.email === TEST_EMAIL && !isSimulatingFree)

      if (!isPrivileged) {
        const { data: existingHabits, error: countError } = await supabase
          .from('habits')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)

        if (countError) throw countError
        if (existingHabits && existingHabits.length >= 5) {
          setLoading(false)
          setShowProModal(true)
          return
        }
      }

      const habitData = {
        user_id: userId,
        title: title.trim(),
        frequency: selectedDays,
        time_of_day: timeOfDay,
        color: selectedColor,
        icon: selectedIcon,
        is_active: true,
        mini_habits: miniHabits
          .filter(h => h?.title?.trim())
          .map(h => ({ title: h.title.trim(), icon: h.icon, color: h.color }))
      }

      if (habitToEdit) {
        const { error } = await supabase.from('habits').update(habitData).eq('id', habitToEdit.id)
        if (error) {
          if (String(error.message || '').includes('mini_habits')) {
            const { mini_habits: _mini_habits, ...fallback } = habitData
            const { error: fallbackError } = await supabase.from('habits').update(fallback).eq('id', habitToEdit.id)
            if (fallbackError) throw fallbackError
          } else {
            throw error
          }
        }
      } else {
        const { error } = await supabase.from('habits').insert(habitData)
        if (error) {
          if (String(error.message || '').includes('mini_habits')) {
            const { mini_habits: _mini_habits, ...fallback } = habitData
            const { error: fallbackError } = await supabase.from('habits').insert(fallback)
            if (fallbackError) throw fallbackError
          } else {
            throw error
          }
        }
      }
      onHabitCreated()
      onClose()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMiniHabit = () => {
    const value = miniHabitInput.trim()
    if (!value) return
    if (editingMiniIndex === null && miniHabits.some(item => item.title === value)) {
      setMiniHabitInput('')
      return
    }
    if (editingMiniIndex !== null) {
      setMiniHabits(prev => prev.map((item, index) => (
        index === editingMiniIndex ? { title: value, icon: miniHabitIcon, color: miniHabitColor } : item
      )))
    } else {
      setMiniHabits(prev => [
        ...prev,
        { title: value, icon: miniHabitIcon, color: miniHabitColor }
      ].slice(0, 8))
    }
    setMiniHabitInput('')
    setMiniHabitIcon(ICONS[0])
    setMiniHabitColor(COLORS[0])
    setEditingMiniIndex(null)
  }

  const handleRemoveMiniHabit = (value) => {
    setMiniHabits(prev => prev.filter(item => item.title !== value))
    if (miniHabitInput.trim() === value) {
      setMiniHabitInput('')
      setMiniHabitIcon(ICONS[0])
      setMiniHabitColor(COLORS[0])
      setEditingMiniIndex(null)
    }
  }

  const handleEditMiniHabit = (item, index) => {
    setMiniHabitInput(item.title)
    setMiniHabitIcon(item.icon)
    setMiniHabitColor(item.color)
    setEditingMiniIndex(index)
  }

  const handleCancelEditMiniHabit = () => {
    setMiniHabitInput('')
    setMiniHabitIcon(ICONS[0])
    setMiniHabitColor(COLORS[0])
    setEditingMiniIndex(null)
  }

  const handleDelete = async () => {
    if (!confirm(t('confirm_delete'))) return
    setLoading(true)
    try {
      await supabase.from('daily_logs').delete().eq('habit_id', habitToEdit.id)
      const { error } = await supabase.from('habits').delete().eq('id', habitToEdit.id)
      if (error) throw error
      onHabitCreated()
      onClose()
    } catch (err) { alert(t('error_delete') + err.message) } finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto z-0" onClick={onClose} />
        <MotionDiv initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="relative z-10 bg-neutral-800 w-full max-w-md rounded-t-3xl sm:radius-card p-6 border-t border-white/5 shadow-apple pointer-events-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {habitToEdit ? <Palette className="text-blue-400" size={20} /> : <Sparkles className="text-yellow-400" size={20} />}
              <span className="text-white">{habitToEdit ? t('edit_habit') : t('new_habit')}</span>
            </h2>
            <div className="flex gap-2">
              {habitToEdit && (<button onClick={handleDelete} className="p-2 bg-red-900/30 rounded-full text-red-400 hover:bg-red-900/50 transition-colors" type="button"><Trash2 size={20} /></button>)}
              <button onClick={onClose} className="p-2 bg-neutral-700 rounded-full text-neutral-300 hover:text-white transition-colors"><X size={20} /></button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="premium-divider">
            {/* Título e Icono Actual */}
            <div className="premium-divider">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('habit_name_label')}</label>
              <div className="flex gap-3">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl text-3xl bg-neutral-700 border border-white/5 shadow-inner">
                  {selectedIcon}
                </div>
                <input type="text" placeholder={t('habit_placeholder')} value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-800/60 rounded-2xl px-4 text-white text-lg placeholder-neutral-500 focus:border-neutral-400/50 focus:outline-none" />
              </div>
            </div>

            <div className="premium-divider">
              <button
                type="button"
                onClick={() => setShowMiniHabits((prev) => !prev)}
                className="w-full flex items-center justify-between radius-card border border-white/5 bg-neutral-900/60 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">{t('mini_habits_title')}</p>
                  <p className="text-[11px] text-neutral-500">{t('mini_habits_hint')}</p>
                </div>
                <ChevronDown size={18} className={`text-neutral-500 transition-transform ${showMiniHabits ? 'rotate-180' : ''}`} />
              </button>

              {showMiniHabits && (
                <>
                  <div className="flex gap-2">
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/5 ${miniHabitColor}`}>
                      {miniHabitIcon}
                    </div>
                    <input
                      type="text"
                      value={miniHabitInput}
                      onChange={(e) => setMiniHabitInput(e.target.value)}
                      placeholder={t('mini_habits_placeholder')}
                      className="flex-1 bg-neutral-900 border border-neutral-800/60 rounded-2xl px-4 py-3 text-white text-sm placeholder-neutral-500 focus:border-neutral-400/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddMiniHabit}
                      className="px-4 rounded-2xl bg-white/10 text-white text-sm font-semibold border border-white/5 hover:bg-white/20"
                    >
                      {editingMiniIndex !== null ? t('mini_habits_update') : t('mini_habits_add')}
                    </button>
                  </div>
                  {editingMiniIndex !== null && (
                    <button
                      type="button"
                      onClick={handleCancelEditMiniHabit}
                      className="text-xs text-neutral-500 hover:text-neutral-300"
                    >
                      {t('mini_habits_cancel_edit')}
                    </button>
                  )}
                  <div className="grid grid-cols-8 gap-2 bg-neutral-900 p-3 rounded-2xl border border-white/5 max-h-28 overflow-y-auto custom-scrollbar shadow-inner">
                    {ICONS.map(icon => (
                      <button
                        key={`mini-${icon}`}
                        type="button"
                        onClick={() => setMiniHabitIcon(icon)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all ${miniHabitIcon === icon ? 'bg-white/10 ring-2 ring-white scale-105 shadow-lg' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-center bg-neutral-900 p-2 rounded-2xl border border-white/5">
                    {COLORS.map(color => (
                      <button
                        key={`mini-${color}`}
                        type="button"
                        onClick={() => setMiniHabitColor(color)}
                        className={`w-7 h-7 rounded-full ${color} transition-transform ${miniHabitColor === color ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                  {miniHabits.length > 0 && (
                    <div className="premium-divider">
                      {miniHabits.map((item, index) => (
                        <div
                          key={`${item.title}-${index}`}
                          type="button"
                          className="flex items-center gap-3 radius-card border border-white/5 bg-neutral-900/70 px-3 py-2 text-[11px] text-neutral-200"
                        >
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${item.color}`}>
                            <span className="text-base">{item.icon}</span>
                          </div>
                          <span className="font-semibold tracking-tight flex-1">{item.title}</span>
                          <button
                            type="button"
                            onClick={() => handleEditMiniHabit(item, index)}
                            className="text-neutral-500 hover:text-blue-300"
                            title={t('mini_habits_edit')}
                          >
                            <Settings size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMiniHabit(item.title)}
                            className="text-neutral-500 hover:text-white"
                            title={t('mini_habits_remove')}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* SELECCIÓN DE ICONO (MODIFICACIÓN) */}
            <div className="premium-divider">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <Smile size={14} /> {t('icon_label')}
              </label>
              <div className="grid grid-cols-6 gap-2 bg-neutral-900 p-3 rounded-2xl border border-white/5 max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${selectedIcon === icon ? 'bg-white/10 ring-2 ring-white scale-110 shadow-lg' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="premium-divider">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider"><Calendar size={14} /> {t('frequency')}</label>
              <div className="flex justify-between bg-neutral-900 p-2 rounded-2xl border border-white/5">
                {DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.id)
                  return (<button key={day.id} type="button" onClick={() => toggleDay(day.id)} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isSelected ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>{day.label}</button>)
                })}
              </div>
            </div>
            <div className="premium-divider">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider"><Clock size={14} /> {t('time_of_day')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[ { id: 'morning', label: t('morning') }, { id: 'afternoon', label: t('afternoon') }, { id: 'night', label: t('night') } ].map(time => (<button key={time.id} type="button" onClick={() => setTimeOfDay(time.id)} className={`py-2 rounded-xl text-sm font-medium border transition-colors ${timeOfDay === time.id ? 'bg-white text-black border-white' : 'bg-neutral-700 text-neutral-300 border-transparent hover:bg-neutral-600'}`}>{time.label}</button>))}
              </div>
            </div>
            <div className="premium-divider">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider"><Palette size={14} /> {t('color')}</label>
              <div className="flex gap-3 justify-center bg-neutral-900 p-3 rounded-2xl border border-white/5">{COLORS.map(color => (<button key={color} type="button" onClick={() => setSelectedColor(color)} className={`w-8 h-8 rounded-full ${color} transition-transform ${selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`} />))}</div>
            </div>
            <button type="submit" disabled={loading || !title} className="w-full bg-white text-black font-black py-4 rounded-xl text-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-2xl active:scale-95 transition-all">
              {loading ? t('saving') : habitToEdit ? <><Save size={20} /> {t('save_changes_btn')}</> : <><Check size={20} /> {t('create_habit_btn')}</>}
            </button>
          </form>
        </MotionDiv>
      </div>
      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
    </AnimatePresence>
  )
}