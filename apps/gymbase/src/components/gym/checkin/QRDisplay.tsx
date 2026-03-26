// QRDisplay.tsx — Muestra el código QR personal del miembro con estilo dark GymBase

"use client";

import { QRCodeSVG } from "qrcode.react";
import type { QRCode } from "@/types/gym-checkin";

interface QRDisplayProps {
  qrData: QRCode;
  memberName: string | null;
}

export function QRDisplay({ qrData, memberName }: QRDisplayProps): React.ReactNode {
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
            Muestra este código al ingresar
          </p>
        </div>
      )}
    </div>
  );
}
