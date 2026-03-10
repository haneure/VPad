import { NavLink, Outlet } from "react-router-dom";
import { ConnectionBadge } from "./ConnectionBadge";
import { useProfileStore } from "../features/profiles/useProfileStore";

export function AppShell() {
  const activeProfileName = useProfileStore((state) =>
    state.profiles.find((profile) => profile.id === state.activeProfileId)?.name ?? "No Profile",
  );
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="row">
          <strong>VPad</strong>
          <span className="small">{activeProfileName}</span>
        </div>
        <div className="row">
          <ConnectionBadge />
          <span className="small">Host</span>
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <nav>
            <NavLink to="/host">Dashboard</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
