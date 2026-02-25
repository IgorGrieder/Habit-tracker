import { useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getHabits,
  createHabit,
  deleteHabit,
  updateHabitWhy,
  updateHabitSchedule,
  completeHabit,
  uncompleteHabit,
  getHabitHistory,
  getHabitsCalendar,
  type Habit,
} from "../lib/api";
import { Check, Plus, Trash2, X, ChevronDown, ChevronRight, TrendingUp, Pencil } from "lucide-react";
import { formatShortDate, dayOfWeek } from "../lib/utils";

const ICONS = ["⚡", "🏃", "📚", "💧", "🧘", "🎯", "💪", "🥗", "😴", "🧠", "🎵", "✍️"];
const COLORS = [
  "#15803d", "#2563eb", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#c2410c", "#4f46e5",
];

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function parseScheduleClient(s: string): Set<number> {
  return new Set(s.split(",").map(Number));
}

// ── Aggregate completion chart with time-range selector ───────────────────────
function HabitsCompletionChart() {
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const { data = [] } = useQuery({
    queryKey: ["habits-calendar", range],
    queryFn: () => getHabitsCalendar(range),
  });

  const today = new Date().toISOString().split("T")[0];
  const hasData = data.some((d) => d.total > 0);

  // How often to show x-axis labels based on range
  const tickEvery = range === 7 ? 1 : range === 30 ? 7 : 14;

  const avg =
    data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.pct, 0) / data.length)
      : 0;

  // Best streak within the selected window
  let bestRun = 0;
  let currentRun = 0;
  for (const d of data) {
    if (d.pct === 100) { currentRun++; bestRun = Math.max(bestRun, currentRun); }
    else currentRun = 0;
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: { date: string; completed: number; total: number; pct: number } }[];
  }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
          boxShadow: "var(--shadow-md)",
          minWidth: 130,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
          {formatShortDate(d.date)}
        </div>
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            fontSize: 20,
            color: d.pct === 100 ? "var(--green)" : d.pct > 0 ? "var(--text)" : "var(--text-dim)",
            lineHeight: 1,
          }}
        >
          {d.pct}%
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
          {d.completed} / {d.total} habits
        </div>
      </div>
    );
  };

  return (
    <div className="panel" style={{ padding: "22px 24px 18px", marginBottom: 24 }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={15} color="var(--text-muted)" />
          <span
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: 16,
              letterSpacing: "0.14em",
              color: "var(--text)",
            }}
          >
            COMPLETION HISTORY
          </span>
        </div>

        {/* Range selector tabs */}
        <div style={{ display: "flex", gap: 2, background: "var(--bg-elevated)", borderRadius: 7, padding: 3 }}>
          {RANGES.map(({ label, days }) => (
            <button
              key={days}
              onClick={() => setRange(days)}
              style={{
                padding: "4px 12px",
                borderRadius: 5,
                border: "none",
                background: range === days ? "var(--bg-panel)" : "transparent",
                color: range === days ? "var(--text)" : "var(--text-muted)",
                fontSize: 11,
                fontWeight: range === days ? 600 : 400,
                fontFamily: '"JetBrains Mono", monospace',
                cursor: "pointer",
                boxShadow: range === days ? "var(--shadow-sm)" : "none",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {hasData && (
        <div
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 18,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <MiniStat label="Average" value={`${avg}%`} highlight={avg >= 80} />
          <MiniStat label="Perfect days" value={`${data.filter((d) => d.pct === 100).length}`} />
          <MiniStat label="Best run" value={`${bestRun}d`} highlight={bestRun >= 7} />
          <MiniStat
            label="Today"
            value={`${data[data.length - 1]?.pct ?? 0}%`}
            highlight={(data[data.length - 1]?.pct ?? 0) === 100}
          />
        </div>
      )}

      {!hasData ? (
        <div
          style={{
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          Complete habits to see your history here
        </div>
      ) : (
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={range === 7 ? 40 : range === 30 ? 14 : 6} barGap={2}>
              <XAxis
                dataKey="date"
                tickFormatter={(d, i) =>
                  i % tickEvery === 0 ? formatShortDate(d).toUpperCase() : ""
                }
                tick={{
                  fill: "var(--text-dim)",
                  fontSize: 9,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "var(--bg-elevated)", radius: 3 }}
              />
              <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                {data.map((entry) => {
                  const isToday = entry.date === today;
                  let fill: string;
                  if (entry.pct === 100) fill = "var(--green)";
                  else if (entry.pct >= 50) fill = "#4ade80";
                  else if (entry.pct > 0) fill = "#a7f3d0";
                  else fill = "var(--bg-elevated)";

                  return (
                    <Cell
                      key={entry.date}
                      fill={fill}
                      opacity={isToday ? 1 : 0.75}
                      stroke={isToday ? "var(--green)" : "none"}
                      strokeWidth={isToday ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        {[
          { color: "var(--green)", label: "100%" },
          { color: "#4ade80", label: "50–99%" },
          { color: "#a7f3d0", label: "1–49%" },
          { color: "var(--bg-elevated)", label: "0%" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
                border: "1px solid var(--border)",
              }}
            />
            <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          fontSize: 16,
          color: highlight ? "var(--green)" : "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Today's check-in strip ──────────────────────────────────────────────────
function TodayCheckIn({
  habits,
  onToggle,
}: {
  habits: Habit[];
  onToggle: (id: string, done: boolean) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = habits.filter((h) => h.completedToday).length;
  const total = habits.length;
  const allDone = done === total && total > 0;

  return (
    <div
      className="panel"
      style={{
        padding: "20px 24px",
        marginBottom: 24,
        borderColor: allDone ? "var(--green-dim-border)" : "var(--border)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: 17,
              letterSpacing: "0.12em",
              color: "var(--text)",
            }}
          >
            TODAY
          </span>
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {done} of {total} done
          </span>
        </div>

        {/* Progress pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: allDone ? "var(--green-dim)" : "var(--bg-elevated)",
            padding: "4px 12px",
            borderRadius: 20,
            border: `1px solid ${allDone ? "var(--green-dim-border)" : "var(--border)"}`,
          }}
        >
          <div
            style={{
              width: 64,
              height: 4,
              borderRadius: 2,
              background: "var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: total > 0 ? `${(done / total) * 100}%` : "0%",
                background: "var(--green)",
                borderRadius: 2,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              fontWeight: 700,
              color: allDone ? "var(--green)" : "var(--text-muted)",
            }}
          >
            {total > 0 ? Math.round((done / total) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Habit tiles */}
      {habits.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", paddingBottom: 4 }}>
          Add your first habit below →
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 8,
          }}
        >
          {habits.map((h) => (
            <div key={h.id} style={{ position: "relative" }}>
              <button
                onClick={() => onToggle(h.id, h.completedToday)}
                onMouseEnter={(e) => {
                  if (hideTimer.current) clearTimeout(hideTimer.current);
                  setHoveredId(h.id);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipAnchor({ x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => {
                  hideTimer.current = setTimeout(() => setHoveredId(null), 120);
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 9,
                  border: `1.5px solid ${
                    h.completedToday
                      ? "var(--green-dim-border)"
                      : "var(--border)"
                  }`,
                  background: h.completedToday
                    ? "var(--green-dim)"
                    : "var(--bg-elevated)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Check circle */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `2px solid ${
                      h.completedToday ? "var(--green)" : "var(--text-dim)"
                    }`,
                    background: h.completedToday ? "var(--green)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                  }}
                >
                  {h.completedToday && (
                    <Check size={12} color="#ffffff" strokeWidth={3} />
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: h.completedToday ? "var(--green)" : "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textDecoration: h.completedToday ? "line-through" : "none",
                      textDecorationColor: "var(--green-bright)",
                      transition: "all 0.15s",
                    }}
                  >
                    {h.icon} {h.name}
                  </div>
                  {h.streak > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--amber)",
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 600,
                        marginTop: 1,
                      }}
                    >
                      <span className="streak-fire">🔥</span> {h.streak}d
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip — anchored above the hovered tile */}
      {(() => {
        const h = hoveredId !== null ? habits.find((x) => x.id === hoveredId) : null;
        if (!h?.why || !tooltipAnchor) return null;
        return (
          <div
            onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
            onMouseLeave={() => { hideTimer.current = setTimeout(() => setHoveredId(null), 120); }}
            style={{
              position: "fixed",
              top: tooltipAnchor.y - 10,
              left: tooltipAnchor.x,
              transform: "translate(-50%, -100%)",
              zIndex: 100,
              background: "var(--bg-panel)",
              border: `1px solid var(--border)`,
              borderLeft: `3px solid ${h.color}`,
              borderRadius: 10,
              width: 300,
              maxHeight: 200,
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
              animation: "whyFade 0.15s ease forwards",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 18px" }}>
              <span style={{ fontSize: 18, lineHeight: 1.4, flexShrink: 0 }}>{h.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: h.color,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {h.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontStyle: "italic",
                    color: "var(--text-muted)",
                    lineHeight: 1.55,
                  }}
                >
                  "{h.why}"
                </div>
              </div>
            </div>
            <style>{`
              @keyframes whyFade {
                from { opacity: 0; transform: translate(-50%, calc(-100% + 6px)); }
                to   { opacity: 1; transform: translate(-50%, -100%); }
              }
            `}</style>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main Habits page ─────────────────────────────────────────────────────────
export default function Habits() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("⚡");
  const [color, setColor] = useState("#15803d");
  const [why, setWhy] = useState("");
  const [scheduleDays, setScheduleDays] = useState<number[]>(ALL_DAYS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleScheduleDay = (day: number) => {
    if (scheduleDays.includes(day) && scheduleDays.length === 1) return;
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: getHabits,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createHabit({
        name,
        icon,
        color,
        why: why.trim() || undefined,
        schedule: scheduleDays.join(","),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["habits-calendar"] });
      setShowForm(false);
      setName("");
      setIcon("⚡");
      setColor("#15803d");
      setWhy("");
      setScheduleDays(ALL_DAYS);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["habits-calendar"] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      done ? uncompleteHabit(id) : completeHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["habits-calendar"] });
    },
  });

  return (
    <div style={{ width: "100%" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: 44,
              color: "var(--text)",
              letterSpacing: "0.08em",
              lineHeight: 1,
            }}
          >
            DAILY OPS
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            {habits.filter((h) => h.scheduledToday && h.completedToday).length} /{" "}
            {habits.filter((h) => h.scheduledToday).length} completed today
          </div>
        </div>
        <button className="btn btn-green" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New Habit
        </button>
      </div>

      {/* Today check-in — only habits scheduled for today */}
      <TodayCheckIn
        habits={habits.filter((h) => h.scheduledToday)}
        onToggle={(id, done) => toggleMut.mutate({ id, done })}
      />

      {/* Aggregate chart */}
      <HabitsCompletionChart />

      {/* Individual habit cards (history + manage) */}
      {habits.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Habit Details
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {habits.map((h, i) => (
              <HabitRow
                key={h.id}
                habit={h}
                expanded={expandedId === h.id}
                onExpand={() =>
                  setExpandedId(expandedId === h.id ? null : h.id)
                }
                onDelete={() => deleteMut.mutate(h.id)}
                animDelay={i * 40}
              />
            ))}
          </div>
        </>
      )}

      {/* New Habit Modal */}
      {showForm && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowForm(false);
            setScheduleDays(ALL_DAYS);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 22,
              }}
            >
              <span
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: 22,
                  letterSpacing: "0.1em",
                }}
              >
                New Habit
              </span>
              <button
                onClick={() => {
                  setShowForm(false);
                  setScheduleDays(ALL_DAYS);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Name
                </label>
                <input
                  autoFocus
                  placeholder="e.g. Morning run, Read 30min..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && name.trim() && createMut.mutate()
                  }
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Why
                  <span
                    style={{
                      fontWeight: 400,
                      textTransform: "none",
                      letterSpacing: 0,
                      fontSize: 11,
                      marginLeft: 6,
                      color: "var(--text-dim)",
                    }}
                  >
                    — your motivation (optional)
                  </span>
                </label>
                <textarea
                  placeholder="e.g. Clears my head and sets the tone for the day"
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  rows={2}
                  style={{ resize: "vertical", minHeight: 52 }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Icon
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        border: `1.5px solid ${
                          icon === ic ? "var(--green)" : "var(--border)"
                        }`,
                        background:
                          icon === ic ? "var(--green-dim)" : "var(--bg-elevated)",
                        fontSize: 18,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.12s",
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Color
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: c,
                        border: `2.5px solid ${
                          color === c ? "var(--text)" : "transparent"
                        }`,
                        cursor: "pointer",
                        transition: "transform 0.12s",
                        transform: color === c ? "scale(1.22)" : "scale(1)",
                        boxShadow:
                          color === c ? `0 0 0 2px var(--bg-panel)` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Schedule
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {DAY_LETTERS.map((letter, idx) => {
                    const selected = scheduleDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleScheduleDay(idx)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          border: `1.5px solid ${selected ? "var(--green)" : "var(--border)"}`,
                          background: selected ? "var(--green-dim)" : "var(--bg-elevated)",
                          color: selected ? "var(--green)" : "var(--text-dim)",
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: '"JetBrains Mono", monospace',
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowForm(false);
                    setScheduleDays(ALL_DAYS);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-green"
                  style={{ flex: 2 }}
                  disabled={!name.trim() || createMut.isPending}
                  onClick={() => createMut.mutate()}
                >
                  <Plus size={14} /> Add Habit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Collapsible habit detail row ─────────────────────────────────────────────
function HabitRow({
  habit,
  expanded,
  onExpand,
  onDelete,
  animDelay,
}: {
  habit: Habit;
  expanded: boolean;
  onExpand: () => void;
  onDelete: () => void;
  animDelay: number;
}) {
  const qc = useQueryClient();
  const [editingWhy, setEditingWhy] = useState(false);
  const [whyDraft, setWhyDraft] = useState(habit.why ?? "");
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<number[]>([]);

  const whyMut = useMutation({
    mutationFn: (val: string) => updateHabitWhy(habit.id, val),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      setEditingWhy(false);
    },
  });

  const scheduleMut = useMutation({
    mutationFn: (schedule: string) => updateHabitSchedule(habit.id, schedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["habit-history", habit.id] });
      qc.invalidateQueries({ queryKey: ["habits-calendar"] });
      setEditingSchedule(false);
    },
  });

  const toggleScheduleDraftDay = (day: number) => {
    if (scheduleDraft.includes(day) && scheduleDraft.length === 1) return;
    setScheduleDraft((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const { data: history } = useQuery({
    queryKey: ["habit-history", habit.id],
    queryFn: () => getHabitHistory(habit.id, 28),
    enabled: expanded,
  });

  return (
    <div
      className="panel"
      style={{
        overflow: "hidden",
        animation: "fadeIn 0.25s ease forwards",
        animationDelay: `${animDelay}ms`,
        opacity: 0,
      }}
    >
      {/* Row header */}
      <button
        onClick={onExpand}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Color dot + icon */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${habit.color}14`,
            border: `1px solid ${habit.color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {habit.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
            {habit.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {habit.streak > 0 ? (
              <span
                style={{
                  color: "var(--amber)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                }}
              >
                <span className="streak-fire">🔥</span> {habit.streak}-day streak
              </span>
            ) : (
              "No streak yet"
            )}
          </div>
        </div>

        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 22,
            fontWeight: 700,
            color:
              habit.streak > 5
                ? "var(--amber)"
                : habit.streak > 0
                ? "var(--text-muted)"
                : "var(--text-dim)",
            minWidth: 36,
            textAlign: "right",
          }}
        >
          {habit.streak}
        </div>

        {expanded ? (
          <ChevronDown size={15} color="var(--text-dim)" />
        ) : (
          <ChevronRight size={15} color="var(--text-dim)" />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-dim)",
            padding: 4,
            borderRadius: 4,
            display: "flex",
            transition: "color 0.12s",
          }}
        >
          <Trash2 size={13} />
        </button>
      </button>

      {/* Expanded: why + 28-day heatmap grid */}
      {expanded && (
        <div
          style={{
            padding: "4px 16px 16px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Why section */}
          <div style={{ margin: "14px 0 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Why I do this
              </span>
              {!editingWhy && (
                <button
                  onClick={() => {
                    setWhyDraft(habit.why ?? "");
                    setEditingWhy(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-dim)",
                    padding: "1px 4px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Edit"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>

            {editingWhy ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  autoFocus
                  value={whyDraft}
                  onChange={(e) => setWhyDraft(e.target.value)}
                  placeholder="What's your reason for doing this habit?"
                  rows={2}
                  style={{ resize: "vertical", minHeight: 48, fontSize: 13 }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 12px" }}
                    onClick={() => setEditingWhy(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-green"
                    style={{ fontSize: 12, padding: "5px 14px" }}
                    disabled={whyMut.isPending}
                    onClick={() => whyMut.mutate(whyDraft.trim())}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : habit.why ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  lineHeight: 1.55,
                  padding: "8px 12px",
                  borderRadius: 7,
                  background: "var(--bg-elevated)",
                  borderLeft: `3px solid ${habit.color}`,
                }}
              >
                "{habit.why}"
              </div>
            ) : (
              <button
                onClick={() => {
                  setWhyDraft("");
                  setEditingWhy(true);
                }}
                style={{
                  background: "none",
                  border: "1px dashed var(--border)",
                  borderRadius: 7,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                + Add your motivation for this habit...
              </button>
            )}
          </div>

          {/* Schedule section */}
          <div style={{ margin: "0 0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Schedule
              </span>
              {!editingSchedule && (
                <button
                  onClick={() => {
                    setScheduleDraft(
                      Array.from(parseScheduleClient(habit.schedule ?? "0,1,2,3,4,5,6")).sort(
                        (a, b) => a - b
                      )
                    );
                    setEditingSchedule(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-dim)",
                    padding: "1px 4px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Edit schedule"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>

            {editingSchedule ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {DAY_LETTERS.map((letter, idx) => {
                    const selected = scheduleDraft.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleScheduleDraftDay(idx)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          border: `1.5px solid ${selected ? "var(--green)" : "var(--border)"}`,
                          background: selected ? "var(--green-dim)" : "var(--bg-elevated)",
                          color: selected ? "var(--green)" : "var(--text-dim)",
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: '"JetBrains Mono", monospace',
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 12px" }}
                    onClick={() => setEditingSchedule(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-green"
                    style={{ fontSize: 12, padding: "5px 14px" }}
                    disabled={scheduleMut.isPending}
                    onClick={() => scheduleMut.mutate(scheduleDraft.join(","))}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 4 }}>
                {DAY_LETTERS.map((letter, idx) => {
                  const scheduled = parseScheduleClient(habit.schedule ?? "0,1,2,3,4,5,6").has(
                    idx
                  );
                  return (
                    <div
                      key={idx}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        border: `1.5px solid ${scheduled ? `${habit.color}60` : "var(--border)"}`,
                        background: scheduled ? `${habit.color}20` : "transparent",
                        color: scheduled ? habit.color : "var(--text-dim)",
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: scheduled ? 1 : 0.4,
                      }}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Last 28 Days
          </div>

          {history ? (
            <>
              {/* Day-of-week header — single letters, compact */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 13px)", gap: 3, marginBottom: 3 }}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} style={{
                    width: 13, height: 13,
                    fontSize: 8,
                    color: "var(--text-dim)",
                    textAlign: "center",
                    fontFamily: '"JetBrains Mono", monospace',
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* 28-day dot grid — fixed 13px cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 13px)", gridAutoRows: "13px", gap: 3 }}>
                {/* Padding to align oldest date to correct weekday */}
                {Array.from({ length: new Date(history[0].date + "T12:00:00Z").getUTCDay() }).map((_, i) => (
                  <div key={`pad-${i}`} style={{ width: 13, height: 13 }} />
                ))}
                {history.map((day) => {
                  const isToday = day.date === new Date().toISOString().split("T")[0];
                  const isOffDay = !day.scheduled;
                  return (
                    <div
                      key={day.date}
                      title={isOffDay ? `${day.date}: rest` : `${day.date}: ${day.completed ? "✓" : "—"}`}
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: 3,
                        background: day.completed ? habit.color : isOffDay ? "transparent" : "var(--bg-elevated)",
                        border: isToday
                          ? `1.5px solid ${habit.color}`
                          : isOffDay ? "1px dashed var(--border)" : "1px solid var(--border)",
                        opacity: day.completed ? 1 : isOffDay ? 0.3 : 0.45,
                        transition: "opacity 0.1s",
                        flexShrink: 0,
                      }}
                    />
                  );
                })}
              </div>

              {/* Compact inline stats strip */}
              {(() => {
                const scheduledCount = history.filter((d) => d.scheduled).length;
                const completedCount = history.filter((d) => d.completed).length;
                const rate = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;
                return (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px solid var(--border)",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11,
                  }}>
                    <span style={{ color: "var(--text-dim)", fontSize: 8, letterSpacing: "0.1em" }}>DONE</span>
                    <span style={{ fontWeight: 700, color: "var(--text)" }}>
                      {completedCount}<span style={{ color: "var(--text-dim)", fontWeight: 400 }}>/{scheduledCount}</span>
                    </span>
                    <span style={{ color: "var(--border)" }}>·</span>
                    <span style={{ color: "var(--text-dim)", fontSize: 8, letterSpacing: "0.1em" }}>RATE</span>
                    <span style={{ fontWeight: 700, color: rate >= 80 ? "var(--green)" : "var(--text)" }}>{rate}%</span>
                    {habit.streak > 0 && (
                      <>
                        <span style={{ color: "var(--border)" }}>·</span>
                        <span className="streak-fire" style={{ fontSize: 11 }}>🔥</span>
                        <span style={{ fontWeight: 700, color: "var(--amber)" }}>{habit.streak}d</span>
                      </>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div style={{ color: "var(--text-dim)", fontSize: 12, padding: "8px 0" }}>
              Loading…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

