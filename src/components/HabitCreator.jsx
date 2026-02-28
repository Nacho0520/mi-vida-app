import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Calendar,
  Clock,
  Palette,
  Sparkles,
  Trash2,
  Save,
  Smile,
  ChevronDown,
  Settings,
  Lock,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext";
import ProModal from "./ProModal";

const COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-orange-600",
  "bg-pink-600",
  "bg-red-600",
  "bg-cyan-600",
];

const ICONS = [
  "📚", "💧", "🏃", "🧘", "💊", "💤", "📝", "🧹", "🥦", "💰",
  "🎸", "📵", "🏋️", "🚴", "🏊", "🚶", "🍎", "🥗", "🥤", "🦷",
  "💻", "✍️", "🧠", "🎯", "⏰", "📧", "💼", "🎓", "🧺", "🍳",
  "🪴", "🛁", "🛌", "🚿", "🧼", "🎨", "🎮", "🎬", "📷", "🎧",
  "♟️", "🧶", "👫", "🐕", "🐈", "☕", "🍺", "🍦", "✈️", "🛒",
  "👔", "🛠️", "🚗", "📈", "💎", "💡", "☀️", "🌑", "🌊", "⛰️",
  "🌳", "🕯️", "✨", "🔓", "🚭", "💪", "🤳", "🧽",
];

const DAYS = [
  { id: "L", label: "L" },
  { id: "M", label: "M" },
  { id: "X", label: "X" },
  { id: "J", label: "J" },
  { id: "V", label: "V" },
  { id: "S", label: "S" },
  { id: "D", label: "D" },
];

const ALL_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

// Límites para versión gratuita
const FREE_COLORS_LIMIT = 4;
const FREE_ICONS_LIMIT = 20;
const FREE_MINI_HABITS_LIMIT = 2; // Límite por hábito

const MotionDiv = motion.div;

const normalizeMiniHabits = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (!item) return null;
        if (typeof item === "object") {
          return {
            title: item.title || item.name || "",
            icon: item.icon || ICONS[index % ICONS.length],
            color: item.color || COLORS[index % COLORS.length],
          };
        }
        return null;
      })
      .filter(Boolean);
  }
  return [];
};

const normalizeFreq = (f) => {
  if (!f) return ALL_DAYS;
  if (Array.isArray(f)) return f.length === 0 ? ALL_DAYS : f;
  if (typeof f === "string") {
    const arr = f.replace(/[{}]/g, "").split(",").map(v => v.trim()).filter(Boolean);
    return arr.length === 0 ? ALL_DAYS : arr;
  }
  return ALL_DAYS;
};

export default function HabitCreator({
  isOpen,
  onClose,
  userId,
  onHabitCreated,
  habitToEdit = null,
}) {
  const [title, setTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState(["L", "M", "X", "J", "V"]);
  const [timeOfDay, setTimeOfDay] = useState("night");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [miniHabits, setMiniHabits] = useState([]);
  const [miniHabitInput, setMiniHabitInput] = useState("");
  const [miniHabitIcon, setMiniHabitIcon] = useState(ICONS[0]);
  const [miniHabitColor, setMiniHabitColor] = useState(COLORS[0]);
  const [editingMiniIndex, setEditingMiniIndex] = useState(null);
  const [showMiniHabits, setShowMiniHabits] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [userPlan, setUserPlan] = useState("free");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const { t } = useLanguage();

  const ADMIN_EMAIL = "hemmings.nacho@gmail.com";
  const TEST_EMAIL = "test@test.com";
  const freshSimulateFree = typeof localStorage !== "undefined" && localStorage.getItem("dayclose_simulate_free") === "true";
  
  const effectiveIsPrivileged = 
    userPlan === "pro" || 
    currentUserEmail === ADMIN_EMAIL || 
    (currentUserEmail === TEST_EMAIL && !freshSimulateFree);

  useEffect(() => {
    if (!userId) return;
    const loadUserData = async () => {
      const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
      const { data: { user } } = await supabase.auth.getUser();
      setUserPlan(profile?.plan === "pro" ? "pro" : "free");
      setCurrentUserEmail(user?.email || "");
    };
    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setTitle(habitToEdit.title);
        setSelectedDays(habitToEdit.frequency || []);
        setTimeOfDay(habitToEdit.time_of_day || "night");
        setSelectedColor(habitToEdit.color || COLORS[0]);
        setSelectedIcon(habitToEdit.icon || ICONS[0]);
        setMiniHabits(normalizeMiniHabits(habitToEdit.mini_habits));
        setShowMiniHabits(normalizeMiniHabits(habitToEdit.mini_habits).length > 0);
      } else {
        setTitle("");
        setSelectedDays(["L", "M", "X", "J", "V"]);
        setTimeOfDay("night");
        setSelectedColor(COLORS[0]);
        setSelectedIcon(ICONS[0]);
        setMiniHabits([]);
        setShowMiniHabits(false);
      }
      setMiniHabitInput("");
      setEditingMiniIndex(null);
    }
  }, [isOpen, habitToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      if (!effectiveIsPrivileged && !habitToEdit) {
        const { data: existingHabits } = await supabase
          .from("habits")
          .select("id, frequency")
          .eq("user_id", userId)
          .eq("is_active", true);

        const newFreq = selectedDays.length === 0 ? ALL_DAYS : selectedDays;
        const maxPerDay = ALL_DAYS.reduce((max, day) => {
          const existingCount = (existingHabits || []).filter(h =>
            normalizeFreq(h.frequency).includes(day)
          ).length;
          const countWithNew = newFreq.includes(day) ? existingCount + 1 : existingCount;
          return Math.max(max, countWithNew);
        }, 0);

        if (maxPerDay > 5) {
          setLoading(false);
          setShowProModal(true);
          return;
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
        mini_habits: miniHabits.map((h) => ({
            title: h.title.trim(),
            icon: h.icon,
            color: h.color,
          })),
      };

      if (habitToEdit) {
        await supabase.from("habits").update(habitData).eq("id", habitToEdit.id);
      } else {
        await supabase.from("habits").insert(habitData);
      }
      onHabitCreated();
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMiniHabit = () => {
    // Si no es Pro y está intentando añadir (no editar) y ya llegó al límite de 2
    if (!effectiveIsPrivileged && editingMiniIndex === null && miniHabits.length >= FREE_MINI_HABITS_LIMIT) {
      setShowProModal(true);
      return;
    }

    const value = miniHabitInput.trim();
    if (!value) return;

    if (editingMiniIndex !== null) {
      setMiniHabits((prev) =>
        prev.map((item, index) =>
          index === editingMiniIndex
            ? { title: value, icon: miniHabitIcon, color: miniHabitColor }
            : item,
        ),
      );
    } else {
      setMiniHabits((prev) => [...prev, { title: value, icon: miniHabitIcon, color: miniHabitColor }].slice(0, 15));
    }
    setMiniHabitInput("");
    setEditingMiniIndex(null);
  };

  const handleSelectIcon = (icon, index) => {
    if (!effectiveIsPrivileged && index >= FREE_ICONS_LIMIT) {
      setShowProModal(true);
      return;
    }
    setSelectedIcon(icon);
  };

  const handleSelectColor = (color, index) => {
    if (!effectiveIsPrivileged && index >= FREE_COLORS_LIMIT) {
      setShowProModal(true);
      return;
    }
    setSelectedColor(color);
  };

  const handleDelete = async () => {
    if (!confirm(t("confirm_delete"))) return;
    setLoading(true);
    try {
      await supabase.from("daily_logs").delete().eq("habit_id", habitToEdit.id);
      await supabase.from("habits").delete().eq("id", habitToEdit.id);
      onHabitCreated();
      onClose();
    } catch (err) {
      alert(t("error_delete") + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto z-0"
          onClick={onClose}
        />
        <MotionDiv
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 bg-neutral-800 w-full max-w-md rounded-t-3xl sm:rounded-[2.5rem] p-6 border-t border-white/5 shadow-apple pointer-events-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {habitToEdit ? <Palette className="text-blue-400" size={20} /> : <Sparkles className="text-yellow-400" size={20} />}
              <span>{habitToEdit ? t("edit_habit") : t("new_habit")}</span>
            </h2>
            <div className="flex gap-2">
              {habitToEdit && (
                <button onClick={handleDelete} className="p-2 bg-red-900/30 rounded-full text-red-400 hover:bg-red-900/50 transition-colors">
                  <Trash2 size={20} />
                </button>
              )}
              <button onClick={onClose} className="p-2 bg-neutral-700 rounded-full text-neutral-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título e Icono principal */}
            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest">{t("habit_name_label")}</label>
              <div className="flex gap-3">
                <div className={`h-14 w-14 flex items-center justify-center rounded-2xl text-3xl shadow-inner border border-white/5 ${selectedColor}`}>
                  {selectedIcon}
                </div>
                <input
                  type="text"
                  placeholder={t("habit_placeholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-800/60 rounded-2xl px-4 text-white text-lg placeholder-neutral-600 focus:border-neutral-500/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Mini Hábitos (Límite 2 para Free) */}
            <div className="bg-neutral-900/40 rounded-3xl p-1 border border-white/5">
              <button
                type="button"
                onClick={() => setShowMiniHabits(!showMiniHabits)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                      {t("mini_habits_title")}
                      {!effectiveIsPrivileged && miniHabits.length >= FREE_MINI_HABITS_LIMIT && <Lock size={10} className="text-neutral-500" />}
                    </p>
                    <p className="text-[10px] font-bold text-neutral-500">
                      {!effectiveIsPrivileged ? `Gratis: máx 2 por hábito` : t("mini_habits_hint")}
                    </p>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-neutral-500 transition-transform ${showMiniHabits ? "rotate-180" : ""}`} />
              </button>

              {showMiniHabits && (
                <div className="p-4 pt-0 space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={miniHabitInput}
                      onChange={(e) => setMiniHabitInput(e.target.value)}
                      placeholder={t("mini_habits_placeholder")}
                      className="flex-1 bg-neutral-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                    />
                    <button type="button" onClick={handleAddMiniHabit} className="px-4 py-2 bg-white text-black text-xs font-black rounded-xl">
                      {editingMiniIndex !== null ? t("mini_habits_update") : t("mini_habits_add")}
                    </button>
                  </div>
                  
                  {miniHabits.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-neutral-800/50 p-2 rounded-xl border border-white/5">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                      <span className="flex-1 text-xs font-bold text-neutral-300">{item.title}</span>
                      <button type="button" onClick={() => {
                        setMiniHabitInput(item.title);
                        setMiniHabitIcon(item.icon);
                        setMiniHabitColor(item.color);
                        setEditingMiniIndex(index);
                      }} className="text-neutral-500 p-1"><Settings size={14}/></button>
                      <button type="button" onClick={() => setMiniHabits(prev => prev.filter((_, i) => i !== index))} className="text-neutral-500 p-1"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Iconos */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-neutral-500 uppercase tracking-widest">
                <Smile size={14} /> {t("icon_label")}
              </label>
              <div className="grid grid-cols-6 gap-2 bg-neutral-900/60 p-3 rounded-[2rem] border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                {ICONS.map((icon, index) => {
                  const isLocked = !effectiveIsPrivileged && index >= FREE_ICONS_LIMIT;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectIcon(icon, index)}
                      className={`relative flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition-all ${
                        selectedIcon === icon ? "bg-white/10 ring-2 ring-white" : "hover:bg-white/5"
                      } ${isLocked ? "opacity-30" : ""}`}
                    >
                      {icon}
                      {isLocked && <Lock size={10} className="absolute bottom-1 right-1 text-white/50" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frecuencia */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-neutral-500 uppercase tracking-widest">
                <Calendar size={14} /> {t("frequency")}
              </label>
              <div className="flex justify-between bg-neutral-900/60 p-2 rounded-2xl border border-white/5">
                {DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        if (selectedDays.includes(day.id)) {
                          if (selectedDays.length > 1) setSelectedDays(prev => prev.filter(d => d !== day.id));
                        } else {
                          setSelectedDays(prev => [...prev, day.id]);
                        }
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                        isSelected ? "bg-white text-black shadow-lg" : "text-neutral-500"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colores */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-neutral-500 uppercase tracking-widest">
                <Palette size={14} /> {t("color")}
              </label>
              <div className="flex gap-3 justify-center bg-neutral-900/60 p-4 rounded-2xl border border-white/5">
                {COLORS.map((color, index) => {
                  const isLocked = !effectiveIsPrivileged && index >= FREE_COLORS_LIMIT;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectColor(color, index)}
                      className={`relative w-9 h-9 rounded-full ${color} transition-all ${
                        selectedColor === color ? "ring-2 ring-white scale-110" : isLocked ? "opacity-30" : "opacity-60"
                      }`}
                    >
                      {isLocked && <Lock size={10} className="absolute inset-0 m-auto text-white/50" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={loading || !title}
              className="w-full bg-white text-black font-black py-5 rounded-[1.5rem] text-lg hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-2xl"
            >
              {loading ? t("saving") : habitToEdit ? <><Save size={20} /> {t("save_changes_btn")}</> : <><Check size={20} /> {t("create_habit_btn")}</>}
            </button>
          </form>
        </MotionDiv>
      </div>
      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
    </AnimatePresence>
  );
}