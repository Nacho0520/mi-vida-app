import { useEffect, useState, useCallback } from 'react'
import SwipeCard from './components/SwipeCard'
import NoteModal from './components/NoteModal'
import Dashboard from './components/Dashboard'
import Auth from './components/Auth'
import { supabase } from './lib/supabaseClient'
import ReminderPopup from './components/ReminderPopup'
import TopBanner from './components/TopBanner' // <--- NUEVO IMPORT

// ... (Tus funciones auxiliares getDefaultIconForTitle y getDefaultColorForIndex siguen igual aquí) ...
function getDefaultIconForTitle(title = '', index) {
  const mapping = ['📖', '💧', '🧘', '💤', '🍎', '💪', '📝', '🚶']
  const lower = title.toLowerCase()
  if (lower.includes('leer') || lower.includes('lectura')) return '📖'
  if (lower.includes('agua')) return '💧'
  if (lower.includes('meditar') || lower.includes('respir')) return '🧘'
  if (lower.includes('dormir') || lower.includes('pantalla')) return '💤'
  if (lower.includes('comer') || lower.includes('dieta')) return '🍎'
  if (lower.includes('ejercicio') || lower.includes('flexion') || lower.includes('correr')) return '💪'
  return mapping[index % mapping.length]
}

function getDefaultColorForIndex(index) {
  const colors = [
    'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-purple-500',
    'bg-pink-500', 'bg-orange-500', 'bg-amber-500',
  ]
  return colors[index % colors.length]
}
// ... 

function App() {
  // ... (Tus estados siguen igual) ...
  const [currentIndex, setCurrentIndex] = useState(0)
  const [swipeStatus, setSwipeStatus] = useState(null)
  const [results, setResults] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingHabit, setPendingHabit] = useState(null)

  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  const [habits, setHabits] = useState([])
  const [loadingHabits, setLoadingHabits] = useState(false)
  const [dataError, setDataError] = useState(null)

  const [todayLogs, setTodayLogs] = useState([])
  const [loadingTodayLogs, setLoadingTodayLogs] = useState(false)

  const [mode, setMode] = useState('dashboard')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [hasSaved, setHasSaved] = useState(false)

  const currentHabit = habits[currentIndex]

  // ... (Tus funciones fetchTodayLogs, handleResetToday, handleStartReview, useEffects... TODO IGUAL) ...
  const getTodayDateString = () => {
      const today = new Date()
      return today.toISOString().split('T')[0]
  }
  
  const fetchTodayLogs = useCallback(async () => {
    if (!session) return
    setLoadingTodayLogs(true)
    const todayStart = `${getTodayDateString()}T00:00:00.000Z`
    const todayEnd = `${getTodayDateString()}T23:59:59.999Z`

    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

    if (error) {
      console.error('Error fetching today logs:', error)
      setTodayLogs([])
    } else {
      setTodayLogs(data || [])
    }
    setLoadingTodayLogs(false)
  }, [session])

  const handleResetToday = async () => {
    if (!session) return
    const todayStart = `${getTodayDateString()}T00:00:00.000Z`
    const todayEnd = `${getTodayDateString()}T23:59:59.999Z`

    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .eq('user_id', session.user.id)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

    if (error) {
      alert(`Error al resetear: ${error.message}`)
    } else {
      await fetchTodayLogs()
      setCurrentIndex(0)
      setResults([])
      setHasSaved(false)
      setSaveError(null)
      setSaveSuccess(null)
      setMode('dashboard')
    }
  }

  const handleStartReview = () => {
    setMode('reviewing')
    setCurrentIndex(0)
    setResults([])
    setHasSaved(false)
    setSaveError(null)
    setSaveSuccess(null)
  }

  useEffect(() => {
    const initSession = async () => {
      setLoadingSession(true)
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error(error)
      setSession(data?.session ?? null)
      setLoadingSession(false)
    }
    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    const fetchHabits = async () => {
      setLoadingHabits(true)
      setDataError(null)
      setCurrentIndex(0)
      setResults([])
      setHasSaved(false)
      setSaveError(null)
      setSaveSuccess(null)
      setMode('dashboard')

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)

      if (error) {
        setDataError(error.message)
        setHabits([])
      } else {
        const normalized = (data || []).map((habit, index) => ({
          ...habit,
          icon: habit.icon || getDefaultIconForTitle(habit.title, index),
          color: habit.color || getDefaultColorForIndex(index),
        }))
        setHabits(normalized)
      }
      setLoadingHabits(false)
    }
    fetchHabits()
  }, [session])

  useEffect(() => {
    if (!session) return // Quitamos el check de habits.length para evitar bucles si está vacío
    fetchTodayLogs()
  }, [session, habits, fetchTodayLogs])

  useEffect(() => {
    if (!session) return
    if (!habits.length) return
    if (mode !== 'reviewing') return
    if (currentIndex < habits.length) return
    if (!results.length) return
    if (hasSaved || saving) return

    const saveResults = async () => {
      setSaving(true)
      setSaveError(null)
      setSaveSuccess(null)
      const payload = results.map((item) => ({
        user_id: session.user.id,
        habit_id: item.id,
        status: item.status,
        note: item.note || null,
        created_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from('daily_logs').insert(payload)

      if (error) {
        setSaveError(error.message)
      } else {
        setSaveSuccess('¡Guardado con éxito!')
        setHasSaved(true)
        setTimeout(async () => {
          await fetchTodayLogs()
          setMode('dashboard')
        }, 1500)
      }
      setSaving(false)
    }
    saveResults()
  }, [session, habits, currentIndex, results, hasSaved, saving, mode])

  const handleDrag = (x) => {
    if (x > 100) setSwipeStatus('done')
    else if (x < -100) setSwipeStatus('not-done')
    else setSwipeStatus(null)
  }

  const handleSwipeComplete = (direction) => {
    if (!currentHabit) return
    if (direction === 'right') {
      setResults((prev) => [...prev, { id: currentHabit.id, title: currentHabit.title, status: 'completed' }])
      setSwipeStatus(null)
      setCurrentIndex((prev) => prev + 1)
    } else if (direction === 'left') {
      setPendingHabit(currentHabit)
      setIsModalOpen(true)
    }
  }

  const handleSaveNote = (note) => {
    if (!pendingHabit) {
      setIsModalOpen(false)
      return
    }
    setResults((prev) => [
      ...prev,
      { id: pendingHabit.id, title: pendingHabit.title, status: 'skipped', note: note || '' },
    ])
    setIsModalOpen(false)
    setSwipeStatus(null)
    setPendingHabit(null)
    setCurrentIndex((prev) => prev + 1)
  }

  const handleSkipNote = () => handleSaveNote('')

  const bgColorClass =
    swipeStatus === 'done' ? 'bg-emerald-900'
      : swipeStatus === 'not-done' ? 'bg-red-900'
        : 'bg-neutral-900'

  const completed = results.filter((r) => r.status === 'completed')
  const skipped = results.filter((r) => r.status === 'skipped')

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <p className="text-neutral-300">Cargando sesión...</p>
      </div>
    )
  }

  // SI NO HAY SESIÓN, MOSTRAMOS LOGIN
  if (!session) {
    return (
        <>
            <TopBanner /> {/* Opcional: mostrar aviso incluso en login */}
            <Auth />
        </>
    )
  }

  // >>> AQUÍ ESTABA EL BUG: HE BORRADO EL IF(!habits.length) return ... <<<

  // Modo Dashboard
  if (mode === 'dashboard') {
    if (loadingHabits || loadingTodayLogs) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-900">
          <p className="text-neutral-300">Cargando...</p>
        </div>
      )
    }

    // Si hay error al cargar
    if (dataError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-900 px-4">
          <div className="w-full max-w-md rounded-2xl bg-neutral-800 p-6">
            <p className="text-center text-sm text-red-400">Error: {dataError}</p>
          </div>
        </div>
      )
    }

    // Renderizamos Dashboard (que ahora maneja el estado vacío internamente)
    return (
      <>
        <TopBanner /> {/* <--- AÑADIDO AQUÍ */}
        <Dashboard
          user={session.user}
          habits={habits}
          todayLogs={todayLogs}
          onStartReview={handleStartReview}
          onResetToday={handleResetToday}
        />
        <ReminderPopup session={session} />
      </>
    )
  }

  // Modo Reviewing
  return (
    <div className={`min-h-screen flex items-center justify-center ${bgColorClass} transition-colors duration-300 relative`}>
      <div className="w-full max-w-md mx-auto px-4 py-8">
        <h1 className="mb-2 text-center text-2xl font-semibold text-white">Revisión nocturna</h1>

        {dataError && <p className="mb-3 text-center text-sm text-red-400">{dataError}</p>}
        
        {/* Lógica de renderizado de tarjetas... */}
        {loadingHabits ? (
          <div className="mt-6 flex h-64 items-center justify-center rounded-2xl bg-neutral-800">
            <p className="text-neutral-300">Cargando hábitos...</p>
          </div>
        ) : !habits.length ? (
           // Esto no debería pasar en modo reviewing si venimos del dashboard, pero por seguridad:
          <div className="mt-6 flex h-64 items-center justify-center rounded-2xl bg-neutral-800">
            <p className="text-center text-neutral-300">No hay hábitos configurados.</p>
          </div>
        ) : currentHabit ? (
          <SwipeCard habit={currentHabit} onDrag={handleDrag} onSwipeComplete={handleSwipeComplete} />
        ) : (
          <div className="rounded-2xl bg-neutral-800 p-6">
            <p className="mb-2 text-center text-xl font-semibold text-white">¡Resumen completado!</p>
            {saving && <p className="mb-2 text-center text-sm text-neutral-300">Guardando resultados...</p>}
            {saveError && <p className="mb-2 text-center text-sm text-red-400">Error: {saveError}</p>}
            {saveSuccess && <p className="mb-2 text-center text-sm text-emerald-400">{saveSuccess}</p>}
            
            <div className="mt-3 space-y-4 text-sm text-neutral-100">
               {/* Resumen... */}
               <div>
                <h2 className="mb-1 text-sm font-semibold text-emerald-300">Hechos</h2>
                {completed.length ? (
                  <ul className="list-inside list-disc space-y-1 text-emerald-100">
                    {completed.map((item) => <li key={item.id}>{item.title}</li>)}
                  </ul>
                ) : <p className="text-neutral-400">Ninguno.</p>}
              </div>
              {/* ... */}
            </div>
            
            <button onClick={() => setMode('dashboard')} className="mt-6 w-full py-3 bg-neutral-700 rounded-xl text-white">
                Volver al inicio
            </button>
          </div>
        )}
      </div>
      <NoteModal isOpen={isModalOpen} habitTitle={pendingHabit?.title} onSave={handleSaveNote} onSkip={handleSkipNote} />
      <ReminderPopup session={session} />
    </div>
  )
}

export default App