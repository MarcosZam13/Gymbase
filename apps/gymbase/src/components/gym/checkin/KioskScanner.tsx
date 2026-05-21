"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle, XCircle, Loader2, Users } from "lucide-react";
import { scanCheckin } from "@/actions/checkin.actions";
import { useOccupancy } from "@/hooks/useOccupancy";

type ScanStatus = "idle" | "scanning" | "success" | "error";

interface KioskScannerProps {
  orgId: string;
  gymName: string;
}

export function KioskScanner({ orgId, gymName }: KioskScannerProps): React.ReactNode {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [memberName, setMemberName] = useState<string | null>(null);
  const [isCheckout, setIsCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { current, capacity } = useOccupancy(orgId);

  const handleScan = useCallback(async (decodedText: string): Promise<void> => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await scanCheckin({ qr_code: decodedText });

      if (result.success) {
        const checkout = result.data?.check_out_at !== null;
        setIsCheckout(checkout);
        setMemberName(result.data?.member_name ?? null);
        setMessage(checkout ? "¡Hasta pronto!" : "¡Bienvenido!");
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(typeof result.error === "string" ? result.error : "Código no válido");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión");
    }

    setTimeout(() => {
      setStatus("scanning");
      setMessage("");
      setMemberName(null);
      setIsProcessing(false);
    }, 3500);
  }, [isProcessing]);

  useEffect(() => {
    const scannerId = "kiosk-scanner-container";

    async function startScanner(): Promise<void> {
      try {
        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 280 } },
          (text) => { handleScan(text); },
          () => {}
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
    <div className="relative flex flex-col min-h-screen bg-black overflow-hidden">

      {/* ── Cámara de fondo ──────────────────────────────────────────────────── */}
      <div id="kiosk-scanner-container" className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* ── Header con ocupación ─────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex items-center justify-between px-6 py-4"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
      >
        <p
          className="text-xl font-extrabold tracking-tight uppercase"
          style={{ color: "var(--gym-accent)", fontFamily: "var(--font-barlow)" }}
        >
          {gymName}
        </p>

        {status === "scanning" && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Users className="w-4 h-4 text-white/60" />
            <span className="text-sm font-semibold text-white">
              {current}
              <span className="text-white/40 font-normal text-xs"> / {capacity}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Marco de escaneo (solo cuando está activo) ──────────────────────── */}
      {status === "scanning" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-72 h-72">
            {[
              "top-0 left-0",
              "top-0 right-0",
              "bottom-0 left-0",
              "bottom-0 right-0",
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute w-10 h-10 ${pos}`}
                style={{
                  borderColor: "var(--gym-accent)",
                  borderStyle: "solid",
                  borderWidth: 0,
                  ...(i === 0 ? { borderTopWidth: 3, borderLeftWidth: 3 } : {}),
                  ...(i === 1 ? { borderTopWidth: 3, borderRightWidth: 3 } : {}),
                  ...(i === 2 ? { borderBottomWidth: 3, borderLeftWidth: 3 } : {}),
                  ...(i === 3 ? { borderBottomWidth: 3, borderRightWidth: 3 } : {}),
                  borderRadius:
                    i === 0 ? "10px 0 0 0" :
                    i === 1 ? "0 10px 0 0" :
                    i === 2 ? "0 0 0 10px" :
                               "0 0 10px 0",
                }}
              />
            ))}

            {/* Línea de escaneo */}
            <div
              className="absolute left-3 right-3 h-0.5 rounded-full"
              style={{
                backgroundColor: "var(--gym-accent)",
                boxShadow: "0 0 10px var(--gym-accent)",
                animation: "scanLine 2s ease-in-out infinite",
                top: "50%",
              }}
            />
          </div>

          <p className="mt-8 text-base font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
            Acerca tu código QR
          </p>
        </div>
      )}

      {/* ── Cargando ─────────────────────────────────────────────────────────── */}
      {status === "idle" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-white/50" />
          <p className="text-sm text-white/50">Iniciando cámara...</p>
        </div>
      )}

      {/* ── Overlay ÉXITO ────────────────────────────────────────────────────── */}
      {status === "success" && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="flex flex-col items-center gap-5 px-10 py-12 rounded-3xl"
            style={{
              backgroundColor: "rgba(15,15,15,0.95)",
              border: `2px solid ${isCheckout ? "rgba(250,204,21,0.4)" : "rgba(34,197,94,0.4)"}`,
              minWidth: "320px",
            }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isCheckout ? "rgba(250,204,21,0.1)" : "rgba(34,197,94,0.1)" }}
            >
              <CheckCircle
                className="w-12 h-12"
                style={{ color: isCheckout ? "#FACC15" : "#22C55E" }}
              />
            </div>

            <div className="text-center">
              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3"
                style={{
                  backgroundColor: isCheckout ? "rgba(250,204,21,0.1)" : "rgba(34,197,94,0.1)",
                  color: isCheckout ? "#FACC15" : "#22C55E",
                }}
              >
                {isCheckout ? "Salida" : "Entrada"}
              </div>

              <p
                className="text-4xl font-extrabold leading-tight"
                style={{ color: "#F5F5F5", fontFamily: "var(--font-barlow)" }}
              >
                {message}
              </p>

              {memberName && (
                <p className="text-lg mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {memberName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay ERROR ────────────────────────────────────────────────────── */}
      {status === "error" && message && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="flex flex-col items-center gap-5 px-10 py-10 rounded-3xl"
            style={{ backgroundColor: "rgba(15,15,15,0.95)", border: "2px solid rgba(239,68,68,0.4)", minWidth: "280px" }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
            >
              <XCircle className="w-10 h-10" style={{ color: "#EF4444" }} />
            </div>
            <p className="text-xl font-bold text-center" style={{ color: "#F5F5F5" }}>
              {message}
            </p>
          </div>
        </div>
      )}

      {/* Ocupación en footer cuando está escaneando */}
      {status === "scanning" && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-1 py-6"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "#22C55E", boxShadow: "0 0 6px #22C55E" }}
            />
            <span className="text-xs text-white/50">Escáner activo</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%   { top: 15%; }
          50%  { top: 85%; }
          100% { top: 15%; }
        }
      `}</style>
    </div>
  );
}
