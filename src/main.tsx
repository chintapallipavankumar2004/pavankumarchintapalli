<<<<<<< HEAD
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/inter/latin-300.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-800.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
=======
import ReactDOM from "react-dom/client";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./AppV2";
import { AuthProvider } from "./context/AuthContext";
import { AdminRoute } from "./components/admin/AdminRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import "./styles.css";
import "./portfolio.css";
import "./portfolio-v2.css";
import "./admin.css";

const ProjectDetailPage = lazy(() =>
  import("./pages/ProjectDetailPage").then((module) => ({ default: module.ProjectDetailPage })),
);
const AdminLoginPage = lazy(() =>
  import("./pages/AdminLoginPage").then((module) => ({ default: module.AdminLoginPage })),
);
const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })),
);
const AdminProjectsPage = lazy(() =>
  import("./pages/AdminProjectsPage").then((module) => ({ default: module.AdminProjectsPage })),
);
const AdminProjectEditorPage = lazy(() =>
  import("./pages/AdminProjectEditorPage").then((module) => ({
    default: module.AdminProjectEditorPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);

try {
  const savedTheme = localStorage.getItem("theme");
  const isDark = savedTheme
    ? savedTheme === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", isDark);
} catch {
  document.documentElement.classList.add("dark");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Suspense
        fallback={
          <main className="route-state" role="status">
            Loading…
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/projects/:slug" element={<ProjectDetailPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="projects" element={<AdminProjectsPage />} />
              <Route path="projects/new" element={<AdminProjectEditorPage />} />
              <Route path="projects/:id/edit" element={<AdminProjectEditorPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>,
>>>>>>> 0949a13 (changes)
);
