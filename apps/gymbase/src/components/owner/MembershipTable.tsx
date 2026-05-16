// MembershipTable.tsx — Tabla por plan con barra de retención inline y métricas clave

import type { MembershipReport } from "@/types/owner";
import { themeConfig } from "@/lib/theme";

interface MembershipTableProps {
  data: MembershipReport[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: themeConfig.payment.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Barra de retención: verde si ≥60 días, amarilla si ≥30, roja si <30
function RetentionBar({ days }: { days: number }): React.ReactElement {
  const max = 365;
  const pct = Math.min((days / max) * 100, 100);
  const color =
    days >= 60 ? "#22C55E" : days >= 30 ? "#FACC15" : "#EF4444";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-14 text-right">{days}d avg</span>
    </div>
  );
}

export function MembershipTable({ data }: MembershipTableProps): React.ReactElement {
  if (!data.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Sin datos de membresías para el período
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Plan</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Activos</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Ingresos mes</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Nuevos</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Cancelados</th>
            <th className="py-3 px-4 text-muted-foreground font-medium w-48">Retención</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-3 px-4 font-medium text-white">{row.plan_name}</td>
              <td className="py-3 px-4 text-right text-white font-barlow font-bold text-base">
                {row.active_count}
              </td>
              <td className="py-3 px-4 text-right text-primary font-medium">
                {formatCurrency(row.revenue_this_month)}
              </td>
              <td className="py-3 px-4 text-right text-green-400">+{row.new_this_month}</td>
              <td className="py-3 px-4 text-right text-red-400">
                {row.cancelled_this_month > 0 ? `-${row.cancelled_this_month}` : "—"}
              </td>
              <td className="py-3 px-4">
                <RetentionBar days={row.avg_retention_days} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
