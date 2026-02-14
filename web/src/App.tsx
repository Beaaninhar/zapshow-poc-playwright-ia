import { CssBaseline } from "@mui/material";
import { useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import EventFormPage from "./pages/EventFormPage";
import EventsPage from "./pages/EventsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UsersPage from "./pages/UsersPage";
import { AuthUser } from "./services/apiClient";

const STORAGE_KEY = "zapshow-user";

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() =>
    loadStoredUser(),
  );

  const isMaster = useMemo(() => currentUser?.role === "MASTER", [currentUser]);

  function handleLogin(user: AuthUser) {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <>
      <CssBaseline />
      <Routes>
        <Route
          path="/"
          element={<Navigate to={currentUser ? "/events" : "/login"} replace />}
        />
        <Route
          path="/login"
          element={
            currentUser ? <Navigate to="/events" replace /> : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/register"
          element={currentUser ? <Navigate to="/events" replace /> : <RegisterPage />}
        />
        <Route
          path="/events"
          element={
            currentUser ? (
              <EventsPage currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/new"
          element={
            currentUser ? <EventFormPage currentUser={currentUser} /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/users"
          element={
            currentUser ? (
              isMaster ? (
                <UsersPage currentUser={currentUser} onLogout={handleLogout} />
              ) : (
                <Navigate to="/events" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
