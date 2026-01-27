import { useState } from 'react'
import { Check, X, Circle, Menu, Plus, Pencil } from 'lucide-react'
import Sidebar from './Sidebar'
import SettingsModal from './SettingsModal'
import HabitCreator from './HabitCreator'
import { supabase } from '../lib/supabaseClient'
import confetti from 'canvas-confetti' // <--- IMPORTAMOS LA FIESTA

// --- CONSTANTE DE ADMINISTRADOR ---
const ADMIN_EMAIL = 'hemmings.nacho@gmail.com' 
// ---------------------------------

function CircularProgress({ percentage }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="none" className="text-neutral-700" />
        <circle
          cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="text-emerald-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl font-bold text-white">{Math.round(percentage)}%</p>
          <p className="mt-1 text-xs text-neutral-400">Completado</p>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ user, habits, todayLogs, onStartReview, onResetToday }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [isCreatorOpen, setCreatorOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null) // Para evitar doble click

  const logsMap = new Map()
  todayLogs.forEach((log) => logsMap.set(log.habit_id, log.status))

  const completedCount = habits.filter((h) => logsMap.get(h.id) === 'completed').length
  const totalCount = habits.length
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const hasPending = habits.some((h) => !logsMap.has(h.id))

  const getStatusIcon = (habitId) => {
    // Si estamos cargando ESTE hábito específico, mostramos un spinner o opacidad
    if (loadingAction === habitId) return <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />

    const status = logsMap.get(habitId)
    if (status === 'completed') return <Check className="h-5 w-5 text-emerald-500" />
    if (status === 'skipped') return <X className="h-5 w-5 text-red-500" />
    return <Circle className="h-5 w-5 text-neutral-500 group-hover:text-white transition-colors" />
  }

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    if (user?.email) return user.email.split('@')[0]
    return 'Usuario'
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const handleHabitCreated = () => {
    window.location.reload()
  }

  const handleEditHabit = (habit) => {
    setEditingHabit(habit)
    setCreatorOpen(true)
  }

  const handleNewHabit = () => {
    setEditingHabit(null)
    setCreatorOpen(true)
  }

  // --- NUEVA FUNCIÓN: TOGGLE RÁPIDO ---
  const handleToggleHabit = async (e, habit) => {
    e.stopPropagation() // IMPORTANTE: Para que no se abra el editor al hacer click en el círculo
    
    if (loadingAction) return // Evitar doble click rapido

    // 1. VIBRACIÓN HÁPTICA (Crunch!)
    if (navigator.vibrate) {
        navigator.vibrate(15) // Vibración corta y seca
    }

    setLoadingAction(habit.id)

    const currentStatus = logsMap.get(habit.id)
    const isCompletedNow = currentStatus === 'completed'

    let error = null

    if (isCompletedNow) {
        // SI YA ESTÁ HECHO -> LO BORRAMOS (Undo)
        const { error: delError } = await supabase
            .from('daily_logs')
            .delete()
            .eq('habit_id', habit.id)
            .eq('user_id', user.id)
            .gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
        error = delError
    } else {
        // SI NO ESTÁ HECHO -> LO MARCAMOS (Do)
        const { error: insError } = await supabase
            .from('daily_logs')
            .insert({
                user_id: user.id,
                habit_id: habit.id,
                status: 'completed',
                note: 'Marcado rápido',
                created_at: new Date().toISOString()
            })
        error = insError

        // --- LÓGICA DE CONFETI ---
        // Si al marcar este, completamos todos...
        // completedCount es el conteo ANTES de marcar este. Así que sumamos 1.
        if (!error && (completedCount + 1) === totalCount) {
            triggerConfetti()
        }
    }

    if (error) {
        alert('Error: ' + error.message)
        setLoadingAction(null)
    } else {
        // Recargar para ver cambios. 
        // Nota: Si lanzamos confeti, esperamos un pelín antes de recargar para que se vea
        if (!isCompletedNow && (completedCount + 1) === totalCount) {
             setTimeout(() => window.location.reload(), 1500) 
        } else {
             window.location.reload()
        }
    }
  }

  const triggerConfetti = () => {
      // Vibración larga de victoria
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      
      const duration = 3 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      const randomInRange = (min, max) => Math.random() * (max - min) + min

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        
        // Confeti desde dos lados
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
      }, 250)
  }
  // ------------------------------------

  return (
    <div className="min-h-screen bg-neutral-900 px-4 py-8 relative">
      
      <button 
        onClick={() => setSidebarOpen(true)}
        className="absolute top-6 left-4 text-white p-2 hover:bg-neutral-800 rounded-full transition-colors"
      >
        <Menu size={28} />
      </button>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setSettingsOpen(false)}
        user={user}
      />

      <HabitCreator
        isOpen={isCreatorOpen}
        onClose={() => {
            setCreatorOpen(false)
            setEditingHabit(null)
        }}
        userId={user.id}
        onHabitCreated={handleHabitCreated}
        initialData={editingHabit} 
      />

      <div className="mx-auto w-full max-w-md mt-6 pb-20">
        
        {onResetToday && user.email === ADMIN_EMAIL && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={onResetToday}
              className="rounded-lg border border-red-900/50 bg-red-900/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/40"
            >
              🛠️ Reset (Admin)
            </button>
          </div>
        )}

        <header className="mb-8 text-center">
          <h2 className="text-xl font-light text-neutral-400">Hola,</h2>
          <h1 className="text-3xl font-bold text-white capitalize">
            {getUserDisplayName()}
          </h1>
        </header>

        <div className="mb-8 flex justify-center">
          <CircularProgress percentage={percentage} />
        </div>

        <div className="mb-6 space-y-3">
          {habits.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-neutral-700 rounded-2xl">
              <p className="text-neutral-400 mb-2">Aún no tienes rutina.</p>
              <p className="text-sm text-neutral-500">Dale al botón + para empezar.</p>
            </div>
          ) : (
            habits.map((habit) => {
              const status = logsMap.get(habit.id)
              const isCompleted = status === 'completed'
              const isSkipped = status === 'skipped'
              return (
                <div
                  key={habit.id}
                  onClick={() => handleEditHabit(habit)} // Click en la tarjeta -> EDITAR
                  className={`relative group flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all active:scale-98 ${
                    isCompleted ? 'border-emerald-700 bg-emerald-900/20'
                    : isSkipped ? 'border-red-700 bg-red-900/20'
                    : 'border-neutral-700 bg-neutral-800 hover:border-neutral-500'
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${habit.color}`}>
                    <span className="text-xl">{habit.icon}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{habit.title}</p>
                        <Pencil size={12} className="text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {isSkipped && todayLogs.find((l) => l.habit_id === habit.id)?.note && (
                      <p className="mt-1 text-xs text-neutral-400">
                        {todayLogs.find((l) => l.habit_id === habit.id)?.note}
                      </p>
                    )}
                  </div>
                  
                  {/* BOTÓN INTERACTIVO: Click en el círculo -> MARCAR/DESMARCAR */}
                  <div 
                    onClick={(e) => handleToggleHabit(e, habit)}
                    className="p-2 -mr-2 rounded-full hover:bg-white/5 active:scale-90 transition-transform"
                  >
                    {getStatusIcon(habit.id)}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {hasPending && (
          <button
            type="button"
            onClick={onStartReview}
            className="w-full rounded-full bg-white px-6 py-4 text-lg font-semibold text-neutral-900 shadow-lg hover:bg-neutral-100 active:scale-98 transition-transform"
          >
            Comenzar Revisión Nocturna
          </button>
        )}

        {!hasPending && totalCount > 0 && (
          <div className="rounded-xl border border-emerald-700 bg-emerald-900/20 p-4 text-center animate-pulse">
             {/* Animación de pulso para celebrar */}
            <p className="text-sm font-medium text-emerald-300">
              ¡Has completado tu revisión de hoy! 🌙
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleNewHabit}
        className="fixed bottom-6 right-6 h-14 w-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center active:scale-90 transition-all z-40"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

    </div>
  )
}

export default Dashboard