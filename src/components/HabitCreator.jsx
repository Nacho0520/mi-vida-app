import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Calendar, Clock, Palette, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 
  'bg-orange-600', 'bg-pink-600', 'bg-red-600', 'bg-cyan-600'
]
const ICONS = ['📚', '💧', '🏃', '🧘', '💊', '💤', '📝', '🧹', '🥦', '💰', '🎸', '📵']
const DAYS = [
  { id: 'L', label: 'L' }, { id: 'M', label: 'M' }, { id: 'X', label: 'X' },
  { id: 'J', label: 'J' }, { id: 'V', label: 'V' }, { id: 'S', label: 'S' }, { id: 'D', label: 'D' }
]

export default function HabitCreator({ isOpen, onClose, userId, onHabitCreated }) {
  const [title, setTitle] = useState('')
  const [selectedDays, setSelectedDays] = useState(['L', 'M', 'X', 'J', 'V'])
  const [timeOfDay, setTimeOfDay] = useState('night')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0])
  const [loading, setLoading] = useState(false)

  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(prev => prev.filter(d => d !== dayId))
      }
    } else {
      setSelectedDays(prev => [...prev, dayId])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    const { error } = await supabase.from('habits').insert({
      user_id: userId,
      title: title.trim(),
      frequency: selectedDays,
      time_of_day: timeOfDay,
      color: selectedColor,
      icon: selectedIcon,
      is_active: true
    })
    setLoading(false)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setTitle('')
      onHabitCreated()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        
        {/* FONDO OSCURO (Z-0) */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto z-0"
          onClick={onClose}
        />

        {/* PANEL (Z-10 y Relative para estar ENCIMA) */}
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 bg-neutral-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 border-t border-neutral-700 shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto"
        >
          {/* Cabecera */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={20} />
              <span className="text-white">Nuevo Hábito</span>
            </h2>
            <button onClick={onClose} className="p-2 bg-neutral-700 rounded-full text-neutral-300 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Título e Icono */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">¿Qué quieres lograr?</label>
              <div className="flex gap-3">
                <button type="button" className="h-14 w-14 flex items-center justify-center rounded-2xl text-3xl bg-neutral-700 border border-neutral-600">
                  {selectedIcon}
                </button>
                <input 
                  type="text" 
                  placeholder="Ej. Leer, Gym..." 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  // HE QUITADO EL AUTO FOCUS AQUÍ
                  className="flex-1 bg-neutral-900 border border-neutral-600 rounded-2xl px-4 text-white text-lg placeholder-neutral-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pt-2">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`min-w-[44px] h-11 rounded-xl text-xl transition-colors flex items-center justify-center ${selectedIcon === icon ? 'bg-blue-600/30 border-2 border-blue-500' : 'bg-neutral-700/50 hover:bg-neutral-700'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Frecuencia */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <Calendar size={14} /> Frecuencia
              </label>
              <div className="flex justify-between bg-neutral-900 p-2 rounded-2xl border border-neutral-700">
                {DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isSelected 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-900/50' 
                          : 'text-neutral-500 hover:text-white'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Momento */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <Clock size={14} /> Momento
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'morning', label: 'Mañana' },
                  { id: 'afternoon', label: 'Tarde' },
                  { id: 'night', label: 'Noche' }
                ].map(time => (
                  <button
                    key={time.id}
                    type="button"
                    onClick={() => setTimeOfDay(time.id)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                      timeOfDay === time.id 
                        ? 'bg-white text-black border-white' 
                        : 'bg-neutral-700 text-neutral-300 border-transparent hover:bg-neutral-600'
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <Palette size={14} /> Color
              </label>
              <div className="flex gap-3 justify-center bg-neutral-900 p-3 rounded-2xl border border-neutral-700">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full ${color} transition-transform ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110' : 'opacity-50 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !title}
              className="w-full bg-white text-black font-bold py-4 rounded-xl text-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Creando...' : 'Crear Hábito'}
            </button>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}