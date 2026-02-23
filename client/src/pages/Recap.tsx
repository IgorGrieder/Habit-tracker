import { useQuery } from "@tanstack/react-query";
import { getRecap, type RecapDayData } from "../lib/api";

function delta(current: number, previous: number) {
  const diff = current - previous;
  if (diff === 0) return null;
  const sign = diff > 0 ? "▲" : "▼";
  const color = diff > 0 ? "var(--green)" : "var(--red)";
  return (
    <span
      style={{
        fontSize: "11px",
        fontFamily: '"JetBrains Mono", monospace',
        color,
        marginLeft: 6,
      }}
    >
      {sign}
      {Math.abs(diff)}
      {"%"}
    </span>
  );
}

function StatCard({
  label,
  value,
  prevValue,
  suffix = "",
  isPercent = false,
}: {
  label: string;
  value: number;
  prevValue: number;
  suffix?: string;
  isPercent?: boolean;
}) {
  const d = isPercent ? delta(value, prevValue) : null;
  const rawDiff = value - prevValue;
  const nonPctDelta =
    !isPercent && rawDiff !== 0 ? (
      <span
        style={{
          fontSize: "11px",
          fontFamily: '"JetBrains Mono", monospace',
          color: rawDiff > 0 ? "var(--green)" : "var(--red)",
          marginLeft: 6,
        }}
      >
        {rawDiff > 0 ? "▲" : "▼"}
        {Math.abs(rawDiff)}
      </span>
    ) : null;

  return (
    <div
      style={{
        flex: 1,
        padding: "18px 20px",
        borderRadius: "10px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          {value}
          {suffix}
        </span>
        {isPercent ? d : nonPctDelta}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-dim)",
          marginTop: "4px",
        }}
      >
        last week: {prevValue}
        {suffix}
      </div>
    </div>
  );
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DayBar({ day, today }: { day: RecapDayData; today: string }) {
  const isToday = day.date === today;
  const label = DAY_LABELS[new Date(day.date + "T12:00:00Z").getUTCDay()];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {/* Bar container */}
      <div
        style={{
          width: "100%",
          height: "120px",
          background: "var(--bg)",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: `${day.pct}%`,
            background: isToday ? "var(--green)" : "var(--green-mid)",
            borderRadius: "4px 4px 0 0",
            transition: "height 0.3s ease",
          }}
        />
      </div>
      {/* Pct label */}
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "10px",
          color: isToday ? "var(--green)" : "var(--text-muted)",
          fontWeight: isToday ? 700 : 400,
        }}
      >
        {day.pct}%
      </div>
      {/* Day label */}
      <div
        style={{
          fontSize: "10px",
          color: isToday ? "var(--text)" : "var(--text-dim)",
          fontWeight: isToday ? 600 : 400,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Recap() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["recap"],
    queryFn: getRecap,
    staleTime: 60_000,
  });

  const today = new Date().toISOString().split("T")[0];

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const e = new Date(end + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${s} – ${e}`;
  };

  return (
    <div style={{ paddingBottom: "36px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontFamily: '"Bebas Neue", cursive',
            fontSize: 36,
            letterSpacing: "0.12em",
            color: "var(--text)",
            margin: "0 0 4px",
          }}
        >
          WEEKLY RECAP
        </h1>
        {data && (
          <div
            style={{
              fontSize: "12px",
              fontFamily: '"JetBrains Mono", monospace',
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
            }}
          >
            {formatDateRange(
              data.thisWeek.dateRange.start,
              data.thisWeek.dateRange.end
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</div>
      )}
      {error && (
        <div style={{ color: "var(--red)", fontSize: 14 }}>
          Failed to load recap.
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div style={{ display: "flex", gap: "14px", marginBottom: "28px" }}>
            <StatCard
              label="Avg Completion"
              value={data.thisWeek.habitPct}
              prevValue={data.lastWeek.habitPct}
              suffix="%"
              isPercent
            />
            <StatCard
              label="Perfect Days"
              value={data.thisWeek.perfectDays}
              prevValue={data.lastWeek.perfectDays}
            />
            <StatCard
              label="Total Check-offs"
              value={data.thisWeek.totalCompletions}
              prevValue={data.lastWeek.totalCompletions}
            />
          </div>

          {/* Day-by-day bar chart */}
          <div
            style={{
              padding: "20px",
              borderRadius: "10px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
                marginBottom: "16px",
              }}
            >
              Day-by-Day Completion
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              {data.thisWeek.perDay.map((day) => (
                <DayBar key={day.date} day={day} today={today} />
              ))}
            </div>
          </div>

          {/* Per-habit breakdown */}
          {data.habitBreakdown.length > 0 && (
            <div
              style={{
                padding: "20px",
                borderRadius: "10px",
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: '"JetBrains Mono", monospace',
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  marginBottom: "16px",
                }}
              >
                Habit Breakdown
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {data.habitBreakdown.map((h) => (
                  <div key={h.name} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* Icon + name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        minWidth: "160px",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{h.icon}</span>
                      <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>
                        {h.name}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div
                      style={{
                        flex: 1,
                        height: "8px",
                        borderRadius: "4px",
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${h.rate}%`,
                          height: "100%",
                          background: h.color,
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                    {/* Stats */}
                    <div
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        minWidth: "70px",
                        textAlign: "right",
                      }}
                    >
                      {h.completions}/7 · {h.rate}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streak callout */}
          {data.topStreak && data.topStreak.streak > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px 20px",
                borderRadius: "10px",
                background: "var(--bg-panel)",
                border: "1px solid var(--amber)",
                boxShadow: "0 0 0 1px rgba(217,119,6,0.08)",
              }}
            >
              <span style={{ fontSize: 22 }}>🔥</span>
              <div>
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {data.topStreak.icon} {data.topStreak.name}
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "13px",
                    color: "var(--amber)",
                  }}
                >
                  {data.topStreak.streak}-day streak
                </span>
              </div>
            </div>
          )}

          {data.habitBreakdown.length === 0 && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "10px",
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: "13px",
              }}
            >
              No habits tracked yet. Add some habits to see your weekly recap.
            </div>
          )}
        </>
      )}
    </div>
  );
}
