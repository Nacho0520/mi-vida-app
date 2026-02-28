import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Flame, Trophy, TrendingUp, Calendar,
  Loader2, Lock, Zap, Award, BarChart2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";

export default function Stats({ user, isPro, onUpgrade }) {
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyHabitBreakdown, setWeeklyHabitBreakdown] = useState([]);
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [heatmapData, setHeatmapData] = useState([]);
  const [protectorUses, setProtectorUses] = useState(() => {
    try {
      const raw = localStorage.getItem("dayclose_streak_protector_uses");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [isProtectorActive, setProtectorActive] = useState(false);
  const [isPerfectWeek, setIsPerfectWeek] = useState(false);
  const { t } = useLanguage();
  const MAX_PROTECTORS_PER_MONTH = 2;

  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const getMonthKey = (date) => formatDate(date).slice(0, 7);
  const getUsesThisMonth = (date) => {
    const monthKey = getMonthKey(date);
    return protectorUses.filter(
      (d) => typeof d === "string" && d.startsWith(monthKey)
    ).length;
  };

  useEffect(() => {
    async function calculateStats() {
      if (!user) return;

      // Logs completados (para streak, totales y semana)
      const { data: logs, error } = await supabase
        .from("daily_logs")
        .select("created_at, status, habit_id, habits(title)")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error || !logs) { setLoading(false); return; }

      // Todos los logs de los últimos 28 días (para calcular % real en heatmap)
      const today = new Date();
      const startHeatmap = new Date(today);
      startHeatmap.setDate(today.getDate() - 27);
      const { data: allLogs } = await supabase
        .from("daily_logs")
        .select("created_at, status")
        .eq("user_id", user.id)
        .gte("created_at", startHeatmap.toISOString());

      // Mapa de totales/completados por día para heatmap
      const allLogsMap = {};
      if (allLogs) {
        allLogs.forEach((log) => {
          const dateKey = formatDate(log.created_at);
          if (!allLogsMap[dateKey]) allLogsMap[dateKey] = { completed: 0, total: 0 };
          allLogsMap[dateKey].total++;
          if (log.status === "completed") allLogsMap[dateKey].completed++;
        });
      }

      const activeDays = new Set(logs.map((log) => formatDate(log.created_at)));
      const protectedDays = new Set();
      protectorUses.forEach((dateStr) => protectedDays.add(dateStr));

      const todayStr = formatDate(today);
      const usesThisMonth = getUsesThisMonth(today);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = formatDate(yesterday);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);
      const twoDaysAgoStr = formatDate(twoDaysAgo);

      const eligible =
        !activeDays.has(yesterdayStr) &&
        activeDays.has(twoDaysAgoStr) &&
        usesThisMonth < MAX_PROTECTORS_PER_MONTH;
      if (eligible) {
        const nextUses = Array.from(new Set([...protectorUses, yesterdayStr]));
        protectedDays.add(yesterdayStr);
        try {
          localStorage.setItem("dayclose_streak_protector_uses", JSON.stringify(nextUses));
        } catch {}
        setProtectorUses(nextUses);
      }

      const isActive = (dateStr) =>
        activeDays.has(dateStr) || protectedDays.has(dateStr);

      // ── Racha actual ──────────────────────────────────────────
      let currentStreak = 0;
      let checkDate = new Date(today);
      if (!isActive(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (!isActive(formatDate(checkDate))) currentStreak = 0;
        else { currentStreak = 1; checkDate.setDate(checkDate.getDate() - 1); }
      } else {
        currentStreak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (currentStreak > 0) {
        if (isActive(formatDate(checkDate))) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }

      // ── Racha más larga histórica ─────────────────────────────
      const allDays = Array.from(new Set([...activeDays, ...protectedDays])).sort();
      let best = 0, run = 0;
      for (let i = 0; i < allDays.length; i++) {
        if (i === 0) { run = 1; }
        else {
          const diff = (new Date(allDays[i]) - new Date(allDays[i - 1])) / (1000 * 60 * 60 * 24);
          run = diff === 1 ? run + 1 : 1;
        }
        if (run > best) best = run;
      }
      setBestStreak(best);
      setStreak(currentStreak);
      setTotalCompleted(logs.length);
      setProtectorActive(protectedDays.has(yesterdayStr));

      // ── Semana actual ─────────────────────────────────────────
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const curr = new Date();
      const distanceToMonday = curr.getDay() === 0 ? 6 : curr.getDay() - 1;
      const monday = new Date(curr);
      monday.setDate(curr.getDate() - distanceToMonday);

      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(formatDate(d));
      }

      const currentWeekData = weekDates.map((dateStr) => {
        const d = new Date(dateStr);
        const dayLogs = logs.filter((l) => formatDate(l.created_at) === dateStr);
        return {
          day: days[d.getDay()],
          date: dateStr,
          count: dayLogs.length,
          isToday: dateStr === todayStr,
          isFuture: new Date(dateStr) > today,
        };
      });
      setWeeklyData(currentWeekData);

      const passedDays = currentWeekData.filter((d) => !d.isFuture);
      const daysWithActivity = passedDays.filter((d) => d.count > 0).length;
      const rate = passedDays.length > 0
        ? Math.round((daysWithActivity / passedDays.length) * 100) : 0;
      setWeeklyRate(rate);

      // ── Desglose por hábito esta semana (Pro) ────────────────
      const habitMap = {};
      logs
        .filter((l) => weekDates.includes(formatDate(l.created_at)))
        .forEach((l) => {
          const id = l.habit_id;
          const title = l.habits?.title || t("history_unknown");
          if (!habitMap[id]) habitMap[id] = { title, days: new Set() };
          habitMap[id].days.add(formatDate(l.created_at));
        });
      const breakdown = Object.values(habitMap)
        .map((h) => ({
          title: h.title,
          days: h.days.size,
          rate: Math.round((h.days.size / Math.max(passedDays.length, 1)) * 100),
        }))
        .sort((a, b) => b.rate - a.rate);
      setWeeklyHabitBreakdown(breakdown);

      // ── Perfect week ─────────────────────────────────────────
      setIsPerfectWeek(
        passedDays.length > 0 && passedDays.every((d) => d.count > 0)
      );

      // ── Heatmap 28 días (con porcentaje real) ─────────────────
      const heatmap = [];
      for (let i = 27; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = formatDate(d);
        const entry = allLogsMap[dateStr];
        const hasData = !!entry && entry.total > 0;
        const pct = hasData ? Math.round((entry.completed / entry.total) * 100) : null;
        heatmap.push({
          date: dateStr,
          hasData,
          pct,
          isToday: dateStr === todayStr,
        });
      }
      setHeatmapData(heatmap);
      setLoading(false);
    }
    calculateStats();
  }, [user, protectorUses, t]);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );

  // Color del heatmap por porcentaje
  const getHeatColor = (pct, hasData) => {
    if (!hasData) return "bg-neutral-800 border border-white/5";
    if (pct === 0)  return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]";
    if (pct < 60)   return "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]";
    if (pct < 100)  return "bg-emerald-800 shadow-[0_0_6px_rgba(6,78,59,0.6)]";
    return            "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]";
  };

  const getRateColor = (rate) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const maxCount = Math.max(...weeklyData.map((d) => d.count)) || 1;

  return (
    <div className="w-full max-w-md mx-auto px-6 pb-32 pt-6 animate-in fade-in duration-500">

      {/* ── Streak card ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-[2.5rem] p-8 text-center border border-white/5 shadow-2xl mb-6">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Flame size={120} /></div>
        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0.5 }} animate={{ scale: 1 }}
            className={`inline-flex items-center justify-center p-4 rounded-full mb-4 border ${
              isProtectorActive
                ? "bg-emerald-500/15 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                : streak > 0
                  ? "bg-orange-500/20 border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.2)]"
                  : "bg-neutral-800/60 border-white/5"
            }`}
          >
            {isProtectorActive
              ? <Lock size={32} className="text-emerald-400" />
              : <Flame size={32} className={streak > 0 ? "text-orange-500 fill-orange-500" : "text-neutral-600"} />
            }
          </motion.div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-1">{streak}</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-[0.3em]">{t("streak_label")}</p>
        </div>
      </div>

      {/* ── Stats grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-neutral-800/50 p-6 rounded-[2rem] border border-white/5">
          <Trophy className="text-yellow-500 mb-3" size={24} />
          <p className="text-2xl font-black text-white">{totalCompleted}</p>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{t("total_wins")}</p>
        </div>
        <div className="bg-neutral-800/50 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between col-span-1">
          <div>
            <Award className="text-orange-400 mb-3" size={24} />
            <p className="text-2xl font-black text-white">{bestStreak}</p>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{t("best_streak")}</p>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN FUSIONADA: Esta Semana ──────────────────────── */}
      <div className="bg-neutral-800/30 p-6 rounded-[2.5rem] border border-white/5 mb-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Calendar size={18} className="text-neutral-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            {t("this_week_title") || "Esta Semana"}
          </h3>
          {isPerfectWeek && (
            <span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
              🏆
            </span>
          )}
          {!isPro && (
            <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400">
              <Zap size={10} /> Pro
            </span>
          )}
        </div>

        {/* Contenido Gated para Pro (Constancia y Barras) */}
        {!isPro ? (
          <div className="relative">
            {/* Visual Falso y Borroso */}
            <div className="blur-sm pointer-events-none select-none">
                {/* % falso */}
                <div className="flex items-center justify-between mb-2">
                    <div className="h-2 w-32 bg-neutral-700 rounded-full" />
                    <div className="h-4 w-10 bg-neutral-700 rounded-full" />
                </div>
                <div className="w-full h-2 bg-neutral-700/50 rounded-full mb-6" />

                {/* Barras falsas */}
                <div className="flex items-end justify-between h-28 gap-2 mb-4">
                    {[40, 70, 45, 90, 65, 30, 50].map((h, i) => (
                        <div key={i} className="flex-1 bg-neutral-800 rounded-xl" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>

            {/* CTA Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <button
                onClick={onUpgrade}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-500 text-white text-xs font-black shadow-lg shadow-violet-500/30 active:scale-95 transition-all"
              >
                <Zap size={12} /> {t("weekly_summary_cta") || "Ver estadísticas Pro"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* % global real */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                {t("weekly_summary_rate") || "Constancia"}
              </p>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                weeklyRate >= 80 ? "bg-emerald-500/20 text-emerald-400"
                : weeklyRate >= 50 ? "bg-amber-500/20 text-amber-400"
                : "bg-red-500/20 text-red-400"
              }`}>
                {weeklyRate}%
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-700/50 rounded-full overflow-hidden mb-6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weeklyRate}%` }}
                className={`h-full rounded-full ${getRateColor(weeklyRate)}`}
              />
            </div>

            {/* Barras reales */}
            <div className="flex items-end justify-between h-28 gap-2 mb-4">
              {weeklyData.map((d, i) => {
                const height = d.count === 0 ? 5 : (d.count / maxCount) * 100;
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="w-full relative flex items-end justify-center h-full">
                      {d.count > 0 && (
                        <div className="absolute -top-6 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {d.count}
                        </div>
                      )}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        className={`w-full rounded-xl min-h-[6px] ${
                          d.isFuture ? "bg-neutral-800/50"
                          : d.isToday ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                          : d.count > 0 ? "bg-neutral-600" : "bg-neutral-800"
                        }`}
                      />
                    </div>
                    <p className={`mt-2 text-[10px] font-black uppercase ${
                      d.isToday ? "text-emerald-500" : "text-neutral-500"
                    }`}>
                      {d.day[0]}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Separador y Desglose Pro (Ya estaba gateado) */}
        <div className="h-px bg-white/5 my-5" />

        {isPro ? (
          <div className="space-y-3">
            {weeklyHabitBreakdown.map((h, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] text-neutral-300 font-bold truncate max-w-[70%]">{h.title}</p>
                    <span className="text-[10px] text-neutral-500 font-bold">{h.days}d</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-700/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${h.rate}%` }}
                      className={`h-full rounded-full ${getRateColor(h.rate)}`}
                    />
                  </div>
                </div>
              ))
            }
          </div>
        ) : (
            <div className="space-y-3 blur-sm pointer-events-none select-none opacity-50">
                {[1, 2].map(i => (
                    <div key={i} className="h-4 w-full bg-neutral-800 rounded-lg" />
                ))}
            </div>
        )}
      </div>

      {/* ── Heatmap 28 días — gate Pro ──────────────────────────── */}
      <div className="bg-neutral-800/30 p-6 rounded-[2.5rem] border border-white/5">
        <div className="flex items-center gap-3 mb-5">
          <Calendar size={18} className="text-neutral-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">{t("heatmap_title")}</h3>
          {!isPro && (
            <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400">
              <Zap size={10} /> Pro
            </span>
          )}
        </div>

        {isPro ? (
          <>
            {/* Leyenda */}
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] inline-block" />
                <span className="text-[9px] text-neutral-400">100%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-emerald-800 inline-block" />
                <span className="text-[9px] text-neutral-400">≥60%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-orange-500 inline-block" />
                <span className="text-[9px] text-neutral-400">≥40%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-red-500 inline-block" />
                <span className="text-[9px] text-neutral-400">0%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-neutral-800 border border-white/5 inline-block" />
                <span className="text-[9px] text-neutral-400">{t("history_no_review") || "Sin revisión"}</span>
              </div>
            </div>

            {/* Grid de celdas */}
            <div className="grid grid-cols-7 gap-1.5">
              {heatmapData.map((d, i) => (
                <div
                  key={i}
                  className={`h-8 w-full rounded-lg transition-all ${getHeatColor(d.pct, d.hasData)} ${d.isToday ? "ring-2 ring-white/40" : ""}`}
                  title={d.hasData ? `${d.date}: ${d.pct}%` : d.date}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-7 gap-1.5 blur-sm pointer-events-none select-none">
              {[0,2,0,1,3,0,2,1,0,3,2,0,1,0,0,1,2,0,3,1,0,2,0,1,0,2,3,1].map((level, i) => (
                <div key={i} className={`h-8 w-full rounded-lg ${
                  level === 0 ? "bg-neutral-800" : level === 1 ? "bg-emerald-900"
                  : level === 2 ? "bg-emerald-700" : "bg-emerald-500"
                }`} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={onUpgrade}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-500 text-white text-xs font-black"
              >
                <Zap size={12} /> {t("pro_heatmap_cta")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}