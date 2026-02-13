import { CssBaseline } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import EventFormPage from "./pages/EventFormPage";
import EventsPage from "./pages/EventsPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/new" element={<EventFormPage />} />
        <Route path="/events/:id/edit" element={<EventFormPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
