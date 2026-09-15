import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function AdminRoute() {
  const { user, loading, configured } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <main className="admin-state" role="status">
        Checking access…
      </main>
    );
  if (!configured)
    return (
      <Navigate to="/admin/login" replace state={{ from: location, configurationRequired: true }} />
    );
  return user ? <Outlet /> : <Navigate to="/admin/login" replace state={{ from: location }} />;
}
