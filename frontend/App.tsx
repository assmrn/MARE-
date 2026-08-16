import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import DashboardPage from "@/pages/dashboard";
import MissionPlannerPage from "@/pages/mission-planner";
import TelemetryPage from "@/pages/telemetry";
import CameraStreamsPage from "@/pages/camera-streams";
import CopilotPage from "@/pages/copilot";
import SystemLogsPage from "@/pages/system-logs";
import WeatherPage from "@/pages/weather";
import MissionArchivePage from "@/pages/mission-archive";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import { useAuthStore } from "@/store/authStore";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const signedIn = useAuthStore((s) => s.signedIn);
  if (!signedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/planner" element={<MissionPlannerPage />} />
          <Route path="/telemetry" element={<TelemetryPage />} />
          <Route path="/cameras" element={<CameraStreamsPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/logs" element={<SystemLogsPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/archive" element={<MissionArchivePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
