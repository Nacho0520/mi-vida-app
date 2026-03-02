import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Flame, TrendingUp, Zap, Sun } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext";

// ── Utilidades de fecha — fuera del componente ────────────────────────────────
function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_KEYS = [
  "insights_day_sun",
  "insights_day_mon",
  "insights_day_tue",
  "insights_day_wed",
  "insights_day_thu",
  "insights_day_fri",
  "insights_day_sat",
];
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ── Cabecera reutilizable — ADN del sistema ───────────────────────────────────
function Header({ isPro, t }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-white" />
        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
          {t("insights_title")}
        </h2>
      </div>

      {/* Badge solo si FREE — PRO no ve ningún badge */}
      {!isPro && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-violet-500/10 border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest">
          <Zap size={10} fill="currentColor" /> PRO
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SmartInsights({ user, isPro, onUpgrade }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rawLogs, setRawLogs] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    async function fetchData() {
      setLoading(true);
      const start = new Date();
      start.setDate(start.getDate() - 29);
      const { data, error } = await supabase
        .from("daily_logs")
        .select("created_at, status, habit_id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false });
      if (error)
        console.error("[SmartInsights] Error cargando logs:", error.message);
      setRawLogs(data || []);
      setLoading(false);
    }
    fetchData();
  }, [user?.id]);

  const insights = useMemo(() => {
    if (!rawLogs.length) {
      return {
        streak: 0,
        bestDayIdx: 0,
        bestDayName: "—",
        bestDayKey: DAY_KEYS[0],
        bestDayCount: 0,
        byDayOfWeek: Array(7).fill(0),
        totalLast30: 0,
        avgPerDay: 0,
      };
    }

    const today = new Date();
    const todayStr = formatDate(today);
    const activeDays = new Set(rawLogs.map((l) => formatDate(l.created_at)));

    let streak = 0;
    let checkDate = new Date(today);
    if (!activeDays.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1);
    while (activeDays.has(formatDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const byDayOfWeek = Array(7).fill(0);
    rawLogs.forEach((l) => {
      byDayOfWeek[new Date(l.created_at).getDay()]++;
    });
    const maxCount = Math.max(...byDayOfWeek);
    const bestDayIdx = byDayOfWeek.indexOf(maxCount);

    const totalLast30 = rawLogs.length;
    const avgPerDay = Math.round((totalLast30 / 30) * 10) / 10;

    return {
      streak,
      bestDayIdx,
      bestDayName: DAY_NAMES[bestDayIdx],
      bestDayKey: DAY_KEYS[bestDayIdx],
      bestDayCount: maxCount,
      byDayOfWeek,
      totalLast30,
      avgPerDay,
    };
  }, [rawLogs]);

  // ── Guard: cargando ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl relative overflow-hidden flex justify-center py-8">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
      </div>
    );
  }

  // ── Guard: vacío ──────────────────────────────────────────────────────────
  if (!rawLogs.length) {
    return (
      <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl relative overflow-hidden text-left">
        <Header isPro={isPro} t={t} />
        <div className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-neutral-600" />
          </div>
          <p className="text-[11px] text-neutral-500 font-medium">
            {t("insights_empty")}
          </p>
        </div>
      </div>
    );
  }

  const {
    streak,
    bestDayName,
    bestDayKey,
    bestDayCount,
    byDayOfWeek,
    totalLast30,
    avgPerDay,
  } = insights;

  return (
    <div className="bg-neutral-800/20 rounded-[2.5rem] border border-white/5 p-6 shadow-xl relative overflow-hidden text-left">
      <Header isPro={isPro} t={t} />

      <div className="space-y-2">
        {/* ── INSIGHT 1 — Racha actual (FREE + PRO) ──────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 rounded-[1.5rem] p-4 border ${
            streak > 0
              ? "bg-orange-500/5 border-orange-500/15"
              : "bg-neutral-900/60 border-white/5"
          }`}
        >
          <div
            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
              streak > 0
                ? "bg-orange-500/15 border-orange-500/20"
                : "bg-white/5 border-white/5"
            }`}
          >
            <Flame
              size={16}
              className={streak > 0 ? "text-orange-400" : "text-neutral-600"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
              {t("insights_streak_label")}
            </p>
            <p
              className={`text-sm font-black ${streak > 0 ? "text-white" : "text-neutral-600"}`}
            >
              {streak > 0
                ? `${streak} ${t("insights_streak_days")}`
                : t("insights_streak_zero")}
            </p>
          </div>
          <span
            className={`text-lg font-black tabular-nums shrink-0 ${
              streak >= 7
                ? "text-orange-400"
                : streak > 0
                  ? "text-neutral-300"
                  : "text-neutral-700"
            }`}
          >
            {streak}
          </span>
        </motion.div>

        {/* ── INSIGHT 2 — Media diaria (FREE + PRO) ──────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
          className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4"
        >
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
            <TrendingUp size={16} className="text-neutral-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
              {t("insights_avg_label")}
            </p>
            <p className="text-sm font-black text-white">
              {avgPerDay} {t("insights_avg_unit")}
            </p>
          </div>
          <span className="text-lg font-black text-neutral-300 tabular-nums shrink-0">
            {totalLast30}
          </span>
        </motion.div>

        {/* ── INSIGHTS PRO — gate blur-md + botón central ────────── */}
        {isPro ? (
          <>
            {/* INSIGHT 3 — Día más productivo */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
              className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/15 rounded-[1.5rem] p-4"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Sun size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                  {t("insights_best_day_label")}
                </p>
                <p className="text-sm font-black text-white">
                  {t(bestDayKey) || bestDayName}
                </p>
              </div>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0 tabular-nums">
                {bestDayCount} {t("insights_day_hits")}
              </span>
            </motion.div>

            {/* INSIGHT 4 — Mini-chart por día de semana */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
              className="bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                {t("insights_week_chart_label")}
              </p>
              <div className="flex items-end justify-between gap-1.5 h-14">
                {byDayOfWeek.map((count, i) => {
                  const maxVal = Math.max(...byDayOfWeek, 1);
                  const height =
                    count === 0
                      ? 8
                      : Math.max(12, Math.round((count / maxVal) * 100));
                  const isBest = i === insights.bestDayIdx;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center flex-1 gap-1"
                    >
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 180,
                          delay: i * 0.04,
                        }}
                        className={`w-full rounded-lg min-h-[4px] ${
                          isBest
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                            : count > 0
                              ? "bg-neutral-500"
                              : "bg-neutral-800"
                        }`}
                      />
                      <p
                        className={`text-[9px] font-black uppercase ${
                          isBest ? "text-emerald-400" : "text-neutral-600"
                        }`}
                      >
                        {DAY_NAMES[i][0]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        ) : (
          /* ── Gate Pro — blur-md + botón central ─────────────────── */
          <div className="relative mt-2">
            <div className="space-y-2 blur-md pointer-events-none select-none">
              <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/15 rounded-[1.5rem] p-4">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Sun size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="h-2 w-20 bg-neutral-700 rounded-full mb-1.5" />
                  <div className="h-3 w-14 bg-neutral-600 rounded-full" />
                </div>
                <div className="h-5 w-14 bg-neutral-700 rounded-full shrink-0" />
              </div>
              <div className="bg-neutral-900/60 border border-white/5 rounded-[1.5rem] p-4">
                <div className="h-2 w-24 bg-neutral-700 rounded-full mb-3" />
                <div className="flex items-end justify-between gap-1.5 h-14">
                  {[40, 70, 45, 90, 65, 30, 55].map((h, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center flex-1 gap-1"
                    >
                      <div
                        className="w-full bg-neutral-700 rounded-lg"
                        style={{ height: `${h}%` }}
                      />
                      <div className="h-2 w-2 bg-neutral-800 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => onUpgrade?.()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-500 text-white text-xs font-black shadow-lg shadow-violet-500/30 active:scale-95 transition-all"
              >
                <Zap size={12} /> {t("upgrade_to_pro")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
