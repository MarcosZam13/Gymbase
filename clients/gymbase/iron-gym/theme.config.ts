// theme.config.ts — Configuración completa para cliente Iron Gym CR
// Basado en la plantilla de apps/gymbase/theme.config.ts

export const themeConfig = {
  timezone: "America/Costa_Rica",
  brand: {
    name: "Iron Gym CR",
    tagline: "El gym más fuerte de Costa Rica",
    logo: "/theme/logo.svg",
    favicon: "/theme/favicon.ico",
  },
  colors: {
    primary: "#FF5E14",
    primaryHover: "#FF7A3D",
    primaryForeground: "#FFFFFF",
    accent: "#FF5E14",
    accentForeground: "#FFFFFF",
    background: "#0A0A0A",
    surface: "#111111",
    text: "#F5F5F5",
    textMuted: "#737373",
    border: "#1E1E1E",
    input: "#1A1A1A",
    ring: "#FF5E14",
    success: "#22C55E",
    warning: "#FACC15",
    danger: "#EF4444",
    dangerForeground: "#FFFFFF",
  },
  fonts: {
    sans: "'DM Sans', 'Inter', sans-serif",
    heading: "'Barlow Condensed', 'Inter', sans-serif",
  },
  radius: {
    button: "0.5rem",
    card: "0.75rem",
    input: "0.375rem",
  },
  contact: {
    whatsapp: "",
    email: "",
    instagram: "",
  },
  // TODO: Completar con datos reales del cliente antes del primer cobro
  payment: {
    sinpe_number: "00000000",
    sinpe_name: "Iron Gym CR",
    instructions: "Realiza una transferencia SINPE al número indicado con tu nombre completo en el concepto.",
    currency: "CRC",
  },
  features: {
    community: true,
    content: true,
    gym_qr_checkin: true,
    gym_health_metrics: true,
    gym_routines: true,
    gym_progress: false,
    gym_calendar: true,
    gym_challenges: true,
    gym_member_custom_routines: true,
    gym_inventory: false,
    gym_marketplace: false,
    gym_accounting: true,
  },
} as const;

export type ThemeConfig = typeof themeConfig;
