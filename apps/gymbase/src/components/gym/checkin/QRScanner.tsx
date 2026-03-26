// QRScanner.tsx — Escáner QR full-screen con 3 estados: scanning, success, error

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle, XCircle, Loader2, ScanLine, ArrowLeft, User } from "lucide-react";
import { scanCheckin } from "@/actions/checkin.actions";

type ScanStatus = "idle" | "scanning" | "success" | "error";

interface ScanResult {
  memberName?: string;
  isCheckout?: boolean;
}

export function QRScanner(): React.ReactNode {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = useCallback(async (decodedText: string): Promise<void> => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await scanCheckin({ qr_code: decodedText });

      if (result.success) {
        const isCheckout = result.data?.check_out_at !== null;
        setStatus("success");
        setScanResult({ isCheckout });
        setMessage(isCheckout ? "Check-out registrado" : "Check-in registrado");
      } else {
        setStatus("error");
        setMessage(typeof result.error === "string" ? result.error : "Error al procesar");
        setScanResult(null);
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión");
      setScanResult(null);
    }

    // Resetear después de 3 segundos para permitir el siguiente escaneo
    setTimeout(() => {
      setStatus("scanning");
      setMessage("");
      setScanResult(null);
      setIsProcessing(false);
    }, 3000);
  }, [isProcessing]);

  useEffect(() => {
    const scannerId = "qr-scanner-container";

    async function startScanner(): Promise<void> {
      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => { handleScan(decodedText); },
          () => { /* Ignorar errores de frame sin QR — es normal durante el escaneo */ }
        );

        setStatus("scanning");
      } catch {
        setStatus("error");
        setMessage("No se pudo acceder a la cámara");
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [handleScan]);

  return (
    <div
      className="relative flex flex-col min-h-screen"
      style={{ backgroundColor: "#000000" }}
    >
      {/* ── Topbar con botón de volver ──────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe"
        style={{ paddingTop: "env(safe-area-inset-top, 16px)" }}
      >
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Escanear QR</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              Registro de asistencia
            </p>
          </div>
        </div>

        {/* Indicador de estado live */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor:
                status === "scanning" ? "#22C55E" :
                status === "success"  ? "#22C55E" :
                status === "error"    ? "#EF4444" :
                                        "#737373",
              boxShadow: status === "scanning"
                ? "0 0 6px #22C55E"
                : "none",
            }}
          />
          <span className="text-[10px] text-white/60">
            {status === "idle" ? "Iniciando..." :
             status === "scanning" ? "En vivo" :
             status === "success" ? "Exitoso" :
             "Error"}
          </span>
        </div>
      </div>

      {/* ── Área de cámara — full screen ───────────────────────────────────── */}
      <div
        id="qr-scanner-container"
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />

      {/* ── Overlay: frame de escaneo ──────────────────────────────────────── */}
      {status === "scanning" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          {/* Marco del QR */}
          <div className="relative w-60 h-60">
            {/* Esquinas del marco */}
            {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
              <div
                key={i}
                className={`absolute w-8 h-8 ${pos}`}
                style={{
                  borderColor: "#FF5E14",
                  borderStyle: "solid",
                  borderWidth: 0,
                  ...(i === 0 ? { borderTopWidth: 3, borderLeftWidth: 3 } : {}),
                  ...(i === 1 ? { borderTopWidth: 3, borderRightWidth: 3 } : {}),
                  ...(i === 2 ? { borderBottomWidth: 3, borderLeftWidth: 3 } : {}),
                  ...(i === 3 ? { borderBottomWidth: 3, borderRightWidth: 3 } : {}),
                  borderRadius: i === 0 ? "8px 0 0 0" : i === 1 ? "0 8px 0 0" : i === 2 ? "0 0 0 8px" : "0 0 8px 0",
                }}
              />
            ))}

            {/* Línea de escaneo animada */}
            <div
              className="absolute left-2 right-2 h-0.5 rounded-full"
              style={{
                backgroundColor: "#FF5E14",
                boxShadow: "0 0 8px #FF5E14",
                animation: "scanLine 2s ease-in-out infinite",
                top: "50%",
              }}
            />
          </div>

          <p className="mt-6 text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            Apunta al código QR del miembro
          </p>
        </div>
      )}

      {/* ── Estado: cargando cámara ─────────────────────────────────────────── */}
      {status === "idle" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          <p className="text-sm text-white/60">Iniciando cámara...</p>
        </div>
      )}

      {/* ── Overlay de ÉXITO ───────────────────────────────────────────────── */}
      {status === "success" && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-safe"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          {/* Sheet inferior de confirmación */}
          <div
            className="w-full max-w-sm mx-auto mb-8 rounded-3xl overflow-hidden"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid rgba(34,197,94,0.3)",
            }}
          >
            {/* Barra verde de acento */}
            <div className="h-1" style={{ backgroundColor: "#22C55E" }} />

            <div className="p-6 flex flex-col items-center gap-4">
              {/* Icono de check grande */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(34,197,94,0.12)" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: "#22C55E" }} />
              </div>

              {/* Info del miembro */}
              <div className="text-center">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-2 text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(34,197,94,0.1)",
                    color: "#22C55E",
                  }}
                >
                  {scanResult?.isCheckout ? "CHECK-OUT" : "CHECK-IN"}
                </div>
                <p className="text-lg font-bold" style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}>
                  {message}
                </p>
                {scanResult?.memberName && (
                  <p className="text-sm mt-1 flex items-center gap-1 justify-center" style={{ color: "var(--gym-text-muted)" }}>
                    <User className="w-3.5 h-3.5" />
                    {scanResult.memberName}
                  </p>
                )}
              </div>

              <p className="text-xs" style={{ color: "var(--gym-text-ghost)" }}>
                Listo para el siguiente escaneo en 3s...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay de ERROR ────────────────────────────────────────────────── */}
      {status === "error" && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-safe"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm mx-auto mb-8 rounded-3xl overflow-hidden"
            style={{
              backgroundColor: "var(--gym-bg-card)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <div className="h-1" style={{ backgroundColor: "#EF4444" }} />
            <div className="p-6 flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(239,68,68,0.12)" }}
              >
                <XCircle className="w-8 h-8" style={{ color: "#EF4444" }} />
              </div>
              <div className="text-center">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-2 text-xs font-semibold"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444" }}
                >
                  ERROR
                </div>
                <p className="text-base font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                  {message || "No se pudo procesar"}
                </p>
              </div>
              <p className="text-xs" style={{ color: "var(--gym-text-ghost)" }}>
                Reintentando automáticamente...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra inferior con icono de escáner ────────────────────────────── */}
      {status === "scanning" && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pb-8 pt-4"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "#FF5E14",
              boxShadow: "0 0 24px rgba(255,94,20,0.4)",
            }}
          >
            <ScanLine className="w-6 h-6 text-white" />
          </div>
        </div>
      )}

      {/* Animación de línea de escaneo */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 20%; }
          50%  { top: 80%; }
          100% { top: 20%; }
        }
      `}</style>
    </div>
  );
}
