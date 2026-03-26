// GymAdminSidebar.tsx — Sidebar oscuro de administración con secciones, badges y footer

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Dumbbell,
  CalendarDays,
  Trophy,
  ScanLine,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { themeConfig } from "@/lib/theme";
import { signOut } from "@core/actions/auth.actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  flag?: keyof typeof themeConfig.features;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Secciones de navegación — agrupadas por dominio funcional
const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Gestión",
    items: [
      { href: "/admin/members",   label: "Miembros",   icon: Users },
      { href: "/admin/content",   label: "Contenido",  icon: BookOpen },
      { href: "/admin/community", label: "Comunidad",  icon: MessageSquare, flag: "community" },
      { href: "/admin/routines",  label: "Rutinas",    icon: Dumbbell,      flag: "gym_routines" },
      { href: "/admin/calendar",  label: "Calendario", icon: CalendarDays,  flag: "gym_calendar" },
      { href: "/admin/challenges",label: "Retos",      icon: Trophy,        flag: "gym_challenges" },
      { href: "/admin/occupancy", label: "Ocupación",  icon: ScanLine,      flag: "gym_qr_checkin" },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/admin/plans",    label: "Planes", icon: CreditCard },
      { href: "/admin/payments", label: "Pagos",  icon: FileText },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/settings", label: "Configuración", icon: Settings },
    ],
  },
];

export function GymAdminSidebar(): React.ReactNode {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string): boolean => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    // Ocultar si el feature flag está desactivado
    if (item.flag && !themeConfig.features[item.flag]) return null;

    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          active
            ? "text-[#FF5E14] bg-[#FF5E1420]"
            : "text-[#737373] hover:text-[#F5F5F5] hover:bg-[#1A1A1A]"
        )}
        style={active ? { borderLeft: "3px solid #FF5E14" } : { borderLeft: "3px solid transparent" }}
      >
        <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-[#FF5E14]" : "")} />
        <span className="flex-1">{item.label}</span>

        {/* Badge de notificación */}
        {item.badge && item.badge > 0 && (
          <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-[#FF5E14] text-white">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ backgroundColor: "var(--gym-bg-surface)" }}>
      {/* Header — logo y tagline del negocio */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--gym-border)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#FF5E14" }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold" style={{ color: "var(--gym-text-primary)" }}>
              {themeConfig.brand.name}
            </span>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gym-text-muted)" }}>
              Admin
            </p>
          </div>
        </div>
      </div>

      {/* Navegación por secciones */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => {
          // Filtrar items sin feature flag o con flag activo
          const visibleItems = section.items.filter(
            (item) => !item.flag || themeConfig.features[item.flag]
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              <p
                className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--gym-text-ghost)" }}
              >
                {section.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(renderNavItem)}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer — info del gym + cerrar sesión */}
      <div className="px-3 pb-4 space-y-1" style={{ borderTop: "1px solid var(--gym-border)" }}>
        <div className="px-3 py-3">
          <p className="text-xs font-medium" style={{ color: "var(--gym-text-secondary)" }}>
            {themeConfig.brand.name}
          </p>
          <p className="text-[10px]" style={{ color: "var(--gym-text-ghost)" }}>
            {themeConfig.brand.tagline}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: "var(--gym-text-muted)",
              borderLeft: "3px solid transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--gym-text-primary)";
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--gym-bg-elevated)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--gym-text-muted)";
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar para desktop — ancho fijo 220px */}
      <aside
        className="hidden md:flex flex-col w-[220px] shrink-0 min-h-screen"
        style={{
          backgroundColor: "var(--gym-bg-surface)",
          borderRight: "1px solid var(--gym-border)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Botón hamburguesa para móvil */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{
          backgroundColor: "var(--gym-bg-elevated)",
          border: "1px solid var(--gym-border)",
          color: "var(--gym-text-primary)",
        }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Abrir menú"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay + sidebar móvil */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-[220px]"
            style={{
              backgroundColor: "var(--gym-bg-surface)",
              borderRight: "1px solid var(--gym-border)",
            }}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
