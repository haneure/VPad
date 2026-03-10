import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { HostPage } from "../routes/HostPage";
import { RemotePage } from "../routes/RemotePage";
import { SettingsPage } from "../routes/SettingsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/remote/:sessionId" element={<RemotePage />} />
      <Route element={<AppShell />}>
        <Route path="/host" element={<HostPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/host" replace />} />
      </Route>
    </Routes>
  );
}
