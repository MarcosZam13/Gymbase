// StatCard.tsx — Tarjeta de KPI con valor actual, delta porcentual y etiqueta

interface StatCardProps {
  label: string;
  value: string;
  delta?: number | null;
  suffix?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

export function StatCard({
  label,
  value,
  delta,
  suffix,
  icon,
  highlight = false,
}: StatCardProps): React.ReactElement {
  const hasDelta = delta !== undefined && delta !== null;
  const isPositive = hasDelta && delta >= 0;
  const deltaText = hasDelta
    ? `${isPositive ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%`
    : null;

  return (
    <div
      className={[
        "bg-card border rounded-xl p-5 flex flex-col gap-3",
        highlight ? "border-primary/40" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && (
          <span className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="font-barlow font-bold text-3xl text-white leading-none">
          {value}
        </span>
        {suffix && <span className="text-sm text-muted-foreground mb-0.5">{suffix}</span>}
      </div>
      {deltaText && (
        <span
          className={[
            "text-xs font-medium",
            isPositive ? "text-green-400" : "text-red-400",
          ].join(" ")}
        >
          {deltaText} vs período anterior
        </span>
      )}
    </div>
  );
}
