// theme.config.ts — Zenith Club
// Estética premium urbana: navy profundo, cyan eléctrico, formas redondeadas, tipografía moderna

export const themeConfig = {
  timezone: "America/Bogota",
  brand: {
    name: "Zenith Club",
    tagline: "Entrena en otro nivel",
    logo: "/theme/logo.svg",
    favicon: "/theme/favicon.ico",
  },
  colors: {
    primary: "#06B6D4",           // cyan-500 — eléctrico, moderno
    primaryHover: "#0891B2",      // cyan-600
    primaryForeground: "#FFFFFF",
    accent: "#06B6D4",
    accentForeground: "#FFFFFF",
    background: "#0A0F1E",        // navy muy oscuro — contrasta con el negro de Iron Gym
    surface: "#0F172A",           // slate-900
    text: "#F1F5F9",              // slate-100
    textMuted: "#64748B",         // slate-500
    border: "#1E293B",            // slate-800
    input: "#162032",             // entre background y surface
    ring: "#06B6D4",
    success: "#10B981",           // emerald-500
    warning: "#F59E0B",           // amber-500
    danger: "#F43F5E",            // rose-500 — diferente al rojo plano de Iron Gym
    dangerForeground: "#FFFFFF",
  },
  fonts: {
    sans: "'Inter', 'system-ui', sans-serif",
    heading: "'DM Sans', 'Inter', sans-serif",
  },
  radius: {
    button: "0.75rem",   // más redondeado que Iron Gym (0.5rem)
    card: "1rem",        // más redondeado que Iron Gym (0.75rem)
    input: "0.625rem",   // más redondeado que Iron Gym (0.375rem)
  },
  contact: {
    whatsapp: "",
    email: "",
    instagram: "",
  },
  payment: {
    sinpe_number: "00000000",
    sinpe_name: "Zenith Club",
    instructions: "Transfiere por SINPE al número indicado. Incluye tu nombre completo en el concepto.",
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
    gym_member_custom_routines: false, // plan premium — rutinas solo gestionadas por trainers
    gym_inventory: true,
    gym_marketplace: true,
    gym_accounting: true,
  },
} as const;

export type ThemeConfig = typeof themeConfig;
