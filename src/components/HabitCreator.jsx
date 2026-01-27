import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Calendar, Clock, Palette, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// Opciones predefinidas para hacerlo fácil
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
  const [selectedDays, setSelectedDays] = useState(['L', 'M', 'X', 'J', 'V']) // Por defecto L-V
  const [timeOfDay, setTimeOfDay] = useState('night') // Por defecto Noche (tu enfoque original)
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0])
  const [loading, setLoading] = useState(false)

  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
      // Evitar dejarlo vacío (al menos 1 día)
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
    
    // Insertar en Supabase
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
      alert('Error al crear: ' + error.message)
    } else {
      // Resetear formulario y cerrar
      setTitle('')
      onHabitCreated() // Avisar al dashboard para que recargue
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        {/* Fondo oscuro */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        />

        {/* Panel Deslizante */}
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-neutral-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 border-t sm:border border-neutral-800 shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto"
        >
          {/* Cabecera */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={20} />
              Nuevo Hábito
            </h2>
            <button onClick={onClose} className="p-2 bg-neutral-800 rounded-full text-neutral-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Título e Icono */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">¿Qué quieres lograr?</label>
              <div className="flex gap-3">
                <button 
                  type="button"
                  className={`h-12 w-12 flex items-center justify-center rounded-xl text-2xl bg-neutral-800 border border-neutral-700`}
                >
                  {selectedIcon}
                </button>
                <input 
                  type="text" 
                  placeholder="Ej. Leer 15 min, Gym..." 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 text-white focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>
              
              {/* Selector Rápido de Iconos */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`min-w-[40px] h-10 rounded-lg text-lg transition-colors ${selectedIcon === icon ? 'bg-blue-600/20 border border-blue-500' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Frecuencia (Días) */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <Calendar size={14} /> Frecuencia
              </label>
              <div className="flex justify-between">
                {DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-110' 
                          : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Momento del día */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
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
                        ? 'bg-neutral-100 text-black border-white' 
                        : 'bg-neutral-800 text-neutral-400 border-transparent hover:bg-neutral-700'
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Color */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <Palette size={14} /> Color
              </label>
              <div className="flex gap-3 justify-center">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full ${color} transition-transform ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={loading || !title}
              className="w-full bg-white text-black font-bold py-4 rounded-xl text-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Creando...' : <><Check size={20} /> Crear Hábito</>}
            </button>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}