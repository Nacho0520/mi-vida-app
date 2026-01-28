import { useState } from 'react'
import { Check, X, Circle, Menu, Plus } from 'lucide-react'
import Sidebar from './Sidebar'
import SettingsModal from './SettingsModal'
import HabitCreator from './HabitCreator'
import { supabase } from '../lib/supabaseClient'

// NOTA: He quitado Confetti y useWindowSize para limpiar

function CircularProgress({ percentage }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  // Protección: Si percentage es NaN o null, usar 0
  const safePercentage = percentage || 0
  const offset = circumference - (safePercentage / 100) * circumference

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
          <p className="text-4xl font-bold text-white">{Math.round(safePercentage)}%</p>
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

  // BLINDAJE 1: Asegurarnos de que habits y todayLogs sean arrays, aunque vengan null
  const safeHabits = habits || []
  const safeLogs = todayLogs || []

  const logsMap = new Map()
  safeLogs.forEach((log) => {
    if (log && log.habit_id) logsMap.set(log.habit_id, log.status)
  })

  const completedCount = safeHabits.filter((h) => logsMap.get(h.id) === 'completed').length
  const totalCount = safeHabits.length
  
  // Cálculo seguro del porcentaje
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const hasPending = safeHabits.some((h) => !logsMap.has(h.id))

  const getStatusIcon = (habitId) => {
    const status = logsMap.get(habitId)
    if (status === 'completed') return <Check className="h-5 w-5 text-emerald-500" />
    if (status === 'skipped') return <X className="h-5 w-5 text-red-500" />
    return <Circle className="h-5 w-5 text-neutral-500" />
  }

  const getUserDisplayName = () => {
    // BLINDAJE 2: Proteger acceso a user_metadata
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

  return (
    <div className="min-h-screen bg-neutral-900 px-4 py-8 relative">
      
      {/* Botón Menú */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className="absolute top-6 left-4 text-white p-2 hover:bg-neutral-800 rounded-full transition-colors"
      >
        <Menu size={28} />
      </button>

      {/* Modales */}
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

      {user && ( // BLINDAJE 3: Solo renderizar creador si hay usuario
        <HabitCreator
          isOpen={isCreatorOpen}
          onClose={() => setCreatorOpen(false)}
          userId={user.id}
          onHabitCreated={handleHabitCreated}
        />
      )}

      <div className="mx-auto w-full max-w-md mt-6 pb-20">
        
        {onResetToday && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={onResetToday}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            >
              Reset (Dev)
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

        {/* Lista de Hábitos */}
        <div className="mb-6 space-y-3">
          {safeHabits.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-neutral-700 rounded-2xl">
              <p className="text-neutral-400 mb-2">Aún no tienes rutina.</p>
              <p className="text-sm text-neutral-500">Dale al botón + para empezar.</p>
            </div>
          ) : (
            safeHabits.map((habit) => {
              const status = logsMap.get(habit.id)
              const isCompleted = status === 'completed'
              const isSkipped = status === 'skipped'
              // BLINDAJE 4: Proteger acceso a logs en la búsqueda
              const note = safeLogs.find((l) => l.habit_id === habit.id)?.note

              return (
                <div
                  key={habit.id}
                  className={`flex items-center gap-3 rounded-xl border p-4 ${
                    isCompleted ? 'border-emerald-700 bg-emerald-900/20'
                    : isSkipped ? 'border-red-700 bg-red-900/20'
                    : 'border-neutral-700 bg-neutral-800'
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${habit.color}`}>
                    <span className="text-xl">{habit.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{habit.title}</p>
                    {isSkipped && note && (
                      <p className="mt-1 text-xs text-neutral-400">
                        {note}
                      </p>
                    )}
                  </div>
                  {getStatusIcon(habit.id)}
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
          <div className="rounded-xl border border-emerald-700 bg-emerald-900/20 p-4 text-center">
            <p className="text-sm font-medium text-emerald-300">
              ¡Has completado tu revisión de hoy! 🌙
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => setCreatorOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center active:scale-90 transition-all z-40"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

    </div>
  )
}

export default Dashboard