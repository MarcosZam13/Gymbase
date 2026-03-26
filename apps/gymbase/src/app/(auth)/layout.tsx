// layout.tsx — Layout de autenticación con branding GymBase oscuro

import Link from "next/link";
import { Zap } from "lucide-react";
import { themeConfig } from "@/lib/theme";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--gym-bg-base)" }}
    >
      {/* ── Panel izquierdo — branding (solo visible en pantallas grandes) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-10 relative overflow-hidden"
        style={{
          backgroundColor: "var(--gym-bg-surface)",
          borderRight: "1px solid var(--gym-border)",
        }}
      >
        {/* Glow de fondo decorativo */}
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: "rgba(255,94,20,0.08)",
            transform: "translate(-30%, 30%)",
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#FF5E14" }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span
              className="text-lg font-bold"
              style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
            >
              {themeConfig.brand.name}
            </span>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gym-text-ghost)" }}>
              Portal
            </p>
          </div>
        </div>

        {/* Tagline central */}
        <div className="relative">
          <p
            className="text-4xl font-black leading-tight"
            style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
          >
            Tu rendimiento,
            <br />
            <span style={{ color: "#FF5E14" }}>en un solo lugar.</span>
          </p>
          <p className="text-sm mt-4" style={{ color: "var(--gym-text-muted)" }}>
            {themeConfig.brand.tagline}
          </p>
        </div>

        {/* Bullets de features */}
        <div className="relative space-y-3">
          {[
            "Gestiona tu membresía fácilmente",
            "Accede a rutinas y clases",
            "Sigue tu progreso en tiempo real",
          ].map((text) => (
            <div key={text} className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: "#FF5E14" }}
              />
              <p className="text-sm" style={{ color: "var(--gym-text-secondary)" }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho — formulario ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo móvil — solo visible en pantallas pequeñas */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#FF5E14" }}
          >
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span
            className="text-xl font-bold"
            style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
          >
            {themeConfig.brand.name}
          </span>
        </div>

        {/* Contenido del formulario (login/register) */}
        <div className="w-full max-w-sm">
          {children}
        </div>

        {/* Footer mínimo */}
        <p className="mt-8 text-[11px]" style={{ color: "var(--gym-text-ghost)" }}>
          © {new Date().getFullYear()} {themeConfig.brand.name}. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
