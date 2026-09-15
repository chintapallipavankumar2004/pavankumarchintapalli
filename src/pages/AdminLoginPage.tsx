import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/context/AuthContext";

export function AdminLoginPage() {
  const { user, login, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/admin" replace />;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await login(String(data.get("email")), String(data.get("password")));
      const destination =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/admin";
      navigate(destination, { replace: true });
    } catch {
      setError("Sign-in failed. Check the authorized account and password.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="admin-login">
      <Seo
        title="Admin sign in | Pavan Kumar"
        description="Private portfolio administration."
        noindex
      />
      <form onSubmit={submit} className="admin-card">
        <p className="eyebrow">
          <span>Private</span> Portfolio administration
        </p>
        <h1>Admin sign in</h1>
        {!configured && (
          <div className="admin-notice" role="status">
            <strong>Firebase configuration required.</strong>
            <p>
              Add the documented Vite environment variables before signing in. Public registration
              is intentionally unavailable.
            </p>
          </div>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={!configured || busy}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={!configured || busy}
          />
        </label>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <button className="admin-button primary" type="submit" disabled={!configured || busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <a href="/">← Return to portfolio</a>
      </form>
    </main>
  );
}
