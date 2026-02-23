import { NavLink } from "react-router-dom";
import { LayoutDashboard, Flame, Calendar, Trophy } from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/habits", label: "Daily Ops", icon: Flame },
  { to: "/recap", label: "Weekly Recap", icon: Calendar },
  { to: "/achievements", label: "Achievements", icon: Trophy },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "210px",
        minWidth: "210px",
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "28px 0 20px",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 22px 26px" }}>
        <div
          style={{
            fontFamily: '"Bebas Neue", cursive',
            fontSize: 30,
            letterSpacing: "0.14em",
            color: "var(--green)",
            lineHeight: 1,
          }}
        >
          ATLAS
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-dim)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginTop: "3px",
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          Personal Ops
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "var(--border)",
          margin: "0 22px 16px",
        }}
      />

      {/* Nav items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 10px" }}>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "9px 12px",
              borderRadius: "7px",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--green)" : "var(--text-muted)",
              background: isActive ? "var(--green-dim)" : "transparent",
              transition: "all 0.12s ease",
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  color={isActive ? "var(--green)" : "var(--text-muted)"}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Bottom: date */}
      <div
        style={{
          marginTop: "auto",
          padding: "16px 22px 0",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-dim)",
            letterSpacing: "0.1em",
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {new Date()
            .toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
            .toUpperCase()}
        </div>
      </div>
    </aside>
  );
}
