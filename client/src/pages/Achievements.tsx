import { useQuery } from "@tanstack/react-query";
import { getAchievements, type AchievementResult } from "../lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  milestone: "Milestones",
  streak: "Streaks",
  consistency: "Consistency",
};

const CATEGORY_ORDER = ["milestone", "streak", "consistency"];

function AchievementCard({ a }: { a: AchievementResult }) {
  const dateLabel = a.unlockedAt
    ? new Date(a.unlockedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 18px",
        borderRadius: "10px",
        border: a.unlocked
          ? "1.5px solid var(--green-dim-border)"
          : "1.5px solid var(--border)",
        background: a.unlocked ? "var(--green-dim)" : "var(--bg-panel)",
        filter: a.unlocked ? "none" : "grayscale(1)",
        opacity: a.unlocked ? 1 : 0.55,
        transition: "all 0.15s ease",
        animation: a.unlocked ? "achieveGlow 0.6s ease" : "none",
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: 28, lineHeight: 1, minWidth: 36, textAlign: "center" }}>
        {a.unlocked ? a.icon : "🔒"}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13.5px",
            fontWeight: 600,
            color: a.unlocked ? "var(--text)" : "var(--text-muted)",
            marginBottom: 2,
          }}
        >
          {a.title}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: a.unlocked ? "var(--text-muted)" : "var(--text-dim)",
            lineHeight: 1.4,
          }}
        >
          {a.desc}
        </div>
      </div>

      {/* Date badge */}
      {dateLabel && (
        <div
          style={{
            fontSize: "10px",
            fontFamily: '"JetBrains Mono", monospace',
            color: "var(--green)",
            background: "var(--bg)",
            border: "1px solid var(--green-dim-border)",
            borderRadius: "5px",
            padding: "3px 7px",
            whiteSpace: "nowrap",
          }}
        >
          {dateLabel}
        </div>
      )}
    </div>
  );
}

export default function Achievements() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["achievements"],
    queryFn: getAchievements,
    staleTime: 30_000,
  });

  const unlockedCount = data?.filter((a) => a.unlocked).length ?? 0;
  const total = data?.length ?? 15;

  const grouped = CATEGORY_ORDER.reduce<Record<string, AchievementResult[]>>(
    (acc, cat) => {
      acc[cat] = data?.filter((a) => a.category === cat) ?? [];
      return acc;
    },
    {}
  );

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "14px",
          marginBottom: "32px",
        }}
      >
        <h1
          style={{
            fontFamily: '"Bebas Neue", cursive',
            fontSize: 36,
            letterSpacing: "0.12em",
            color: "var(--text)",
            margin: 0,
          }}
        >
          ACHIEVEMENTS
        </h1>
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "12px",
            color: "var(--green)",
            background: "var(--green-dim)",
            border: "1px solid var(--green-dim-border)",
            borderRadius: "6px",
            padding: "3px 10px",
          }}
        >
          {unlockedCount} / {total}
        </div>
      </div>

      {isLoading && (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</div>
      )}
      {error && (
        <div style={{ color: "var(--red)", fontSize: 14 }}>
          Failed to load achievements.
        </div>
      )}

      {data && unlockedCount === 0 && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "10px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: "13px",
            marginBottom: "28px",
          }}
        >
          Start completing habits to unlock your first achievement.
        </div>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items?.length) return null;
        return (
          <section key={cat} style={{ marginBottom: "32px" }}>
            <div
              style={{
                fontSize: "10px",
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
                marginBottom: "10px",
              }}
            >
              {CATEGORY_LABELS[cat]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((a) => (
                <AchievementCard key={a.id} a={a} />
              ))}
            </div>
          </section>
        );
      })}

      <style>{`
        @keyframes achieveGlow {
          0%   { box-shadow: 0 0 0 0 var(--green-dim-border); }
          50%  { box-shadow: 0 0 16px 4px var(--green-dim-border); }
          100% { box-shadow: 0 0 0 0 var(--green-dim-border); }
        }
      `}</style>
    </div>
  );
}
