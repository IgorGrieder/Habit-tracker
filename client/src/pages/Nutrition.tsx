import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNutrition, getNutritionWeek, saveNutrition } from "../lib/api";
import { todayStr, dayOfWeek, formatShortDate } from "../lib/utils";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Save } from "lucide-react";

const TARGETS = { calories: 2500, protein_g: 160, carbs_g: 300, fat_g: 80 };

export default function Nutrition() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const { data: entry } = useQuery({
    queryKey: ["nutrition", selectedDate],
    queryFn: () => getNutrition(selectedDate),
  });

  const { data: week = [] } = useQuery({
    queryKey: ["nutrition-week"],
    queryFn: getNutritionWeek,
  });

  const [form, setForm] = useState({ calories: "", protein: "", carbs: "", fat: "", notes: "" });
  const [saved, setSaved] = useState(false);

  // Sync form when entry or selected date changes
  useEffect(() => {
    if (entry) {
      setForm({
        calories: entry.calories > 0 ? String(entry.calories) : "",
        protein: entry.protein_g > 0 ? String(entry.protein_g) : "",
        carbs: entry.carbs_g > 0 ? String(entry.carbs_g) : "",
        fat: entry.fat_g > 0 ? String(entry.fat_g) : "",
        notes: entry.notes ?? "",
      });
    } else {
      setForm({ calories: "", protein: "", carbs: "", fat: "", notes: "" });
    }
  }, [entry, selectedDate]);

  const saveMut = useMutation({
    mutationFn: () =>
      saveNutrition(selectedDate, {
        calories: parseFloat(form.calories) || 0,
        protein_g: parseFloat(form.protein) || 0,
        carbs_g: parseFloat(form.carbs) || 0,
        fat_g: parseFloat(form.fat) || 0,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition"] });
      qc.invalidateQueries({ queryKey: ["nutrition-week"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const cal = parseFloat(form.calories) || 0;
  const protein = parseFloat(form.protein) || 0;
  const carbs = parseFloat(form.carbs) || 0;
  const fat = parseFloat(form.fat) || 0;

  const macroCalories = protein * 4 + carbs * 4 + fat * 9;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 48, color: "var(--text)", letterSpacing: "0.08em", lineHeight: 1 }}>
          SUPPLY CHAIN
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginTop: 4 }}>
          Nutrition Tracking
        </div>
      </div>

      {/* Week chart */}
      <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
          7-Day Calories
        </div>
        <div style={{ height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week} barSize={28}>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => dayOfWeek(d).toUpperCase()}
                tick={{ fill: "var(--text-dim)", fontSize: 9, fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px" }}>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}>{formatShortDate(d.date)}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "var(--green)" }}>
                        {d.calories} kcal
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="calories" radius={[3, 3, 0, 0]}>
                {week.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.date === selectedDate
                        ? "var(--green)"
                        : entry.calories >= TARGETS.calories
                        ? "var(--green-mid)"
                        : "var(--bg-elevated)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Date selector + entry form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        {/* Left: form */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Log Entry
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSaved(false);
              }}
              style={{ width: "auto", fontSize: 11, padding: "4px 8px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MacroInput label="Calories" unit="kcal" value={form.calories} onChange={(v) => setForm({ ...form, calories: v })} target={TARGETS.calories} color="var(--blue)" />
            <MacroInput label="Protein" unit="g" value={form.protein} onChange={(v) => setForm({ ...form, protein: v })} target={TARGETS.protein_g} color="var(--red)" />
            <MacroInput label="Carbs" unit="g" value={form.carbs} onChange={(v) => setForm({ ...form, carbs: v })} target={TARGETS.carbs_g} color="var(--green)" />
            <MacroInput label="Fat" unit="g" value={form.fat} onChange={(v) => setForm({ ...form, fat: v })} target={TARGETS.fat_g} color="var(--blue)" />

            <div>
              <label style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                Notes
              </label>
              <input
                placeholder="Meal notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              className="btn btn-green"
              style={{ marginTop: 4 }}
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
            >
              <Save size={13} />
              {saved ? "Saved!" : "Save Entry"}
            </button>
          </div>
        </div>

        {/* Right: summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Calorie ring-ish */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
              Today's Summary
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
              <span className="stat-number" style={{ fontSize: 40, color: cal >= TARGETS.calories ? "var(--green-mid)" : "var(--green)", lineHeight: 1 }}>
                {cal.toLocaleString()}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>/ {TARGETS.calories} kcal</span>
            </div>

            <div className="progress-bar" style={{ marginBottom: 16 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min((cal / TARGETS.calories) * 100, 100)}%`,
                  background: cal >= TARGETS.calories ? "var(--green-mid)" : "var(--green)",
                }}
              />
            </div>

            {[
              { label: "Protein", val: protein, target: TARGETS.protein_g, color: "var(--red)" },
              { label: "Carbs", val: carbs, target: TARGETS.carbs_g, color: "var(--green)" },
              { label: "Fat", val: fat, target: TARGETS.fat_g, color: "var(--blue)" },
            ].map(({ label, val, target, color }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontFamily: "JetBrains Mono", color }}>
                    {Math.round(val)}g <span style={{ color: "var(--text-dim)" }}>/ {target}g</span>
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min((val / target) * 100, 100)}%`,
                      background: color,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Macro breakdown */}
          {macroCalories > 0 && (
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
                Macro Split
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                {[
                  { pct: (protein * 4 / macroCalories) * 100, color: "var(--red)" },
                  { pct: (carbs * 4 / macroCalories) * 100, color: "var(--green)" },
                  { pct: (fat * 9 / macroCalories) * 100, color: "var(--blue)" },
                ].map(({ pct, color }, i) => (
                  <div key={i} style={{ flex: pct, background: color, opacity: 0.9 }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                {[
                  { label: "P", pct: protein * 4 / macroCalories * 100, color: "var(--red)" },
                  { label: "C", pct: carbs * 4 / macroCalories * 100, color: "var(--green)" },
                  { label: "F", pct: fat * 9 / macroCalories * 100, color: "var(--blue)" },
                ].map(({ label, pct, color }) => (
                  <span key={label} style={{ fontSize: 11, fontFamily: "JetBrains Mono", color }}>
                    {label}: {Math.round(pct)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MacroInput({
  label, unit, value, onChange, target, color,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  target: number;
  color: string;
}) {
  const num = parseFloat(value) || 0;
  const pct = Math.min((num / target) * 100, 100);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "baseline" }}>
        <label style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</label>
        <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "JetBrains Mono" }}>
          target: {target}{unit}
        </span>
      </div>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          min="0"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 36 }}
        />
        <span
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            color: "var(--text-dim)",
            pointerEvents: "none",
          }}
        >
          {unit}
        </span>
      </div>
      <div className="progress-bar" style={{ marginTop: 4 }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%`, background: color, opacity: 0.7 }}
        />
      </div>
    </div>
  );
}
