import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
  type Goal,
} from "../lib/api";
import { Plus, Trash2, CheckCircle2, Circle, X, Target, Flag } from "lucide-react";
import { formatDate } from "../lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "var(--green)",
  completed: "var(--green-mid)",
  abandoned: "var(--text-dim)",
};

const STATUS_BG: Record<string, string> = {
  active: "var(--green-dim)",
  completed: "var(--green-dim)",
  abandoned: "rgba(255,255,255,0.04)",
};

export default function Goals() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");

  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: getGoals });

  const createMut = useMutation({
    mutationFn: () =>
      createGoal({ title, description: description || undefined, target_date: targetDate || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setTargetDate("");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof updateGoal>[1] }) =>
      updateGoal(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const filtered = goals.filter((g) => {
    if (filter === "all") return true;
    if (filter === "active") return g.status === "active";
    if (filter === "completed") return g.status === "completed";
    return true;
  });

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 48, color: "var(--text)", letterSpacing: "0.08em", lineHeight: 1 }}>
            MISSIONS
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginTop: 4 }}>
            {goals.filter((g) => g.status === "active").length} active &nbsp;·&nbsp;{" "}
            {goals.filter((g) => g.status === "completed").length} completed
          </div>
        </div>
        <button className="btn btn-green" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New Mission
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {(["active", "all", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px",
              borderRadius: 5,
              border: "1px solid",
              borderColor: filter === f ? "var(--green-dim-border)" : "var(--border)",
              background: filter === f ? "var(--green-dim)" : "transparent",
              color: filter === f ? "var(--green)" : "var(--text-muted)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "capitalize",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="panel" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, letterSpacing: "0.1em", marginBottom: 8 }}>
            No missions here
          </div>
          <div style={{ fontSize: 13 }}>
            {filter === "active" ? "Set a goal and break it into milestones." : "Nothing to show."}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((goal, i) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            animDelay={i * 60}
            onStatusChange={(status) => updateMut.mutate({ id: goal.id, body: { status } })}
            onDelete={() => deleteMut.mutate(goal.id)}
          />
        ))}
      </div>

      {/* New Goal Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 24, letterSpacing: "0.1em" }}>
                New Mission
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Mission Title
                </label>
                <input
                  autoFocus
                  placeholder="e.g. Run a 5K, Deadlift 140kg..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && title.trim() && createMut.mutate()}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Description (optional)
                </label>
                <textarea
                  placeholder="Why this matters, context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: "vertical", minHeight: 70 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Target Date (optional)
                </label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-green"
                  style={{ flex: 2 }}
                  disabled={!title.trim() || createMut.isPending}
                  onClick={() => createMut.mutate()}
                >
                  <Plus size={14} /> Create Mission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  animDelay,
  onStatusChange,
  onDelete,
}: {
  goal: Goal;
  animDelay: number;
  onStatusChange: (s: string) => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [newMilestone, setNewMilestone] = useState("");
  const [showMilestoneInput, setShowMilestoneInput] = useState(false);

  const addMilestoneMut = useMutation({
    mutationFn: () => addMilestone(goal.id, newMilestone),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setNewMilestone("");
      setShowMilestoneInput(false);
    },
  });

  const toggleMut = useMutation({
    mutationFn: (milestoneId: number) => toggleMilestone(goal.id, milestoneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMilestoneMut = useMutation({
    mutationFn: (milestoneId: number) => deleteMilestone(goal.id, milestoneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  return (
    <div
      className="panel"
      style={{
        padding: 20,
        borderColor: goal.status === "active" ? "var(--green-dim-border)" : "var(--border)",
        animation: "fadeIn 0.3s ease forwards",
        animationDelay: `${animDelay}ms`,
        opacity: 0,
      }}
    >
      {/* Goal header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: STATUS_BG[goal.status],
            border: `1px solid ${STATUS_COLORS[goal.status]}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Target size={16} color={STATUS_COLORS[goal.status]} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{goal.title}</span>
            <span
              className="tag"
              style={{
                background: STATUS_BG[goal.status],
                color: STATUS_COLORS[goal.status],
                border: `1px solid ${STATUS_COLORS[goal.status]}30`,
              }}
            >
              {goal.status}
            </span>
          </div>
          {goal.description && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{goal.description}</div>
          )}
          {goal.target_date && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-dim)" }}>
              <Flag size={10} />
              {formatDate(goal.target_date)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {goal.status === "active" && (
            <button
              onClick={() => onStatusChange("completed")}
              style={{
                padding: "4px 10px",
                borderRadius: 5,
                border: "1px solid var(--green-dim-border)",
                background: "var(--green-dim)",
                color: "var(--green-mid)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              ✓ Done
            </button>
          )}
          {goal.status === "completed" && (
            <button
              onClick={() => onStatusChange("active")}
              style={{
                padding: "4px 10px",
                borderRadius: 5,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Reopen
            </button>
          )}
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 4 }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {goal.milestones.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11, color: "var(--text-dim)" }}>
            <span>{goal.milestones.filter((m) => m.completed_at).length} / {goal.milestones.length} milestones</span>
            <span style={{ fontFamily: "JetBrains Mono", color: goal.progress === 100 ? "var(--green-mid)" : "var(--green)" }}>
              {goal.progress}%
            </span>
          </div>
          <div className="progress-bar" style={{ height: 4 }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${goal.progress}%`,
                background: goal.progress === 100
                  ? "var(--green-mid)"
                  : `linear-gradient(90deg, var(--green) 0%, var(--green-bright) 100%)`,
              }}
            />
          </div>
          {/* Milestone dots */}
          <div style={{ display: "flex", gap: 3, marginTop: 8, flexWrap: "wrap" }}>
            {goal.milestones.map((m) => (
              <div
                key={m.id}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                }}
              >
                <button
                  onClick={() => toggleMut.mutate(m.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: m.completed_at ? "var(--green-mid)" : "var(--text-dim)",
                    display: "flex",
                    flexShrink: 0,
                  }}
                >
                  {m.completed_at ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: m.completed_at ? "var(--text-muted)" : "var(--text)",
                    textDecoration: m.completed_at ? "line-through" : "none",
                    flex: 1,
                  }}
                >
                  {m.title}
                </span>
                <button
                  onClick={() => deleteMilestoneMut.mutate(m.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 2, opacity: 0.5 }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add milestone */}
      {goal.status === "active" && (
        showMilestoneInput ? (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              autoFocus
              placeholder="Milestone title..."
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newMilestone.trim()) addMilestoneMut.mutate();
                if (e.key === "Escape") { setShowMilestoneInput(false); setNewMilestone(""); }
              }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-green"
              style={{ padding: "7px 14px" }}
              disabled={!newMilestone.trim()}
              onClick={() => addMilestoneMut.mutate()}
            >
              Add
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "7px 10px" }}
              onClick={() => { setShowMilestoneInput(false); setNewMilestone(""); }}
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "5px 10px", borderStyle: "dashed" }}
            onClick={() => setShowMilestoneInput(true)}
          >
            <Plus size={12} /> Add Milestone
          </button>
        )
      )}
    </div>
  );
}
