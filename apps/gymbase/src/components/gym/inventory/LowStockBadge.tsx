// LowStockBadge.tsx — Badge async para sidebar de admin que muestra alertas de stock bajo

import { getLowStockCount } from "@/actions/inventory.actions";

export async function LowStockBadge(): Promise<React.ReactNode> {
  const count = await getLowStockCount();
  if (count === 0) return null;
  return (
    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}
