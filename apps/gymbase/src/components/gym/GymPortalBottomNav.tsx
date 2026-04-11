// GymPortalBottomNav.tsx — Bottom navigation bar del portal cliente, visible solo en mobile

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  Trophy,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { themeConfig } from "@/lib/theme";
import type { Profile } from "@/types/database";

interface GymPortalBottomNavProps {
  profile: Profile | null;
  // Cuando la membresía no está activa, se oculta el bottom nav completamente
  isActive?: boolean;
}

interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  flag?: keyof typeof themeConfig.features;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { href: "/portal/dashboard",  label: "Inicio",  icon: LayoutDashboard },
  { href: "/portal/routines",   label: "Rutinas", icon: Dumbbell,     flag: "gym_routines" },
  { href: "/portal/calendar",   label: "Clases",  icon: CalendarDays, flag: "gym_calendar" },
  { href: "/portal/challenges", label: "Retos",    icon: Trophy,       flag: "gym_challenges" },
  { href: "/portal/progress",  label: "Progreso", icon: TrendingUp,   flag: "gym_health_metrics" },
  { href: "/portal/profile",   label: "Perfil",   icon: UserCircle },
];

export function GymPortalBottomNav({ profile: _, isActive: hasMembership = true }: GymPortalBottomNavProps): React.ReactNode {
  const pathname = usePathname();

  // Sin membresía activa no se muestra el bottom nav — el miembro ve solo la pantalla de membresía
  if (!hasMembership) return null;

  const isActive = (href: string): boolean => {
    if (href === "/portal/dashboard")
      return pathname === "/portal/dashboard" || pathname === "/portal";
    return pathname.startsWith(href);
  };

  // Filtrar items según feature flags del gym
  const visibleItems = BOTTOM_NAV_ITEMS.filter(
    (item) => !item.flag || themeConfig.features[item.flag]
  );

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        backgroundColor: "var(--gym-bg-surface)",
        borderTop: "1px solid var(--gym-border)",
        height: "56px",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {visibleItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-150",
              active ? "bg-[#FF5E1415]" : ""
            )}
            style={{ color: active ? "#FF5E14" : "var(--gym-text-muted)" }}
          >
            <Icon className="w-5 h-5" />
            <span style={{ fontSize: "10px" }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
