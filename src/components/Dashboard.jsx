import { useState } from "react";
// Mantenemos los mismos iconos para consistencia
import { Check, X, Circle, Menu, Plus, Trash2, Settings, ChevronLeft } from "lucide-react";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";
import HabitCreator from "./HabitCreator";
import { supabase } from "../lib/supabaseClient";

function CircularProgress({ percentage }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = percentage || 0;
  const offset = circumference - (safePercentage / 100) * circumference;

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
  );
}

function Dashboard({ user, habits, todayLogs, onStartReview, onResetToday }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isCreatorOpen, setCreatorOpen] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const safeHabits = habits || [];
  const safeLogs = todayLogs || [];
  
  const logsMap = new Map();
  safeLogs.forEach((log) => { 
    if (log?.habit_id) logsMap.set(log.habit_id, { status: log.status, logId: log.id }); 
  });

  const completedCount = safeHabits.filter((h) => logsMap.get(h.id)?.status === "completed").length;
  const totalCount = safeHabits.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const hasPending = safeHabits.some((h) => !logsMap.has(h.id));

  // --- ACCIÓN: DESMARCAR ESTADO ---
  const handleClearStatus = async (habitId) => {
    const logData = logsMap.get(habitId);
    if (!logData) return;

    try {
      const { error } = await supabase
        .from('daily_logs')
        .delete()
        .eq('id', logData.logId);
      
      if (error) throw error;
      window.location.reload(); 
    } catch (error) {
      console.error("Error al desmarcar:", error);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (confirm("¿Eliminar este hábito y todo su historial? Esta acción no se puede deshacer.")) {
      try {
        await supabase.from('daily_logs').delete().eq('habit_id', habitId);
        const { error } = await supabase.from('habits').delete().eq('id', habitId);
        if (error) throw error;
        window.location.reload();
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("No se pudo eliminar el hábito.");
      }
    }
  };

  const handleStartReviewInternal = () => {
    setIsReviewMode(true);
    onStartReview();
  };

  // MODIFICACIÓN "OPCIÓN B": Tap directo intuitivo
  const getStatusIcon = (habitId) => {
    const logData = logsMap.get(habitId);
    
    // Si está pendiente, mostramos el círculo neutral de siempre
    if (!logData) return <Circle className="h-6 w-6 text-neutral-600" />;

    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          handleClearStatus(habitId);
        }}
        // Estilo: Área de contacto mayor (h-10 w-10) y efecto de rebote al tocar (active:scale-75)
        className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-75 active:bg-white/5"
      >
        {logData.status === "completed" ? (
          <Check className="h-7 w-7 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
        ) : (
          <X className="h-7 w-7 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-900 px-4 py-8 relative">
      
      {isReviewMode && (
        <button
          onClick={() => {
            setIsReviewMode(false);
            window.location.reload();
          }}
          className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 z-50 flex items-center gap-1 text-sm font-medium bg-neutral-800/50 rounded-full px-4 py-2 border border-neutral-700 backdrop-blur-md"
        >
          <ChevronLeft size={18} />
          <span>Salir</span>
        </button>
      )}

      {!isReviewMode && (
        <button onClick={() => setSidebarOpen(true)} className="absolute top-6 left-4 text-white p-2 hover:bg-neutral-800 rounded-full transition-colors">
          <Menu size={28} />
        </button>
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={() => supabase.auth.signOut().then(() => window.location.reload())} onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} user={user} />

      <HabitCreator 
        isOpen={isCreatorOpen || !!editHabit} 
        onClose={() => { setCreatorOpen(false); setEditHabit(null); }} 
        userId={user?.id} 
        habitToEdit={editHabit}
        onHabitCreated={() => window.location.reload()} 
      />

      <div className="mx-auto w-full max-w-md mt-6 pb-20">
        <header className="mb-8 text-center">
          <h2 className="text-xl font-light text-neutral-400 italic">Hola,</h2>
          <h1 className="text-3xl font-bold text-white tracking-tight capitalize">
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
          </h1>
        </header>

        <div className="mb-8 flex justify-center">
          <CircularProgress percentage={percentage} />
        </div>

        <div className="mb-6 space-y-3">
          {safeHabits.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/50">
              <p className="text-neutral-500 text-sm">Empieza añadiendo tu primer hábito.</p>
            </div>
          ) : (
            safeHabits.map((habit) => {
              const logData = logsMap.get(habit.id);
              const isCompleted = logData?.status === "completed";
              const isSkipped = logData?.status === "skipped";
              const note = safeLogs.find((l) => l.habit_id === habit.id)?.note;

              return (
                <div key={habit.id} className="group relative flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-800/40 p-4 backdrop-blur-sm transition-all hover:bg-neutral-800/60">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${habit.color} shadow-inner flex-shrink-0`}>
                    <span className="text-2xl">{habit.icon}</span>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-white truncate text-base">{habit.title}</p>
                  </div>

                  <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity pr-2">
                    <button onClick={() => setEditHabit(habit)} className="p-2 text-neutral-400 hover:text-blue-400 rounded-lg hover:bg-blue-400/10 transition-colors">
                      <Settings size={18} />
                    </button>
                    <button onClick={() => handleDeleteHabit(habit.id)} className="p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    {getStatusIcon(habit.id)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {hasPending && !isReviewMode && (
          <button 
            onClick={handleStartReviewInternal} 
            className="w-full rounded-2xl bg-white px-6 py-5 text-lg font-bold text-neutral-950 shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
          >
            Comenzar Revisión Nocturna
          </button>
        )}

        {!hasPending && totalCount > 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center backdrop-blur-sm">
            <p className="text-sm font-semibold text-emerald-400">
              Has completado tu revisión de hoy. 🌙
            </p>
          </div>
        )}
      </div>

      {!isReviewMode && (
        <button 
          onClick={() => setCreatorOpen(true)} 
          className="fixed bottom-8 right-6 h-16 w-16 bg-blue-600 text-white rounded-2xl shadow-[0_10px_25px_rgba(37,99,235,0.4)] flex items-center justify-center active:scale-90 transition-all z-40"
        >
          <Plus size={36} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export default Dashboard;