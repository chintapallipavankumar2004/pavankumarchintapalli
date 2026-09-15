import { FolderKanban, Home, LogOut, Plus } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <NavLink to="/admin" className="admin-brand">
          Portfolio Admin
        </NavLink>
        <span>{user?.email}</span>
        <button type="button" className="admin-button secondary" onClick={logout}>
          <LogOut size={17} /> Sign out
        </button>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar">
          <nav aria-label="Admin navigation">
            <NavLink to="/admin" end>
              <Home size={18} /> Dashboard
            </NavLink>
            <NavLink to="/admin/projects">
              <FolderKanban size={18} /> Projects
            </NavLink>
            <NavLink to="/admin/projects/new">
              <Plus size={18} /> New project
            </NavLink>
          </nav>
          <a href="/" target="_blank" rel="noreferrer">
            View public site ↗
          </a>
        </aside>
        <main className="admin-main" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
