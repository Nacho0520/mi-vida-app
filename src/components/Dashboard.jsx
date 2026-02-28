import { useState, useEffect } from "react";
import {
  Check,
  X,
  Circle,
  Menu,
  Plus,
  Trash2,
  Settings,
  Star,
  Frown,
  Zap,
} from "lucide-react";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";
import ProfileModal from "./ProfileModal";
import HabitCreator from "./HabitCreator";
import ProModal from "./ProModal";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext";

const TEST_ACCOUNT = "test@test.com";

function CircularProgress({ percentage, completed, total }) {
  const { t } = useLanguage();
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage === 100;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative flex h-48 w-48 items-center justify-center transition-all duration-500 ${isComplete ? "drop-shadow-[0_0_24px_rgba(16,185,129,0.4)]" : ""}`}
      >
        <svg
          className="h-full w-full -rotate-90 transform"
          viewBox="0 0 160 160"
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-neutral-800"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-700 ${isComplete ? "text-emerald-400" : "text-emerald-500"}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isComplete ? (
            <>
              <span className="text-3xl mb-1">🎯</span>
              <p className="text-[10px] uppercase font-black text-emerald-400 tracking-[0.15em] px-2 text-center leading-tight">
                {t("all_done")}
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-white tracking-tighter">
                {Math.round(percentage)}%
              </p>
              <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest mt-1">
                {t("today_caps")}
              </p>
            </>
          )}
        </div>
      </div>
      {/* Contador X/Y debajo del círculo */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-white">{completed}</span>
        <span className="text-neutral-600 text-sm font-bold">/</span>
        <span className="text-sm font-bold text-neutral-500">{total}</span>
        <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold ml-1">
          {t("habits")}
        </span>
      </div>
    </div>
  );
}

function Dashboard({
  user,
  habits,
  todayLogs,
  onStartReview,
  version,
  onOpenAdmin,
  onOpenUpdates,
  hasUpdates,
  isTestAccount,
  onResetTutorial,
  onResetUpdates,
  onOpenHistory,
  isPro,
  onToggleTestPro,
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isCreatorOpen, setCreatorOpen] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isHardDayModalOpen, setHardDayModalOpen] = useState(false);
  const [isProModalOpen, setProModalOpen] = useState(false);
  const [expandedHabitId, setExpandedHabitId] = useState(null);
  const [hardDayEnabled, setHardDayEnabled] = useState(() => {
    try {
      return localStorage.getItem("dayclose_hard_day_enabled") === "true";
    } catch {
      return false;
    }
  });
  const [hardDayIds, setHardDayIds] = useState(() => {
    try {
      const raw = localStorage.getItem("dayclose_hard_day_ids");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const { t } = useLanguage();
  const MAX_HARD_DAY = 3;
  const MAX_FREE_HABITS = 5;

  const logsMap = new Map();
  (todayLogs || []).forEach((l) =>
    logsMap.set(l.habit_id, { status: l.status, logId: l.id }),
  );

  const completed = (habits || []).filter(
    (h) => logsMap.get(h.id)?.status === "completed",
  ).length;
  const percentage = habits?.length > 0 ? (completed / habits.length) * 100 : 0;

  const canCreateHabit = isPro || (habits || []).length < MAX_FREE_HABITS;
  const atFreeLimit = !isPro && (habits || []).length >= MAX_FREE_HABITS;
  const nearFreeLimit = !isPro && (habits || []).length === MAX_FREE_HABITS - 1;

  useEffect(() => {
    try {
      localStorage.setItem("dayclose_hard_day_enabled", String(hardDayEnabled));
    } catch {}
  }, [hardDayEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem("dayclose_hard_day_ids", JSON.stringify(hardDayIds));
    } catch {}
  }, [hardDayIds]);

  useEffect(() => {
    const validIds = new Set((habits || []).map((h) => h.id));
    const filtered = (hardDayIds || []).filter((id) => validIds.has(id));
    if (filtered.length !== hardDayIds.length) {
      queueMicrotask(() => setHardDayIds(filtered));
    }
  }, [habits, hardDayIds]);

  const toggleHardDayHabit = (habitId) => {
    setHardDayIds((prev) => {
      if (prev.includes(habitId)) return prev.filter((id) => id !== habitId);
      if (prev.length >= MAX_HARD_DAY) return prev;
      return [...prev, habitId];
    });
  };

  const handleAddHabit = () => {
    if (canCreateHabit) {
      setCreatorOpen(true);
    } else {
      setProModalOpen(true);
    }
  };

  const shouldFilterHabits = hardDayEnabled && hardDayIds.length > 0;
  const visibleHabits = shouldFilterHabits
    ? (habits || []).filter((h) => hardDayIds.includes(h.id))
    : habits || [];

  const isTest = user?.email === TEST_ACCOUNT;

  return (
    <div className="app-screen bg-neutral-900 px-4 relative">
      {!isSidebarOpen &&
        !isCreatorOpen &&
        !editHabit &&
        !isSettingsOpen &&
        !isProfileOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-6 left-4 text-white p-2 hover:bg-neutral-800 rounded-full transition-colors z-[100]"
          >
            <Menu size={28} />
          </button>
        )}

      {/* Toggle Free/Pro — solo cuenta test */}
      {isTest && onToggleTestPro && (
        <button
          onClick={onToggleTestPro}
          className={`absolute top-6 right-4 z-[100] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${
            isPro
              ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
              : "bg-neutral-800 border-white/10 text-neutral-400"
          }`}
        >
          <Zap size={11} />
          {isPro ? "PRO" : "FREE"}
        </button>
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={() =>
          supabase.auth.signOut().then(() => window.location.reload())
        }
        onOpenSettings={() => setSettingsOpen(true)}
        version={version}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenAdmin={onOpenAdmin}
        onOpenUpdates={onOpenUpdates}
        onOpenHistory={onOpenHistory}
        hasUpdates={hasUpdates}
        isTestAccount={isTestAccount}
        onResetTutorial={onResetTutorial}
        onResetUpdates={onResetUpdates}
        isPro={isPro}
        onUpgradePro={() => setProModalOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        appVersion={version}
        isPro={isPro}
        onUpgrade={() => {
          setSettingsOpen(false);
          setProModalOpen(true);
        }}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        isPro={isPro}
      />
      <HabitCreator
        isOpen={isCreatorOpen || !!editHabit}
        onClose={() => {
          setCreatorOpen(false);
          setEditHabit(null);
        }}
        userId={user?.id}
        habitToEdit={editHabit}
        onHabitCreated={() => window.location.reload()}
        isPro={isPro}
      />
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setProModalOpen(false)}
        user={user}
        onProActivated={() => window.location.reload()}
      />

      <div className="mx-auto w-full max-w-md mt-6">
        <header className="mb-10 text-center">
          <h2 className="text-lg font-light text-neutral-500 italic">
            {t("hello")}
          </h2>
          <h1 className="text-3xl font-black text-white tracking-tight capitalize leading-none">
            {user?.user_metadata?.full_name || "Usuario"}
          </h1>
        </header>

        {/* Banner suave — casi lleno */}
        {nearFreeLimit && (
          <button
            onClick={() => setProModalOpen(true)}
            className="mb-4 w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/15 active:scale-98 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-[11px] text-amber-300/80">
                {t("pro_soft_banner")}
              </p>
            </div>
            <span className="text-[10px] font-black text-amber-400/70 group-hover:text-amber-300 transition-colors whitespace-nowrap ml-2">
              {t("pro_soft_cta")}
            </span>
          </button>
        )}
        {/* Banner límite Free */}
        {atFreeLimit && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <Zap size={16} className="text-violet-400 flex-shrink-0" />
            <p className="text-[12px] text-violet-300 flex-1">
              {t("pro_habit_limit_banner")}{" "}
              <button
                onClick={() => setProModalOpen(true)}
                className="underline font-bold"
              >
                {t("pro_habit_limit_cta")}
              </button>{" "}
              {t("pro_habit_limit_suffix")}
            </p>
          </div>
        )}

        {hardDayEnabled && (
          <div className="mb-6 flex items-center justify-between text-[11px] text-neutral-500">
            <span>{t("hard_day_help")}</span>
            <span className="font-semibold text-neutral-400">
              {t("hard_day_selected")} {hardDayIds.length}/{MAX_HARD_DAY}
            </span>
          </div>
        )}
        {hardDayEnabled && hardDayIds.length === 0 && (
          <p className="mb-6 text-[11px] text-neutral-600">
            {t("hard_day_empty")}
          </p>
        )}

        <div className="mb-10 flex justify-center">
          <CircularProgress
            percentage={percentage}
            completed={completed}
            total={(habits || []).length}
          />
        </div>

        {visibleHabits.length === 0 ? (
          <div className="radius-card border border-white/5 bg-neutral-800/30 p-6 text-center text-neutral-400 shadow-apple-soft">
            <p className="text-body font-medium">{t("no_habits_today")}</p>
          </div>
        ) : (
          <div className="premium-divider">
            {visibleHabits.map((habit) => {
              const log = logsMap.get(habit.id);
              const isCritical = hardDayIds.includes(habit.id);
              const miniHabits = (habit.mini_habits || []).filter(Boolean);
              const isExpanded = expandedHabitId === habit.id;
              return (
                <div
                  key={habit.id}
                  className="group radius-card border border-white/5 bg-neutral-800/30 p-4 backdrop-blur-md transition-all shadow-apple-soft cursor-pointer"
                  onClick={() =>
                    setExpandedHabitId(isExpanded ? null : habit.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${habit.color} shadow-inner flex-shrink-0`}
                    >
                      <span className="text-2xl">{habit.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate text-base tracking-tight">
                        {habit.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity pr-2">
                      {hardDayEnabled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHardDayHabit(habit.id);
                          }}
                          className={`p-2 rounded-lg transition-colors ${isCritical ? "text-neutral-200" : "text-neutral-600 hover:text-neutral-300"}`}
                        >
                          <Star
                            size={18}
                            fill={isCritical ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditHabit(habit);
                        }}
                        className="p-2 text-neutral-400 hover:text-blue-400 rounded-lg"
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(t("confirm_delete"))) {
                            await supabase
                              .from("daily_logs")
                              .delete()
                              .eq("habit_id", habit.id);
                            await supabase
                              .from("habits")
                              .delete()
                              .eq("id", habit.id);
                            window.location.reload();
                          }
                        }}
                        className="p-2 text-neutral-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex-shrink-0 ml-1">
                      {log ? (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await supabase
                              .from("daily_logs")
                              .delete()
                              .eq("id", log.logId);
                            window.location.reload();
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-75 bg-white/10 shadow-lg"
                        >
                          {log.status === "completed" ? (
                            <Check className="h-6 w-6 text-emerald-500" />
                          ) : (
                            <X className="h-6 w-6 text-red-500" />
                          )}
                        </button>
                      ) : (
                        <Circle className="h-6 w-6 text-neutral-700" />
                      )}
                    </div>
                  </div>
                  {isExpanded && miniHabits.length > 0 && (
                    <div className="mt-3 pl-16">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-2">
                        {t("mini_habits_title")}
                      </p>
                      <div className="premium-divider">
                        {miniHabits.map((mini, index) => (
                          <div
                            key={`${mini.title || mini}-${index}`}
                            className="radius-card border border-white/5 bg-neutral-900/50 px-3 py-2 text-[11px] text-neutral-300 flex items-center gap-2 shadow-apple-soft"
                            style={{
                              marginLeft: `${Math.min(index, 4) * 10}px`,
                            }}
                          >
                            <div
                              className={`h-7 w-7 rounded-lg flex items-center justify-center ${mini.color || "bg-neutral-800"}`}
                            >
                              <span className="text-sm">
                                {mini.icon || "•"}
                              </span>
                            </div>
                            <span className="font-semibold tracking-tight">
                              {mini.title || mini}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(habits || []).some((h) => !logsMap.has(h.id)) && (
          <button
            onClick={onStartReview}
            className="mt-8 w-full rounded-[2rem] bg-white px-6 py-5 text-lg font-black text-black shadow-2xl active:scale-95 transition-all"
          >
            {t("start_review")}
          </button>
        )}
      </div>

      {/* Botón + con gate Pro */}
      <button
        onClick={handleAddHabit}
        className={`fixed bottom-32 right-6 h-16 w-16 rounded-[1.5rem] shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${
          atFreeLimit
            ? "bg-violet-500 text-white shadow-violet-500/30"
            : "bg-white text-black"
        }`}
      >
        {atFreeLimit ? <Zap size={28} /> : <Plus size={36} strokeWidth={3} />}
      </button>

      <button
        onClick={() => setHardDayModalOpen(true)}
        className={`fixed bottom-52 right-6 h-12 w-12 rounded-[1rem] flex items-center justify-center transition-all z-40 ${
          hardDayEnabled
            ? "bg-white text-black shadow-2xl scale-110"
            : "bg-neutral-800/70 text-neutral-300 border border-white/5 shadow-apple-soft"
        }`}
      >
        <Frown size={20} />
      </button>

      {isHardDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-800/80 radius-card p-6 shadow-apple border border-white/5 relative backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center">
                <Frown size={18} className="text-neutral-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {t("hard_day_title")}
                </h3>
                <p className="text-xs text-neutral-500">
                  {t("hard_day_confirm")}
                </p>
              </div>
            </div>
            <div className="premium-divider max-h-56 overflow-y-auto">
              {(habits || []).map((habit) => {
                const selected = hardDayIds.includes(habit.id);
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHardDayHabit(habit.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors ${
                      selected
                        ? "border-white/20 bg-white/10"
                        : "border-white/5 bg-neutral-900/40"
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center ${habit.color}`}
                    >
                      <span className="text-lg">{habit.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-white font-medium">
                        {habit.title}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        {selected
                          ? t("hard_day_selected_label")
                          : t("hard_day_select_label")}
                      </p>
                    </div>
                    <Star
                      size={16}
                      className={selected ? "text-white" : "text-neutral-600"}
                      fill={selected ? "currentColor" : "none"}
                    />
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setHardDayEnabled(false);
                  setHardDayIds([]);
                  setHardDayModalOpen(false);
                }}
                className="flex-1 rounded-xl bg-neutral-900/60 border border-white/5 text-neutral-300 py-3 text-sm font-bold"
              >
                {t("hard_day_cancel")}
              </button>
              <button
                onClick={() => {
                  setHardDayEnabled(true);
                  setHardDayModalOpen(false);
                }}
                className="flex-1 rounded-xl bg-white text-black py-3 text-sm font-bold"
              >
                {t("hard_day_confirm_btn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
