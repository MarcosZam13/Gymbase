"use client";

import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { QRCode, AttendanceLog } from "@/types/gym-checkin";

interface QRFullScreenProps {
  qrData: QRCode;
  memberName: string | null;
  openCheckin: AttendanceLog | null;
}

export function QRFullScreen({ qrData, memberName, openCheckin }: QRFullScreenProps): React.ReactNode {
  const router = useRouter();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Mantener pantalla encendida mientras se muestra el QR
  useEffect(() => {
    async function acquireWakeLock(): Promise<void> {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // No soportado — continúa sin wake lock
      }
    }

    acquireWakeLock();

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") acquireWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      wakeLockRef.current?.release().catch(() => {});
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const checkedInTime = openCheckin
    ? new Date(openCheckin.check_in_at).toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ backgroundColor: "#080808" }}
    >
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center px-4 pt-safe shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* ── Contenido central ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">

        {/* Badge "dentro" si ya está chequeado */}
        {openCheckin ? (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
          >
            <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />
            <span className="text-sm font-semibold" style={{ color: "#22C55E" }}>
              Dentro desde las {checkedInTime}
            </span>
          </div>
        ) : (
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            Muestra este código al entrar o salir
          </p>
        )}

        {/* QR — fondo blanco para máximo contraste con cualquier escáner */}
        <div
          className="rounded-2xl"
          style={{ padding: "16px", backgroundColor: "#FFFFFF", boxShadow: "0 0 60px rgba(255,255,255,0.08)" }}
        >
          <QRCodeSVG
            value={qrData.qr_code}
            size={260}
            level="M"
            includeMargin={false}
            fgColor="#0A0A0A"
          />
        </div>

        {/* Nombre del miembro */}
        {memberName && (
          <p
            className="text-2xl font-extrabold text-center"
            style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-barlow)", letterSpacing: "0.01em" }}
          >
            {memberName}
          </p>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center gap-1 py-8 shrink-0"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}
      >
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          1.er escaneo · Entrada &nbsp; · &nbsp; 2.º escaneo · Salida
        </p>
      </div>
    </div>
  );
}
