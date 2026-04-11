// page.tsx — Dashboard personal del miembro: QR, membresía, rutina, progreso físico y fotos

import { getCurrentUser } from "@/lib/supabase/server";
import { getMyQR, getMyOpenCheckin, getMyAttendanceLogs } from "@/actions/checkin.actions";
import { getUserSubscription } from "@/actions/payment.actions";
import { getMyRoutine } from "@/actions/routine.actions";
import { getMySnapshots, getMyProgressPhotos } from "@/actions/progress.actions";
import { getProgressChartData } from "@/actions/progress.actions";
import { QRDisplay } from "@/components/gym/checkin/QRDisplay";
import { MiniLineChart } from "@/components/gym/health/MiniLineChart";
import { MemberProgressPhotoUpload } from "@/components/gym/health/MemberProgressPhotoUpload";
import { signOut } from "@core/actions/auth.actions";
import {
  CheckCircle,
  Clock,
  LogOut,
  Dumbbell,
  ArrowRight,
  TrendingUp,
  CalendarDays,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { themeConfig } from "@/lib/theme";

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  legs: "Piernas",
  glutes: "Glúteos",
  core: "Core",
  cardio: "Cardio",
  full_body: "Cuerpo completo",
  forearms: "Antebrazos",
  calves: "Pantorrillas",
  hamstrings: "Isquiotibiales",
  quadriceps: "Cuádriceps",
};

export default async function ProfilePage(): Promise<React.ReactNode> {
  // Obtener todos los datos en paralelo
  const [
    profile,
    qrData,
    openCheckin,
    subscription,
    memberRoutine,
    snapshots,
    weightChartData,
    progressPhotos,
    attendanceLogs,
  ] = await Promise.all([
    getCurrentUser(),
    themeConfig.features.gym_qr_checkin ? getMyQR() : Promise.resolve(null),
    themeConfig.features.gym_qr_checkin ? getMyOpenCheckin() : Promise.resolve(null),
    getUserSubscription(),
    themeConfig.features.gym_routines ? getMyRoutine() : Promise.resolve(null),
    themeConfig.features.gym_health_metrics ? getMySnapshots(10) : Promise.resolve([]),
    themeConfig.features.gym_health_metrics ? getProgressChartData(20) : Promise.resolve([]),
    themeConfig.features.gym_progress ? getMyProgressPhotos() : Promise.resolve([]),
    themeConfig.features.gym_qr_checkin ? getMyAttendanceLogs(30) : Promise.resolve([]),
  ]);

  // ─── Datos de membresía ────────────────────────────────────────────────────────
  const today = new Date();
  const starts = subscription?.starts_at ? new Date(subscription.starts_at) : null;
  const expires = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const totalDays = starts && expires
    ? Math.max(1, Math.round((expires.getTime() - starts.getTime()) / 86_400_000))
    : null;
  const daysLeft = expires ? Math.max(0, Math.round((expires.getTime() - today.getTime()) / 86_400_000)) : null;
  const daysUsed = totalDays != null && daysLeft != null ? totalDays - daysLeft : null;
  const progressPct = totalDays != null && daysUsed != null ? Math.min(100, Math.round((daysUsed / totalDays) * 100)) : null;
  const isExpired = subscription?.status === "expired" || (daysLeft != null && daysLeft <= 0);
  const isExpiringSoon = !isExpired && daysLeft != null && daysLeft <= 7;

  const membershipBarColor = isExpired ? "#EF4444" : isExpiringSoon ? "#EAB308" : "#FF5E14";

  // ─── Datos de salud ────────────────────────────────────────────────────────────
  // snapshots vienen en orden desc (más reciente primero)
  const latestSnapshot = snapshots[0] ?? null;
  const firstSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 1] : null;

  const weightDelta = latestSnapshot?.weight_kg != null && firstSnapshot?.weight_kg != null
    ? latestSnapshot.weight_kg - firstSnapshot.weight_kg
    : null;
  const fatDelta = latestSnapshot?.body_fat_pct != null && firstSnapshot?.body_fat_pct != null
    ? latestSnapshot.body_fat_pct - firstSnapshot.body_fat_pct
    : null;
  const muscleDelta = latestSnapshot?.muscle_mass_kg != null && firstSnapshot?.muscle_mass_kg != null
    ? latestSnapshot.muscle_mass_kg - firstSnapshot.muscle_mass_kg
    : null;

  const weightPoints = weightChartData
    .filter((d) => d.weight_kg != null)
    .map((d) => ({ date: d.date, value: d.weight_kg! }));

  // ─── Datos de rutina ───────────────────────────────────────────────────────────
  const routineName = memberRoutine?.routine?.name ?? null;
  const routineDaysPerWeek = memberRoutine?.routine?.days_per_week ?? null;

  // ─── Asistencia ────────────────────────────────────────────────────────────────
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthCount = attendanceLogs.filter(
    (l) => new Date(l.check_in_at) >= thisMonthStart
  ).length;
  const lastVisits = attendanceLogs.slice(0, 4);

  // ─── Iniciales del nombre (para avatar) ───────────────────────────────────────
  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-4">

      {/* ── SECCIÓN 1: HEADER — avatar + nombre + QR ──────────────────────────── */}
      <div
        className="p-5 rounded-2xl"
        style={{
          backgroundColor: "var(--gym-bg-card)",
          border: "1px solid var(--gym-border)",
        }}
      >
        <div className="flex items-start justify-between gap-4">

          {/* Lado izquierdo: avatar + nombre + badge */}
          <div className="flex items-start gap-4 min-w-0">
            {/* Avatar con iniciales */}
            <div
              className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: "rgba(255,94,20,0.12)",
                color: "#FF5E14",
                fontFamily: "var(--font-barlow)",
                border: "1px solid rgba(255,94,20,0.2)",
              }}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <h1
                className="text-2xl font-extrabold leading-tight truncate"
                style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
              >
                {profile?.full_name ?? "Mi perfil"}
              </h1>

              {/* Plan como badge */}
              {subscription?.plan?.name && (
                <span
                  className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: "rgba(255,94,20,0.1)",
                    color: "#FF5E14",
                    border: "1px solid rgba(255,94,20,0.2)",
                  }}
                >
                  {subscription.plan.name}
                </span>
              )}

              {/* Check-in activo — inline bajo el nombre */}
              {openCheckin && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: "#22C55E" }}
                  />
                  <p className="text-[11px] font-medium" style={{ color: "#22C55E" }}>
                    En el gym ahora · ingresaste a las{" "}
                    {new Date(openCheckin.check_in_at).toLocaleTimeString("es-CR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lado derecho: QR compacto */}
          {themeConfig.features.gym_qr_checkin && (
            <div className="shrink-0">
              {qrData ? (
                <div className="flex flex-col items-center gap-1">
                  <QRDisplay qrData={qrData} memberName={null} compact />
                  <p className="text-[9px] text-center" style={{ color: "var(--gym-text-ghost)" }}>
                    Mi QR
                  </p>
                </div>
              ) : (
                <div
                  className="w-[104px] h-[104px] rounded-xl flex flex-col items-center justify-center gap-1"
                  style={{ backgroundColor: "#0d0d0d", border: "1px dashed #222" }}
                >
                  <QrCode className="w-6 h-6" style={{ color: "#333" }} />
                  <p className="text-[9px] text-center px-2" style={{ color: "#444" }}>
                    Sin QR
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN 2: MEMBRESÍA ─────────────────────────────────────────────────── */}
      {subscription && (
        <div
          className="p-5 rounded-2xl space-y-3"
          style={{
            backgroundColor: "var(--gym-bg-card)",
            border: "1px solid var(--gym-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
              Membresía
            </p>
            {/* Badge de estado */}
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: isExpired
                  ? "rgba(239,68,68,0.1)"
                  : isExpiringSoon
                  ? "rgba(234,179,8,0.1)"
                  : "rgba(34,197,94,0.1)",
                color: isExpired ? "#EF4444" : isExpiringSoon ? "#EAB308" : "#22C55E",
              }}
            >
              {isExpired ? "Vencida" : isExpiringSoon ? "Por vencer" : "Activa"}
            </span>
          </div>

          {/* Nombre del plan */}
          <p
            className="text-xl font-extrabold leading-tight"
            style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
          >
            {subscription.plan?.name ?? "Plan activo"}
          </p>

          {/* Alerta de vencimiento */}
          {(isExpired || isExpiringSoon) && (
            <div
              className="px-3 py-2 rounded-xl text-[11px]"
              style={{
                backgroundColor: isExpired ? "rgba(239,68,68,0.06)" : "rgba(234,179,8,0.06)",
                border: `1px solid ${isExpired ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)"}`,
                color: isExpired ? "#EF4444" : "#EAB308",
              }}
            >
              {isExpired
                ? "Tu membresía ha vencido. Contacta al administrador para renovar."
                : `Vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}. ¡Renueva pronto!`}
            </div>
          )}

          {/* Barra de progreso de días */}
          {progressPct != null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]" style={{ color: "var(--gym-text-ghost)" }}>
                <span>{daysUsed} días usados</span>
                <span>{daysLeft} días restantes</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, backgroundColor: membershipBarColor }}
                />
              </div>
            </div>
          )}

          {/* Fechas */}
          {(starts || expires) && (
            <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--gym-text-muted)" }}>
              {starts && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Desde {starts.toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
                </div>
              )}
              {expires && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Hasta {expires.toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SECCIÓN 3 + 4: RUTINA Y ASISTENCIA ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Rutina activa */}
        {themeConfig.features.gym_routines && (
          <div
            className="p-5 rounded-2xl flex flex-col gap-3"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid var(--gym-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF5E14" }} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
                Rutina activa
              </p>
            </div>

            {routineName ? (
              <>
                <div className="flex-1">
                  <p
                    className="text-lg font-extrabold leading-tight"
                    style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
                  >
                    {routineName}
                  </p>
                  {routineDaysPerWeek && (
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--gym-text-muted)" }}>
                      {routineDaysPerWeek} días por semana
                    </p>
                  )}
                  {memberRoutine?.routine?.description && (
                    <p
                      className="text-[11px] mt-1 line-clamp-2"
                      style={{ color: "var(--gym-text-muted)" }}
                    >
                      {memberRoutine.routine.description}
                    </p>
                  )}
                </div>
                <Link
                  href="/portal/routines"
                  className="flex items-center gap-1.5 text-[11px] font-medium mt-auto w-fit"
                  style={{ color: "#FF5E14" }}
                >
                  Ver rutina completa
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
                <Dumbbell className="w-8 h-8" style={{ color: "#222" }} />
                <p className="text-[11px] text-center" style={{ color: "var(--gym-text-ghost)" }}>
                  No tienes rutina asignada
                </p>
              </div>
            )}
          </div>
        )}

        {/* Asistencia del mes */}
        {themeConfig.features.gym_qr_checkin && (
          <div
            className="p-5 rounded-2xl flex flex-col gap-3"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid var(--gym-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF5E14" }} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
                Asistencia
              </p>
            </div>

            {/* Contador del mes */}
            <div className="flex items-baseline gap-1">
              <span
                className="text-3xl font-extrabold"
                style={{ color: "#FF5E14", fontFamily: "var(--font-barlow)" }}
              >
                {thisMonthCount}
              </span>
              <span className="text-[11px]" style={{ color: "var(--gym-text-muted)" }}>
                visitas este mes
              </span>
            </div>

            {/* Últimas visitas */}
            {lastVisits.length > 0 ? (
              <div className="space-y-1.5 mt-1">
                {lastVisits.map((log) => (
                  <div key={log.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 shrink-0" style={{ color: "#22C55E" }} />
                      <span className="text-[11px]" style={{ color: "var(--gym-text-muted)" }}>
                        {new Date(log.check_in_at).toLocaleDateString("es-CR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    {log.duration_minutes != null && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--gym-text-ghost)" }}>
                        <Clock className="w-2.5 h-2.5" />
                        {log.duration_minutes} min
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--gym-text-ghost)" }}>
                Aún no hay visitas registradas.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── SECCIÓN 5: PROGRESO FÍSICO ────────────────────────────────────────────── */}
      {themeConfig.features.gym_health_metrics && latestSnapshot && (
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{
            backgroundColor: "var(--gym-bg-card)",
            border: "1px solid var(--gym-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF5E14" }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
              Progreso físico
            </p>
          </div>

          {/* Pills de métricas con delta */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Peso",
                value: latestSnapshot.weight_kg,
                unit: "kg",
                delta: weightDelta,
                // Para peso: rojo si subió, verde si bajó
                positiveIsGood: false,
              },
              {
                label: "Grasa",
                value: latestSnapshot.body_fat_pct,
                unit: "%",
                delta: fatDelta,
                positiveIsGood: false,
              },
              {
                label: "Músculo",
                value: latestSnapshot.muscle_mass_kg,
                unit: "kg",
                delta: muscleDelta,
                // Para músculo: verde si subió, rojo si bajó
                positiveIsGood: true,
              },
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
                    className="rounded-xl p-3 text-center"
                    style={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a" }}
                  >
                    <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--gym-text-ghost)" }}>
                      {m.label}
                    </p>
                    <p
                      className="text-lg font-extrabold leading-none"
                      style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
                    >
                      {m.value!.toFixed(1)}
                      <span className="text-[10px] font-normal ml-0.5" style={{ color: "var(--gym-text-ghost)" }}>
                        {m.unit}
                      </span>
                    </p>
                    {m.delta != null && (
                      <p className="text-[9px] mt-0.5" style={{ color: deltaColor }}>
                        {m.delta > 0 ? "+" : ""}{m.delta.toFixed(1)} {m.unit}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Mini gráfica de peso */}
          {weightPoints.length >= 2 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color: "#444" }}>
                Evolución de peso
              </p>
              <div
                className="rounded-xl overflow-hidden p-2"
                style={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a" }}
              >
                <MiniLineChart points={weightPoints} color="#FF5E14" label="peso-portal" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECCIÓN 6: FOTOS DE PROGRESO ─────────────────────────────────────────── */}
      {themeConfig.features.gym_progress && (
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{
            backgroundColor: "var(--gym-bg-card)",
            border: "1px solid var(--gym-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--gym-text-ghost)" }}>
              Fotos de progreso
            </p>
            <MemberProgressPhotoUpload />
          </div>

          {progressPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {progressPhotos.slice(0, 3).map((photo) => (
                <div key={photo.id} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photo_url}
                    alt={photo.photo_type}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
                  >
                    <p className="text-[9px] capitalize" style={{ color: "var(--gym-text-muted)" }}>
                      {photo.photo_type === "front" ? "Frente" : photo.photo_type === "side" ? "Lado" : "Espalda"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl py-8 flex flex-col items-center gap-2"
              style={{ backgroundColor: "#0d0d0d", border: "1px dashed #1e1e1e" }}
            >
              <p className="text-[12px]" style={{ color: "#333" }}>
                Sin fotos aún
              </p>
              <p className="text-[10px]" style={{ color: "#2a2a2a" }}>
                Sube tu primera foto con el botón de arriba
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── CERRAR SESIÓN ──────────────────────────────────────────────────────────── */}
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            backgroundColor: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.15)",
            color: "#EF4444",
          }}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </form>

    </div>
  );
}
