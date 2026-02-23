import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSessions,
  createSession,
  deleteSession,
  addSets,
  getExercises,
  type WorkoutSession,
} from "../lib/api";
import { formatDate } from "../lib/utils";
import {
  Plus,
  Trash2,
  Trophy,
  ChevronDown,
  ChevronRight,
  X,
  Dumbbell,
} from "lucide-react";

export default function Workout() {
  const qc = useQueryClient();
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionNotes, setSessionNotes] = useState("");

  const { data: sessions = [] } = useQuery({ queryKey: ["sessions"], queryFn: getSessions });

  const createMut = useMutation({
    mutationFn: () => createSession({ date: sessionDate, notes: sessionNotes || undefined }),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setActiveSession(session.id);
      setShowNewSession(false);
      setSessionNotes("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 48, color: "var(--text)", letterSpacing: "0.08em", lineHeight: 1 }}>
            TRAINING LOG
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginTop: 4 }}>
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} logged
          </div>
        </div>
        <button className="btn btn-green" onClick={() => setShowNewSession(true)}>
          <Plus size={14} /> New Session
        </button>
      </div>

      {sessions.length === 0 && (
        <div className="panel" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💪</div>
          <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, letterSpacing: "0.1em", marginBottom: 8 }}>
            No sessions yet
          </div>
          <div style={{ fontSize: 13 }}>Log your first training session above.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isActive={activeSession === session.id}
            expanded={expandedSession === session.id}
            onExpand={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
            onActivate={() => setActiveSession(activeSession === session.id ? null : session.id)}
            onDelete={() => {
              if (activeSession === session.id) setActiveSession(null);
              deleteMut.mutate(session.id);
            }}
          />
        ))}
      </div>

      {/* New Session Modal */}
      {showNewSession && (
        <div className="modal-backdrop" onClick={() => setShowNewSession(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 24, letterSpacing: "0.1em" }}>
                New Session
              </div>
              <button onClick={() => setShowNewSession(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Date
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Notes (optional)
                </label>
                <input
                  placeholder="e.g. Push day, felt strong..."
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewSession(false)}>
                  Cancel
                </button>
                <button className="btn btn-green" style={{ flex: 2 }} onClick={() => createMut.mutate()}>
                  <Plus size={14} /> Start Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  isActive,
  expanded,
  onExpand,
  onActivate,
  onDelete,
}: {
  session: WorkoutSession;
  isActive: boolean;
  expanded: boolean;
  onExpand: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [exerciseName, setExerciseName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [sets, setSets] = useState<{ reps: string; weight: string }[]>([{ reps: "", weight: "" }]);
  const [showAddExercise, setShowAddExercise] = useState(false);

  const { data: exercises = [] } = useQuery({ queryKey: ["exercises"], queryFn: getExercises });

  const addSetsMut = useMutation({
    mutationFn: () =>
      addSets(session.id, {
        exercise_name: exerciseName,
        muscle_group: muscleGroup || undefined,
        sets: sets
          .filter((s) => s.reps && s.weight)
          .map((s) => ({ reps: parseInt(s.reps), weight_kg: parseFloat(s.weight) })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setExerciseName("");
      setMuscleGroup("");
      setSets([{ reps: "", weight: "" }]);
      setShowAddExercise(false);
    },
  });

  return (
    <div
      className="panel"
      style={{
        borderColor: isActive ? "var(--green-dim-border)" : "var(--border)",
        overflow: "hidden",
        animation: "fadeIn 0.3s ease forwards",
        opacity: 0,
      }}
    >
      {/* Session header */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            {formatDate(session.date)}
          </div>
          {session.notes && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{session.notes}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {session.prCount > 0 && (
            <span className="pr-badge">
              <Trophy size={9} /> {session.prCount} PR{session.prCount > 1 ? "s" : ""}
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "JetBrains Mono" }}>
            {session.totalSets} sets
          </span>
          <button
            onClick={onActivate}
            style={{
              background: isActive ? "var(--green-dim)" : "transparent",
              border: `1px solid ${isActive ? "var(--green-dim-border)" : "var(--border)"}`,
              borderRadius: 5,
              color: isActive ? "var(--green)" : "var(--text-muted)",
              cursor: "pointer",
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            <Dumbbell size={12} style={{ display: "inline", marginRight: 4 }} />
            {isActive ? "Logging..." : "Log"}
          </button>
          <button onClick={onExpand} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 4 }}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 4 }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded exercises list */}
      {expanded && session.exercises.length > 0 && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          {session.exercises.map((ex) => (
            <div key={ex.name} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ex.name}</span>
                {ex.hasPR && <span className="pr-badge"><Trophy size={9} /> PR</span>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ex.sets.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 5,
                      background: s.is_pr ? "rgba(251,146,60,0.1)" : "var(--bg-elevated)",
                      border: `1px solid ${s.is_pr ? "rgba(251,146,60,0.3)" : "var(--border)"}`,
                      fontSize: 12,
                      fontFamily: "JetBrains Mono",
                      color: s.is_pr ? "var(--amber)" : "var(--text-muted)",
                    }}
                  >
                    {s.reps}×{s.weight_kg}kg
                    {s.is_pr && " ★"}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active: add exercise form */}
      {isActive && (
        <div style={{ borderTop: "1px solid var(--green-dim-border)", padding: 16, background: "var(--green-dim)" }}>
          {!showAddExercise ? (
            <button
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "center", borderStyle: "dashed" }}
              onClick={() => setShowAddExercise(true)}
            >
              <Plus size={14} /> Add Exercise
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                    Exercise
                  </label>
                  <input
                    list="exercise-suggestions"
                    placeholder="Bench Press..."
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    autoFocus
                  />
                  <datalist id="exercise-suggestions">
                    {exercises.map((e) => (
                      <option key={e.id} value={e.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                    Muscle Group
                  </label>
                  <input
                    placeholder="Chest, Back..."
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Sets
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sets.map((set, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "JetBrains Mono", width: 20 }}>
                        {i + 1}
                      </span>
                      <input
                        style={{ width: 80 }}
                        placeholder="Reps"
                        type="number"
                        min="1"
                        value={set.reps}
                        onChange={(e) => {
                          const updated = [...sets];
                          updated[i].reps = e.target.value;
                          setSets(updated);
                        }}
                      />
                      <input
                        style={{ width: 100 }}
                        placeholder="Weight (kg)"
                        type="number"
                        step="0.5"
                        min="0"
                        value={set.weight}
                        onChange={(e) => {
                          const updated = [...sets];
                          updated[i].weight = e.target.value;
                          setSets(updated);
                        }}
                      />
                      {sets.length > 1 && (
                        <button
                          onClick={() => setSets(sets.filter((_, j) => j !== i))}
                          style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 4 }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: 8, fontSize: 12, padding: "5px 10px" }}
                  onClick={() => setSets([...sets, { reps: "", weight: "" }])}
                >
                  <Plus size={11} /> Add Set
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowAddExercise(false);
                    setExerciseName("");
                    setMuscleGroup("");
                    setSets([{ reps: "", weight: "" }]);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-green"
                  style={{ flex: 2 }}
                  disabled={
                    !exerciseName.trim() ||
                    sets.filter((s) => s.reps && s.weight).length === 0 ||
                    addSetsMut.isPending
                  }
                  onClick={() => addSetsMut.mutate()}
                >
                  Save Exercise
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
