import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { motion, useMotionValue, animate } from "framer-motion";

// ── Imports SÍNCRONOS ─────────────────────────────────────────────────────────
import Dashboard from "./components/Dashboard";
import ReviewScreen from "./components/ReviewScreen";
import OnboardingRitual from "./components/OnboardingRitual";
import Dock from "./components/Dock";
import BlockedScreen from "./components/BlockedScreen";
import MaintenanceScreen from "./components/MaintenanceScreen";
import TopBanner from "./components/TopBanner";
import ReminderPopup from "./components/ReminderPopup";
import UpdateShowcase from "./components/UpdateShowcase";
import ProModal from "./components/ProModal";

// ── Imports LAZY ─────────────────────────────────────────────────────────────
const LandingPage = lazy(() => import("./components/LandingPage"));
const Auth = lazy(() => import("./components/Auth"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));
const History = lazy(() => import("./components/History"));
const Stats = lazy(() => import("./components/Stats"));
const CommunityHub = lazy(() => import("./components/CommunityHub"));
const ProgressComparison = lazy(
  () => import("./components/ProgressComparison"),
);
const FutureLettersSection = lazy(
  () => import("./components/FutureLettersSection"),
);
const FeedbackSection = lazy(() => import("./components/FeedbackSection"));
const MoreFeatures = lazy(() => import("./components/MoreFeatures"));
const WeeklyGoals = lazy(() => import("./components/WeeklyGoals"));
const SmartInsights = lazy(() => import("./components/SmartInsights"));

// Hooks y Contexto
import { supabase } from "./lib/supabaseClient";
import { useLanguage } from "./context/LanguageContext";
import { useSession } from "./hooks/useSession";
import { useAppSettings } from "./hooks/useAppSettings";
import { useHabits } from "./hooks/useHabits";
import { useProPlan } from "./hooks/useProPlan";
import { usePushSubscription } from "./hooks/usePushSubscription";

const CURRENT_SOFTWARE_VERSION = "2.1.1";
const TABS = ["home", "stats", "community", "apps"];
const MotionDiv = motion.div;

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900">
      <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  );
}

function ProtectedRoute({ isAdmin, children }) {
  return isAdmin ? children : <Navigate to="/" replace />;
}

// ── Layout Principal ─────────────────────────────────────────────────────────
function DashboardLayout({
  session,
  habits,
  todayLogs,
  effectiveIsPro,
  isAdmin,
  isTestAccount,
  updateUnread,
  updateAvailable,
  updateOpen,
  setUpdateOpen,
  handleResetTutorial,
  handleResetUpdates,
  handleToggleTestPro,
  setProModalOpen,
  t,
  fetchTodayLogs,
  weeklyGoals,
  refreshWeeklyGoals,
  yesterdaySummary, // Recibido correctamente
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const tabIndex = TABS.indexOf(activeTab);
  const tabRef = useRef(null);
  const [tabWidth, setTabWidth] = useState(0);
  const x = useMotionValue(0);
  const effectiveWidth = Math.max(
    tabWidth || 0,
    typeof window !== "undefined" ? window.innerWidth : 0,
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab]);

  useEffect(() => {
    const measure = () =>
      setTabWidth(
        tabRef.current?.getBoundingClientRect?.().width || window.innerWidth,
      );
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!effectiveWidth || tabIndex < 0) return;
    const ctrl = animate(x, -tabIndex * effectiveWidth, {
      type: "spring",
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    });
    return ctrl.stop;
  }, [effectiveWidth, tabIndex, x]);

  return (
    <div className="relative min-h-screen bg-neutral-900 overflow-x-hidden flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden w-full" ref={tabRef}>
        <MotionDiv
          className="flex h-full"
          style={{ x, touchAction: 'pan-y' }}
          drag="x"
          dragDirectionLock
          dragConstraints={{
            left: -effectiveWidth * (TABS.length - 1),
            right: 0,
          }}
          dragElastic={0.06}
          onDragEnd={(_, info) => {
            const threshold = effectiveWidth * 0.2;
            if (info.offset.x < -threshold && tabIndex < TABS.length - 1)
              setActiveTab(TABS[tabIndex + 1]);
            else if (info.offset.x > threshold && tabIndex > 0)
              setActiveTab(TABS[tabIndex - 1]);
            else
              animate(x, -tabIndex * effectiveWidth, {
                type: "spring",
                damping: 30,
                stiffness: 300,
                mass: 0.8,
              });
          }}
        >
          {/* 1. Dashboard / Home */}
          <div
            style={{ width: effectiveWidth }}
            className="shrink-0 overflow-y-auto"
          >
            <Dashboard
              user={session.user}
              habits={habits}
              todayLogs={todayLogs}
              onStartReview={() => navigate("/review")}
              version={CURRENT_SOFTWARE_VERSION}
              onOpenAdmin={() => navigate("/admin")}
              onOpenUpdates={() => setUpdateOpen(true)}
              hasUpdates={updateUnread}
              isTestAccount={isTestAccount}
              onResetTutorial={handleResetTutorial}
              onResetUpdates={handleResetUpdates}
              onOpenHistory={() => navigate("/history")}
              isPro={effectiveIsPro}
              isAdmin={isAdmin}
              onToggleTestPro={handleToggleTestPro}
              onUpgrade={() => setProModalOpen(true)}
              onResetToday={fetchTodayLogs}
              weeklyGoals={weeklyGoals}
              yesterdaySummary={yesterdaySummary}
            />
          </div>

          {/* 2. Stats */}
          <div
            style={{ width: effectiveWidth }}
            className="shrink-0 overflow-y-auto"
          >
            <Suspense fallback={<RouteFallback />}>
              <div className="w-full max-w-md mx-auto px-6 pt-6 pb-32 space-y-6">
                <Stats
                  user={session.user}
                  isPro={effectiveIsPro}
                  onUpgrade={() => setProModalOpen(true)}
                />
                <SmartInsights
                  user={session.user}
                  isPro={effectiveIsPro}
                  onUpgrade={() => setProModalOpen(true)}
                />
              </div>
            </Suspense>
          </div>

          {/* 3. Community */}
          <div
            style={{ width: effectiveWidth }}
            className="shrink-0 overflow-y-auto"
          >
            <Suspense fallback={<RouteFallback />}>
              <CommunityHub user={session.user} />
            </Suspense>
          </div>

          {/* 4. More Features */}
          <div
            style={{ width: effectiveWidth }}
            className="shrink-0 overflow-y-auto"
          >
            <div className="w-full max-w-md mx-auto px-6 pt-6 pb-32 space-y-6">
              <Suspense fallback={<RouteFallback />}>
                <ProgressComparison
                  user={session.user}
                  isPro={effectiveIsPro}
                  onUpgrade={() => setProModalOpen(true)}
                />
                <WeeklyGoals
                  isPro={effectiveIsPro}
                  onUpgrade={() => setProModalOpen(true)}
                  user={session.user}
                  onRefresh={refreshWeeklyGoals}
                />
                <FutureLettersSection
                  isPro={effectiveIsPro}
                  onUpgrade={() => setProModalOpen(true)}
                  user={session.user}
                />
                <FeedbackSection user={session.user} />
                <MoreFeatures />
              </Suspense>
            </div>
          </div>
        </MotionDiv>
      </div>
      <Dock activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

// ── Componente Principal App ──────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();

  const {
    session,
    loadingSession,
    isAdmin,
    isBlocked,
    isWhitelisted,
    checkWhitelist,
  } = useSession();

  // Registrar suscripción push cuando el usuario tiene sesión activa
  usePushSubscription(session, language);

  const isTestAccount = useMemo(
    () => session?.user?.email === import.meta.env.VITE_TEST_EMAIL,
    [session],
  );
  const effectiveIsAdmin = isAdmin || isTestAccount;

  const {
    isMaintenance,
    maintenanceMessage,
    updateAvailable,
    updatePayload,
    updateUnread,
    setUpdateUnread,
    markUpdateSeen,
    resetUpdateSeen,
  } = useAppSettings({ session, loadingSession, language });

  const mode = location.pathname === "/review" ? "reviewing" : "dashboard";

  // FIX: Extraer yesterdaySummary del hook
  const { habits, todayLogs, fetchTodayLogs, yesterdaySummary } = useHabits({
    session,
    mode,
  });

  const { effectiveIsPro, handleToggleTestPro } = useProPlan({
    session,
    isTestAccount,
    isAdmin: effectiveIsAdmin,
  });

  const [proModalOpen, setProModalOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  // ── Cierre Semanal: es viernes y el usuario completó ≥4 días esta semana ──
  const [isWeeklyClose, setIsWeeklyClose] = useState(false);
  useEffect(() => {
    const today = new Date();
    if (today.getDay() !== 5 || !session?.user?.id) return;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 4); // lunes de esta semana
    weekStart.setHours(0, 0, 0, 0);
    supabase
      .from('daily_logs')
      .select('created_at')
      .eq('user_id', session.user.id)
      .eq('status', 'summary')
      .gte('created_at', weekStart.toISOString())
      .then(({ data }) => {
        if (data && data.length >= 4) setIsWeeklyClose(true);
      });
  }, [session?.user?.id]);

  // Lógica de Metas Semanales
  const [weeklyGoals, setWeeklyGoals] = useState([]);

  const refreshWeeklyGoals = useCallback(async () => {
    if (!session?.user?.id) return;

    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("weekly_goals")
      .select("current_value, target_value")
      .eq("user_id", session.user.id)
      .eq("week_start", monday.toISOString());

    if (error)
      console.error("[App] Error cargando weekly_goals:", error.message);
    else setWeeklyGoals(data || []);
  }, [session?.user?.id]);

  useEffect(() => {
    refreshWeeklyGoals();
  }, [refreshWeeklyGoals]);

  // Redirecciones
  useEffect(() => {
    if (
      session &&
      !session.user.user_metadata?.has_finished_tutorial &&
      location.pathname !== "/tutorial"
    )
      navigate("/tutorial", { replace: true });
  }, [session, navigate, location.pathname]);

  useEffect(() => {
    checkWhitelist(isMaintenance);
  }, [session, isMaintenance, checkWhitelist]);

  if (loadingSession)
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white font-black italic tracking-tighter uppercase text-3xl">
        DAYCLOSE
      </div>
    );

  if (isMaintenance && !isWhitelisted && !effectiveIsAdmin)
    return <MaintenanceScreen message={maintenanceMessage} />;

  if (!session)
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth" element={<Auth onBack={() => navigate("/")} />} />
          <Route
            path="*"
            element={<LandingPage onGetStarted={() => navigate("/auth")} />}
          />
        </Routes>
      </Suspense>
    );

  if (isBlocked && !effectiveIsAdmin)
    return (
      <BlockedScreen title={t("blocked_title")} message={t("blocked_desc")} />
    );

  return (
    <>
      <ProModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
        user={session.user}
        onProActivated={() => window.location.reload()}
      />
      <TopBanner onOpenUpdates={() => setUpdateOpen(true)} updateAvailable={updateAvailable} />
      <UpdateShowcase
        isOpen={updateOpen}
        onClose={() => {
          markUpdateSeen(updatePayload?.id);
          setUpdateOpen(false);
        }}
        payload={updatePayload}
      />
      <ReminderPopup
        session={session}
        isPro={effectiveIsPro}
        habits={habits}
        todayLogs={todayLogs}
        mode={mode}
      />

      <Routes>
        <Route
          path="/tutorial"
          element={
            <OnboardingRitual
              user={session.user}
              onComplete={async () => {
                await supabase.auth.updateUser({
                  data: { has_finished_tutorial: true },
                });
                navigate("/", { replace: true });
              }}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute isAdmin={effectiveIsAdmin}>
              <Suspense fallback={<RouteFallback />}>
                <AdminPanel
                  onClose={() => navigate("/")}
                  version={CURRENT_SOFTWARE_VERSION}
                />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <Suspense fallback={<RouteFallback />}>
              <History
                user={session.user}
                onClose={() => navigate("/")}
                isPro={effectiveIsPro}
              />
            </Suspense>
          }
        />
        <Route
          path="/review"
          element={
            <ReviewScreen
              habits={habits}
              todayLogs={todayLogs}
              session={session}
              onReviewComplete={fetchTodayLogs}
              yesterdaySummary={yesterdaySummary}
              isPro={effectiveIsPro}
              isWeeklyClose={isWeeklyClose}
            />
          }
        />
        <Route
          path="/"
          element={
            <DashboardLayout
              session={session}
              habits={habits}
              todayLogs={todayLogs}
              effectiveIsPro={effectiveIsPro}
              isAdmin={effectiveIsAdmin}
              isTestAccount={isTestAccount}
              updateUnread={updateUnread}
              updateAvailable={updateAvailable}
              updateOpen={updateOpen}
              setUpdateOpen={setUpdateOpen}
              fetchTodayLogs={fetchTodayLogs}
              weeklyGoals={weeklyGoals}
              refreshWeeklyGoals={refreshWeeklyGoals}
              yesterdaySummary={yesterdaySummary} // Ahora sí está definido
              handleResetTutorial={async () => {
                await supabase.auth.updateUser({
                  data: { has_finished_tutorial: false },
                });
                navigate("/tutorial", { replace: true });
              }}
              handleResetUpdates={resetUpdateSeen}
              handleToggleTestPro={handleToggleTestPro}
              setProModalOpen={setProModalOpen}
              t={t}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}