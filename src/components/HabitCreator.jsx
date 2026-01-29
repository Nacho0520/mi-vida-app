import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Calendar, Clock, Palette, Sparkles, Trash2, Save, Smile } from 'lucide-react' // Añadido Smile
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext'

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

export default function HabitCreator({ isOpen, onClose, userId, onHabitCreated, habitToEdit = null }) {
  const [title, setTitle] = useState('')
  const [selectedDays, setSelectedDays] = useState(['L', 'M', 'X', 'J', 'V'])
  const [timeOfDay, setTimeOfDay] = useState('night')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0])
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setTitle(habitToEdit.title)
        setSelectedDays(habitToEdit.frequency || [])
        setTimeOfDay(habitToEdit.time_of_day || 'night')
        setSelectedColor(habitToEdit.color || COLORS[0])
        setSelectedIcon(habitToEdit.icon || ICONS[0])
      } else {
        setTitle('')
        setSelectedDays(['L', 'M', 'X', 'J', 'V'])
        setTimeOfDay('night')
        setSelectedColor(COLORS[0])
        setSelectedIcon(ICONS[0])
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
    const habitData = { user_id: userId, title: title.trim(), frequency: selectedDays, time_of_day: timeOfDay, color: selectedColor, icon: selectedIcon, is_active: true }
    try {
      if (habitToEdit) {
        const { error } = await supabase.from('habits').update(habitData).eq('id', habitToEdit.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('habits').insert(habitData)
        if (error) throw error
      }
      onHabitCreated()
      onClose()
    } catch (err) { alert('Error: ' + err.message) } finally { setLoading(false) }
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto z-0" onClick={onClose} />
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="relative z-10 bg-neutral-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 border-t border-neutral-700 shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
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
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título e Icono Actual */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('habit_name_label')}</label>
              <div className="flex gap-3">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl text-3xl bg-neutral-700 border border-neutral-600 shadow-inner">
                  {selectedIcon}
                </div>
                <input type="text" placeholder={t('habit_placeholder')} value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-600 rounded-2xl px-4 text-white text-lg placeholder-neutral-500 focus:border-blue-500 focus:outline-none" />
              </div>
            </div>

            {/* SELECCIÓN DE ICONO (MODIFICACIÓN) */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <Smile size={14} /> {t('icon_label')}
              </label>
              <div className="grid grid-cols-6 gap-2 bg-neutral-900 p-3 rounded-2xl border border-neutral-700 max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
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

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider"><Calendar size={14} /> {t('frequency')}</label>
              <div className="flex justify-between bg-neutral-900 p-2 rounded-2xl border border-neutral-700">
                {DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.id)
                  return (<button key={day.id} type="button" onClick={() => toggleDay(day.id)} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isSelected ? 'bg-blue-500 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}>{day.label}</button>)
                })}
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider"><Clock size={14} /> {t('time_of_day')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[ { id: 'morning', label: t('morning') }, { id: 'afternoon', label: t('afternoon') }, { id: 'night', label: t('night') } ].map(time => (<button key={time.id} type="button" onClick={() => setTimeOfDay(time.id)} className={`py-2 rounded-xl text-sm font-medium border transition-colors ${timeOfDay === time.id ? 'bg-white text-black border-white' : 'bg-neutral-700 text-neutral-300 border-transparent hover:bg-neutral-600'}`}>{time.label}</button>))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider"><Palette size={14} /> {t('color')}</label>
              <div className="flex gap-3 justify-center bg-neutral-900 p-3 rounded-2xl border border-neutral-700">{COLORS.map(color => (<button key={color} type="button" onClick={() => setSelectedColor(color)} className={`w-8 h-8 rounded-full ${color} transition-transform ${selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`} />))}</div>
            </div>
            <button type="submit" disabled={loading || !title} className="w-full bg-white text-black font-black py-4 rounded-xl text-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-2xl active:scale-95 transition-all">
              {loading ? t('saving') : habitToEdit ? <><Save size={20} /> {t('save_changes_btn')}</> : <><Check size={20} /> {t('create_habit_btn')}</>}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}