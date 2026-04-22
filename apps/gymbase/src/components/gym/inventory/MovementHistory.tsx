// MovementHistory.tsx — Tabla de historial de movimientos de stock de un producto

import type { InventoryMovement, MovementType } from "@/types/gym-inventory";

const MOVEMENT_META: Record<MovementType, { label: string; color: string; bg: string; sign: string }> = {
  restock:    { label: "Restock",   color: "#22c55e", bg: "rgba(34,197,94,0.12)",   sign: "+" },
  sale:       { label: "Venta",     color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  sign: "-" },
  adjustment: { label: "Ajuste",    color: "#FF5E14", bg: "rgba(255,94,20,0.12)",   sign: "±" },
  waste:      { label: "Merma",     color: "#ef4444", bg: "rgba(239,68,68,0.12)",   sign: "-" },
};

interface MovementHistoryProps {
  movements: InventoryMovement[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MovementHistory({ movements }: MovementHistoryProps): React.ReactNode {
  if (movements.length === 0) {
    return (
      <div className="text-center py-10 text-[#444] text-sm">
        Sin movimientos registrados aún.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {movements.map((m) => {
        const meta = MOVEMENT_META[m.type];
        const absQty = Math.abs(m.quantity);
        const sign = m.quantity > 0 ? "+" : "-";

        return (
          <div
            key={m.id}
            className="flex items-start gap-3 p-3 rounded-[10px]"
            style={{ backgroundColor: "#0D0D0D", border: "1px solid #1e1e1e" }}
          >
            {/* Chip de tipo */}
            <span
              className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
              style={{ color: meta.color, backgroundColor: meta.bg }}
            >
              {meta.label}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                {/* Cantidad con signo */}
                <span
                  className="text-sm font-bold"
                  style={{ color: m.quantity >= 0 ? "#22c55e" : "#ef4444" }}
                >
                  {sign}{absQty} u → {m.new_stock} en stock
                </span>
                <span className="text-[11px] shrink-0" style={{ color: "#555" }}>
                  {formatDate(m.created_at)}
                </span>
              </div>

              {m.notes && (
                <p className="text-[12px] mt-0.5 truncate" style={{ color: "#737373" }}>
                  {m.notes}
                </p>
              )}

              {m.creator && (
                <p className="text-[11px] mt-0.5" style={{ color: "#444" }}>
                  Por {m.creator.full_name}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
