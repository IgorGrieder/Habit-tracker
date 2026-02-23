import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Workout from "./pages/Workout";
import Goals from "./pages/Goals";
import Nutrition from "./pages/Nutrition";
import Achievements from "./pages/Achievements";
import Recap from "./pages/Recap";

export default function App() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--bg)",
          padding: "36px 40px",
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/recap" element={<Recap />} />
        </Routes>
      </main>
    </div>
  );
}
