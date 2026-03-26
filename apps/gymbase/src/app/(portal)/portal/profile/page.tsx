// page.tsx — Perfil del miembro: QR, check-in activo, info personal y logout

import { getCurrentUser } from "@/lib/supabase/server";
import { getMyQR, getMyOpenCheckin } from "@/actions/checkin.actions";
import { QRDisplay } from "@/components/gym/checkin/QRDisplay";
import { signOut } from "@core/actions/auth.actions";
import { Clock, UserCircle, Mail, Phone, LogOut, QrCode, CheckCircle } from "lucide-react";
import { themeConfig } from "@/lib/theme";

export default async function ProfilePage(): Promise<React.ReactNode> {
  const [profile, qrData, openCheckin] = await Promise.all([
    getCurrentUser(),
    themeConfig.features.gym_qr_checkin ? getMyQR()          : Promise.resolve(null),
    themeConfig.features.gym_qr_checkin ? getMyOpenCheckin()  : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
        >
          Mi Perfil
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--gym-text-muted)" }}>
          Tu información personal y acceso al gimnasio
        </p>
      </div>

      {/* ── Estado de check-in activo ────────────────────────────────────────── */}
      {openCheckin && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.25)",
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "#22C55E", boxShadow: "0 0 6px #22C55E" }}
          />
          <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "#22C55E" }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>
              Estás en el gym ahora
            </p>
            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--gym-text-muted)" }}>
              <Clock className="w-3 h-3" />
              Ingresaste a las{" "}
              {new Date(openCheckin.check_in_at).toLocaleTimeString("es-CR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Código QR ────────────────────────────────────────────────────── */}
        {themeConfig.features.gym_qr_checkin && (
          <div
            className="p-6 rounded-2xl flex flex-col items-center gap-4"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid var(--gym-border)",
            }}
          >
            <div className="flex items-center gap-2 self-start">
              <QrCode className="w-4 h-4" style={{ color: "#FF5E14" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                Mi código QR
              </h2>
            </div>

            {qrData ? (
              <QRDisplay qrData={qrData} memberName={profile?.full_name ?? null} />
            ) : (
              <div className="text-center py-8">
                <QrCode className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--gym-text-ghost)" }} />
                <p className="text-sm" style={{ color: "var(--gym-text-muted)" }}>
                  No se pudo generar tu código QR.
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--gym-text-ghost)" }}>
                  Contacta al administrador.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Información del perfil + logout ──────────────────────────────── */}
        <div className="space-y-4">
          <div
            className="p-5 rounded-2xl space-y-4"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid var(--gym-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <UserCircle className="w-4 h-4" style={{ color: "var(--gym-text-muted)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                Información personal
              </h2>
            </div>

            {/* Nombre */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gym-text-ghost)" }}>
                Nombre
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--gym-text-primary)" }}>
                {profile?.full_name ?? "—"}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gym-text-ghost)" }}>
                Correo electrónico
              </p>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--gym-text-ghost)" }} />
                <p className="text-sm font-medium truncate" style={{ color: "var(--gym-text-primary)" }}>
                  {profile?.email ?? "—"}
                </p>
              </div>
            </div>

            {/* Teléfono */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gym-text-ghost)" }}>
                Teléfono
              </p>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--gym-text-ghost)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--gym-text-primary)" }}>
                  {profile?.phone ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Botón de cerrar sesión ──────────────────────────────────────── */}
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#EF4444",
              }}
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
