import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Note from "./pages/Note.jsx";
import Tracker from "./pages/Tracker.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/note" element={<Note />} />
        <Route path="/tracker" element={<Tracker />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
