import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getAppBasePath } from '@/lib/basePath';

const Login = lazy(() => import("@/pages/Login").then((module) => ({ default: module.Login })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Candidates = lazy(() => import("@/pages/Candidates").then((module) => ({ default: module.Candidates })));
const Jobs = lazy(() => import("@/pages/Jobs").then((module) => ({ default: module.Jobs })));
const Messages = lazy(() => import("@/pages/Messages").then((module) => ({ default: module.Messages })));
const Agents = lazy(() => import("@/pages/Agents").then((module) => ({ default: module.Agents })));
const AIWorkflows = lazy(() => import("@/pages/AIWorkflows").then((module) => ({ default: module.AIWorkflows })));
const WelcomeTracking = lazy(() => import("@/pages/WelcomeTracking").then((module) => ({ default: module.WelcomeTracking })));
const WhatsAppAccounts = lazy(() => import("@/pages/WhatsAppAccounts").then((module) => ({ default: module.WhatsAppAccounts })));
const WorkspaceHub = lazy(() => import("@/pages/WorkspaceHub").then((module) => ({ default: module.WorkspaceHub })));
const Reports = lazy(() => import("@/pages/Reports").then((module) => ({ default: module.Reports })));
const Settings = lazy(() => import("@/pages/Settings").then((module) => ({ default: module.Settings })));

const RouteFallback = () => (
  <div className="min-h-[50vh] w-full flex items-center justify-center text-sm font-semibold tracking-[0.18em] uppercase text-cyan-300">
    Cargando modulo...
  </div>
);

function ProtectedLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router basename={getAppBasePath()}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/candidates" element={<Candidates />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/ai-workflows" element={<AIWorkflows />} />
                <Route path="/welcome-followup" element={<WelcomeTracking />} />
                <Route path="/whatsapp" element={<WhatsAppAccounts />} />
                <Route path="/workspace" element={<WorkspaceHub />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
