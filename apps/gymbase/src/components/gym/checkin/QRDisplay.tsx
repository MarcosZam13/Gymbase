// QRDisplay.tsx — Muestra el código QR personal del miembro con estilo dark GymBase

"use client";

import { QRCodeSVG } from "qrcode.react";
import type { QRCode } from "@/types/gym-checkin";

interface QRDisplayProps {
  qrData: QRCode;
  memberName: string | null;
  // compact=true: QR pequeño (80px) sin nombre, para integrar en el header del perfil
  compact?: boolean;
}

export function QRDisplay({ qrData, memberName, compact = false }: QRDisplayProps): React.ReactNode {
  if (compact) {
    return (
      <div className="p-2 rounded-xl bg-white">
        <QRCodeSVG
          value={qrData.qr_code}
          size={80}
          level="M"
          includeMargin={false}
          fgColor="#0A0A0A"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Contenedor blanco del QR — contraste necesario para escáneres */}
      <div className="p-3 rounded-xl bg-white">
        <QRCodeSVG
          value={qrData.qr_code}
          size={160}
          level="M"
          includeMargin={false}
          fgColor="#0A0A0A"
        />
      </div>

      {memberName && (
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--gym-text-primary)" }}>
            {memberName}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--gym-text-muted)" }}>
            1er escaneo = entrada &nbsp;·&nbsp; 2do escaneo = salida
          </p>
        </div>
      )}
    </div>
  );
}
