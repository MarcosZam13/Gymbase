// page.tsx — Dashboard de progreso personal: métricas, gráficas, PRs, fotos y comparativa

import { getMySnapshots } from "@/actions/progress.actions";
import { getProgressChartData } from "@/actions/progress.actions";
import { getMyTopPRs } from "@/actions/workout.actions";
import { HealthChartCard } from "@/components/gym/health/HealthChartCard";
import { TrendingUp, TrendingDown, Minus, Dumbbell } from "lucide-react";
import Link from "next/link";
import { themeConfig } from "@/lib/theme";

export default async function PortalProgressPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_health_metrics) return null;

  const [snapshots, chartData, topPRs] = await Promise.all([
    themeConfig.features.gym_health_metrics ? getMySnapshots(50) : Promise.resolve([]),
    themeConfig.features.gym_health_metrics ? getProgressChartData(50) : Promise.resolve([]),
    themeConfig.features.gym_routines ? getMyTopPRs(6) : Promise.resolve([]),
  ]);

  // snapshots viene desc (más reciente primero)
  const latestSnapshot = snapshots[0] ?? null;
  const firstSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 1] : null;

  // Deltas totales desde la primera medición
  const weightDelta = latestSnapshot?.weight_kg != null && firstSnapshot?.weight_kg != null
    ? +(latestSnapshot.weight_kg - firstSnapshot.weight_kg).toFixed(1)
    : null;
  const fatDelta = latestSnapshot?.body_fat_pct != null && firstSnapshot?.body_fat_pct != null
    ? +(latestSnapshot.body_fat_pct - firstSnapshot.body_fat_pct).toFixed(1)
    : null;
  const muscleDelta = latestSnapshot?.muscle_mass_kg != null && firstSnapshot?.muscle_mass_kg != null
    ? +(latestSnapshot.muscle_mass_kg - firstSnapshot.muscle_mass_kg).toFixed(1)
    : null;

  // Puntos para cada gráfica — cronológico (asc)
  const weightPoints = chartData
    .filter((d) => d.weight_kg != null)
    .map((d) => ({ date: d.date, value: d.weight_kg! }));
  const fatPoints = chartData
    .filter((d) => d.body_fat_pct != null)
    .map((d) => ({ date: d.date, value: d.body_fat_pct! }));
  const musclePoints = chartData
    .filter((d) => d.muscle_mass_kg != null)
    .map((d) => ({ date: d.date, value: d.muscle_mass_kg! }));

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-4">

      {/* ── ENCABEZADO ──────────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-extrabold"
          style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
        >
          Mi Progreso
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--gym-text-muted)" }}>
          {snapshots.length > 0
            ? `${snapshots.length} medición${snapshots.length !== 1 ? "es" : ""} registrada${snapshots.length !== 1 ? "s" : ""}`
            : "Aún no hay mediciones registradas"}
        </p>
      </div>

      {/* ── SECCIÓN 1: PILLS DE MÉTRICAS ACTUALES ───────────────────────────────── */}
      {themeConfig.features.gym_health_metrics && latestSnapshot && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Peso",    value: latestSnapshot.weight_kg,      unit: "kg", delta: weightDelta, positiveIsGood: false },
            { label: "Grasa",   value: latestSnapshot.body_fat_pct,   unit: "%",  delta: fatDelta,    positiveIsGood: false },
            { label: "Músculo", value: latestSnapshot.muscle_mass_kg, unit: "kg", delta: muscleDelta, positiveIsGood: true },
          ]
            .filter((m) => m.value != null)
            .map((m) => {
              const deltaColor =
                m.delta == null
                  ? "var(--gym-text-ghost)"
                  : m.positiveIsGood
                  ? m.delta > 0 ? "#22C55E" : "#EF4444"
                  : m.delta < 0 ? "#22C55E" : "#EF4444";

              return (
                <div
                  key={m.label}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
                >
                  <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--gym-text-ghost)" }}>
                    {m.label}
                  </p>
                  <p
                    className="text-2xl font-extrabold leading-none"
                    style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
                  >
                    {m.value!.toFixed(m.unit === "%" ? 1 : 1)}
                    {m.unit && (
                      <span className="text-sm font-normal ml-0.5" style={{ color: "var(--gym-text-ghost)" }}>
                        {m.unit}
                      </span>
                    )}
                  </p>
                  {m.delta != null ? (
                    <div className="flex items-center gap-0.5 mt-1.5" style={{ color: deltaColor }}>
                      {m.delta > 0
                        ? <TrendingUp className="w-3 h-3" />
                        : m.delta < 0
                        ? <TrendingDown className="w-3 h-3" />
                        : <Minus className="w-3 h-3" />}
                      <span className="text-[10px]">
                        {m.delta > 0 ? "+" : ""}{m.delta} {m.unit}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[9px] mt-1.5" style={{ color: "var(--gym-text-ghost)" }}>
                      sin cambio
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ── SECCIÓN 2: GRÁFICAS EXPANDIBLES ─────────────────────────────────────── */}
      {themeConfig.features.gym_health_metrics && (
        weightPoints.length >= 2 || fatPoints.length >= 2 || musclePoints.length >= 2
      ) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {weightPoints.length >= 2 && (
            <HealthChartCard
              points={weightPoints}
              color="var(--gym-accent)"
              unit="kg"
              label="peso"
              title="Peso"
            />
          )}
          {fatPoints.length >= 2 && (
            <HealthChartCard
              points={fatPoints}
              color="#EAB308"
              unit="%"
              label="grasa"
              title="Grasa corporal"
            />
          )}
          {musclePoints.length >= 2 && (
            <HealthChartCard
              points={musclePoints}
              color="#22C55E"
              unit="kg"
              label="musculo"
              title="Masa muscular"
            />
          )}
        </div>
      )}

      {/* ── SECCIÓN 3: TIMELINE DE SNAPSHOTS ─────────────────────────────────────── */}
      {themeConfig.features.gym_health_metrics && snapshots.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--gym-border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
              Historial de mediciones
            </p>
          </div>

          {/* Cabecera de la tabla */}
          <div
            className="grid px-5 py-2 text-[9px] uppercase tracking-wider"
            style={{
              gridTemplateColumns: "1fr 80px 80px 80px",
              color: "var(--gym-text-ghost)",
              borderBottom: "1px solid #111",
            }}
          >
            <span>Fecha</span>
            <span className="text-right">Peso</span>
            <span className="text-right">Grasa</span>
            <span className="text-right">Músculo</span>
          </div>

          {/* Filas — máx 15 snapshots, más reciente primero */}
          <div className="divide-y" style={{ borderColor: "#111" }}>
            {snapshots.slice(0, 15).map((snap, idx) => {
              const prev = snapshots[idx + 1] ?? null;

              const wDelta = snap.weight_kg != null && prev?.weight_kg != null
                ? +(snap.weight_kg - prev.weight_kg).toFixed(1) : null;
              const fDelta = snap.body_fat_pct != null && prev?.body_fat_pct != null
                ? +(snap.body_fat_pct - prev.body_fat_pct).toFixed(1) : null;
              const mDelta = snap.muscle_mass_kg != null && prev?.muscle_mass_kg != null
                ? +(snap.muscle_mass_kg - prev.muscle_mass_kg).toFixed(1) : null;

              return (
                <div
                  key={snap.id}
                  className="grid px-5 py-3"
                  style={{ gridTemplateColumns: "1fr 80px 80px 80px" }}
                >
                  {/* Fecha */}
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: "var(--gym-text-primary)" }}>
                      {new Date(snap.recorded_at).toLocaleDateString("es-CR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {snap.notes && (
                      <p className="text-[9px] mt-0.5 line-clamp-1" style={{ color: "var(--gym-text-ghost)" }}>
                        {snap.notes}
                      </p>
                    )}
                  </div>

                  {/* Peso */}
                  <MetricCell value={snap.weight_kg} unit="kg" delta={wDelta} positiveIsGood={false} />

                  {/* Grasa */}
                  <MetricCell value={snap.body_fat_pct} unit="%" delta={fDelta} positiveIsGood={false} />

                  {/* Músculo */}
                  <MetricCell value={snap.muscle_mass_kg} unit="kg" delta={mDelta} positiveIsGood={true} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECCIÓN 4: MIS MEJORES MARCAS (PRs por peso máximo) ──────────────────── */}
      {themeConfig.features.gym_routines && topPRs.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "var(--gym-border)" }}
          >
            <div className="flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5" style={{ color: "var(--gym-accent)" }} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
                Mis mejores marcas
              </p>
            </div>
            <Link
              href="/portal/routines/strength"
              className="text-[10px] transition-colors"
              style={{ color: "var(--gym-text-ghost)" }}
            >
              Ver todos mis PRs →
            </Link>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {topPRs.map((pr) => {
              const exercise = pr.exercise as { name: string; muscle_group: string | null } | undefined;
              const MUSCLE_LABELS: Record<string, string> = {
                chest: "Pecho", back: "Espalda", shoulders: "Hombros",
                biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
                quads: "Cuádriceps", hamstrings: "Femorales", glutes: "Glúteos",
                calves: "Gemelos", core: "Core", full_body: "Cuerpo completo",
              };
              return (
                <div
                  key={pr.id}
                  className="rounded-xl p-3"
                  style={{ backgroundColor: "var(--gym-bg-elevated, #161616)", border: "1px solid var(--gym-border)" }}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <p className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: "var(--gym-text-primary)" }}>
                      {exercise?.name ?? "Ejercicio"}
                    </p>
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: "var(--gym-accent-dim)", color: "var(--gym-accent)", border: "1px solid var(--gym-accent-dim)" }}
                    >
                      PR
                    </span>
                  </div>
                  {exercise?.muscle_group && (
                    <p className="text-[9px] mb-1.5" style={{ color: "var(--gym-text-ghost)" }}>
                      {MUSCLE_LABELS[exercise.muscle_group] ?? exercise.muscle_group}
                    </p>
                  )}
                  <p className="text-[20px] font-extrabold leading-none" style={{ color: "var(--gym-accent)", fontFamily: "var(--font-barlow)" }}>
                    {pr.max_weight} <span className="text-[12px] font-normal" style={{ color: "var(--gym-text-ghost)" }}>kg</span>
                  </p>
                  <p className="text-[9px] mt-1" style={{ color: "var(--gym-text-ghost)" }}>
                    {new Date(pr.achieved_at).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

// Celda de métrica individual con delta — reutilizable en la tabla
function MetricCell({
  value,
  unit,
  delta,
  positiveIsGood,
}: {
  value: number | null;
  unit: string;
  delta: number | null;
  positiveIsGood: boolean;
}): React.ReactNode {
  if (value == null) {
    return <div className="text-right text-[11px]" style={{ color: "#2a2a2a" }}>—</div>;
  }

  const deltaColor =
    delta == null ? "var(--gym-text-ghost)"
    : positiveIsGood
    ? delta > 0 ? "#22C55E" : "#EF4444"
    : delta < 0 ? "#22C55E" : "#EF4444";

  return (
    <div className="text-right">
      <p className="text-[12px] font-medium" style={{ color: "var(--gym-text-primary)" }}>
        {value.toFixed(1)}<span className="text-[9px] ml-0.5" style={{ color: "var(--gym-text-ghost)" }}>{unit}</span>
      </p>
      {delta != null && delta !== 0 && (
        <p className="text-[9px]" style={{ color: deltaColor }}>
          {delta > 0 ? "+" : ""}{delta}
        </p>
      )}
    </div>
  );
}
