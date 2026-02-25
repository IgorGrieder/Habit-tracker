import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboard, completeHabit, uncompleteHabit } from "../lib/api";
import { formatDate, dayOfWeek } from "../lib/utils";
import {
  Check,
  Circle,
  ArrowRight,
  Flame,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  const toggleHabit = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      done ? uncompleteHabit(id) : completeHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["habits-calendar"] });
    },
  });

  if (isLoading || !data)
    return (
      <div
        style={{
          color: "var(--text-dim)",
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        }}
      >
        Loading...
      </div>
    );

  const habitScore =
    data.totalHabits > 0
      ? Math.round((data.habitsDoneToday / data.totalHabits) * 100)
      : 0;

  const allDone =
    data.totalHabits > 0 && data.habitsDoneToday === data.totalHabits;

  // Sort by streak descending for leaders
  const streakLeaders = [...data.habits]
    .filter((h) => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 4);

  return (
    <div style={{ width: "100%" }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              color: "var(--text-dim)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {formatDate(data.today).toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: 52,
              color: "var(--text)",
              letterSpacing: "0.06em",
              lineHeight: 1,
            }}
          >
            OPS BRIEF
          </div>
        </div>

        {/* Today score */}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1,
              color: allDone ? "var(--green)" : "var(--text)",
            }}
          >
            {habitScore}
            <span
              style={{
                fontSize: 24,
                color: "var(--text-dim)",
                fontWeight: 400,
              }}
            >
              %
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {data.habitsDoneToday} of {data.totalHabits} habits done
          </div>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Today's habits */}
          <div className="panel" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: 16,
                  letterSpacing: "0.14em",
                  color: "var(--text)",
                }}
              >
                TODAY'S HABITS
              </span>
              <Link
                to="/habits"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Manage <ArrowRight size={11} />
              </Link>
            </div>

            {data.habits.length === 0 ? (
              <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "8px 0" }}>
                No habits yet —{" "}
                <Link
                  to="/habits"
                  style={{ color: "var(--green)", textDecoration: "none" }}
                >
                  add your first
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.habits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() =>
                      toggleHabit.mutate({ id: h.id, done: h.completedToday })
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: h.completedToday
                        ? "var(--green-dim)"
                        : "var(--bg-elevated)",
                      border: `1px solid ${
                        h.completedToday
                          ? "var(--green-dim-border)"
                          : "var(--border)"
                      }`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }}
                  >
                    {/* Circle check */}
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${
                          h.completedToday ? "var(--green)" : "var(--text-dim)"
                        }`,
                        background: h.completedToday ? "var(--green)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.18s ease",
                      }}
                    >
                      {h.completedToday && (
                        <Check size={11} color="#fff" strokeWidth={3} />
                      )}
                    </div>

                    <span style={{ fontSize: 15 }}>{h.icon}</span>

                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: 500,
                        color: h.completedToday
                          ? "var(--green)"
                          : "var(--text)",
                        textDecoration: h.completedToday ? "line-through" : "none",
                        textDecorationColor: "var(--green-mid)",
                        transition: "all 0.15s",
                      }}
                    >
                      {h.name}
                    </span>

                    {h.streak > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--amber)",
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        <span className="streak-fire">🔥</span> {h.streak}d
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* This-week pulse chart */}
          <ThisWeekChart
            data={data.weeklyData}
            today={data.today}
            totalHabits={data.totalHabits}
          />
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Active missions */}
          <div className="panel" style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: 16,
                  letterSpacing: "0.14em",
                  color: "var(--text)",
                }}
              >
                MISSIONS
              </span>
              <Link
                to="/goals"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                All <ArrowRight size={11} />
              </Link>
            </div>

            {data.goals.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                No active missions —{" "}
                <Link
                  to="/goals"
                  style={{ color: "var(--green)", textDecoration: "none" }}
                >
                  set a goal
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.goals.map((g) => (
                  <div key={g.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text)",
                          flex: 1,
                          marginRight: 8,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {g.title}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          color:
                            g.progress === 100
                              ? "var(--green)"
                              : "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {g.progress}%
                      </span>
                    </div>
                    {/* Segmented milestone track */}
                    {g.totalMilestones > 0 ? (
                      <MilestoneTrack
                        total={g.totalMilestones}
                        done={g.doneMilestones}
                      />
                    ) : (
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${g.progress}%`,
                            background: "var(--green)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Streak leaders */}
          {streakLeaders.length > 0 && (
            <div className="panel" style={{ padding: 22 }}>
              <div
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: 16,
                  letterSpacing: "0.14em",
                  color: "var(--text)",
                  marginBottom: 14,
                }}
              >
                STREAK LEADERS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {streakLeaders.map((h, i) => (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: "var(--text-dim)",
                        width: 14,
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{h.icon}</span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.name}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <Flame
                        size={12}
                        color="var(--amber)"
                        fill="var(--amber)"
                      />
                      <span
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          fontSize: 13,
                          color: "var(--amber)",
                        }}
                      >
                        {h.streak}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── This-week bar chart ──────────────────────────────────────────────────────
function ThisWeekChart({
  data,
  today,
  totalHabits,
}: {
  data: { date: string; completed: number; total: number }[];
  today: string;
  totalHabits: number;
}) {
  const chartData = data.map((d) => ({
    ...d,
    pct: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    label: dayOfWeek(d.date).toUpperCase(),
    isToday: d.date === today,
  }));

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: (typeof chartData)[0] }[];
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
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>
          {d.label}
        </div>
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            fontSize: 22,
            color: d.pct === 100 ? "var(--green)" : "var(--text)",
            lineHeight: 1,
          }}
        >
          {d.pct}%
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
          {d.completed}/{d.total} habits
        </div>
      </div>
    );
  };

  return (
    <div className="panel" style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontFamily: '"Bebas Neue", cursive',
            fontSize: 16,
            letterSpacing: "0.14em",
            color: "var(--text)",
          }}
        >
          THIS WEEK
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
            color: "var(--text-muted)",
          }}
        >
          {totalHabits} habit{totalHabits !== 1 ? "s" : ""} tracked
        </span>
      </div>

      {totalHabits === 0 ? (
        <div
          style={{
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          Add habits to see your weekly pulse
        </div>
      ) : (
        <>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={32} barGap={0}>
                <XAxis
                  dataKey="label"
                  tick={({ x, y, payload }) => {
                    const d = chartData.find((c) => c.label === payload.value);
                    return (
                      <text
                        x={x}
                        y={y + 14}
                        textAnchor="middle"
                        fill={d?.isToday ? "var(--green)" : "var(--text-dim)"}
                        fontSize={10}
                        fontFamily='"JetBrains Mono", monospace'
                        fontWeight={d?.isToday ? 700 : 400}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "var(--bg-elevated)", radius: 4 }}
                />
                <Bar dataKey="pct" radius={[4, 4, 2, 2]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={
                        entry.isToday
                          ? "var(--green)"
                          : entry.pct === 100
                          ? "#bbf7d0"
                          : entry.pct > 0
                          ? "#d1fae5"
                          : "var(--bg-elevated)"
                      }
                      stroke={entry.isToday ? "var(--green)" : "none"}
                      strokeWidth={0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Day labels with dots */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: 10,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
            }}
          >
            {chartData.map((d) => (
              <div
                key={d.date}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 14,
                    fontWeight: 700,
                    color:
                      d.pct === 100
                        ? "var(--green)"
                        : d.pct > 0
                        ? "var(--text-muted)"
                        : "var(--text-dim)",
                  }}
                >
                  {d.pct > 0 ? `${d.pct}` : "—"}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: d.isToday ? "var(--green)" : "var(--text-dim)",
                    fontWeight: d.isToday ? 700 : 400,
                    letterSpacing: "0.06em",
                  }}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Segmented milestone track ────────────────────────────────────────────────
function MilestoneTrack({ total, done }: { total: number; done: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: i < done ? "var(--green)" : "var(--bg-elevated)",
            border: `1px solid ${i < done ? "var(--green-dim-border)" : "var(--border)"}`,
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}
