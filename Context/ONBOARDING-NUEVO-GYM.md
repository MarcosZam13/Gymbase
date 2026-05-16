# Onboarding — Nuevo Gym en GymBase

> Objetivo: tener un nuevo gym corriendo en local (con su tema y datos propios) en un solo día.

---

## Resumen del sistema

GymBase usa **config code-driven**: cada gym = un archivo `theme.config.ts` en `clients/gymbase/<nombre>/`. El `dev` script inyecta `NEXT_PUBLIC_GYM_CLIENT` en build time y el sistema carga el config correcto. Un deploy en Vercel = un gym.

---

## Paso 1 — Crear el cliente en el repo (~15 min)

```bash
mkdir -p clients/gymbase/<nombre-gym>
```

Crear `clients/gymbase/<nombre-gym>/theme.config.ts` copiando la plantilla de abajo y ajustando los valores:

```ts
// theme.config.ts — <Nombre del Gym>
export const themeConfig = {
  timezone: "America/Costa_Rica",   // ajustar según país
  brand: {
    name: "<Nombre del Gym>",
    tagline: "<Slogan>",
    logo: "/theme/logo.svg",
    favicon: "/theme/favicon.ico",
  },
  colors: {
    primary: "#FF5E14",             // color principal — ajustar
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
  payment: {
    sinpe_number: "00000000",       // número SINPE real del gym
    sinpe_name: "<Nombre del Gym>",
    instructions: "Realiza una transferencia SINPE al número indicado con tu nombre completo en el concepto.",
    currency: "CRC",
  },
  features: {
    community: true,
    content: true,
    gym_qr_checkin: true,
    gym_health_metrics: true,
    gym_routines: true,
    gym_progress: false,            // mantener false (legal)
    gym_calendar: true,
    gym_challenges: true,
    gym_member_custom_routines: true,
    gym_inventory: false,           // activar solo si el gym vende productos
    gym_marketplace: false,         // activar solo si el gym tiene tienda para miembros
    gym_accounting: true,
  },
} as const;

export type ThemeConfig = typeof themeConfig;
```

---

## Paso 2 — Registrar en theme.ts (~2 min)

Abrir `apps/gymbase/src/lib/theme.ts` y agregar el import:

```ts
import { themeConfig as <nombreCamel>Config } from "../../../../clients/gymbase/<nombre-gym>/theme.config";

const configs: Partial<Record<string, ThemeConfig>> = {
  "iron-gym": ironGymConfig as unknown as ThemeConfig,
  "zenith-club": zenithClubConfig as unknown as ThemeConfig,
  "<nombre-gym>": <nombreCamel>Config as unknown as ThemeConfig,  // ← agregar
};
```

---

## Paso 3 — Agregar script de dev (~1 min)

En `apps/gymbase/package.json`, agregar en `scripts`:

```json
"dev:<nombre-gym>": "NEXT_PUBLIC_GYM_CLIENT=<nombre-gym> GYMBASE_ORG_ID=<UUID-del-gym> next dev --port 3003"
```

Cada gym usa un puerto diferente para poder correr varios en paralelo:
- iron-gym → 3001
- zenith-club → 3002
- próximo gym → 3003
- etc.

---

## Paso 4 — Crear org en Supabase (~5 min)

Ejecutar en el SQL Editor de Supabase (o como migración):

```sql
-- Reemplazar los valores con los del gym real
INSERT INTO organizations (id, gym_name)
VALUES ('<UUID-del-gym>', '<Nombre del Gym>')
ON CONFLICT (id) DO NOTHING;
```

Generar un UUID nuevo en: https://www.uuidgenerator.net/

---

## Paso 5 — Assets del gym (~30 min)

Crear `clients/gymbase/<nombre-gym>/public/theme/` y colocar:
- `logo.svg` — logo del gym (preferiblemente SVG, fondo transparente)
- `favicon.ico` — favicon 32x32

> **Nota**: Actualmente el sistema de assets por cliente no está completamente implementado — el `logo.svg` se sirve desde `apps/gymbase/public/theme/`. Por ahora: reemplazar el archivo en `public/theme/logo.svg` antes de hacer el build de ese gym.

---

## Paso 6 — Correr en local (~1 min)

```bash
cd apps/gymbase
pnpm dev:<nombre-gym>
# o desde la raíz:
pnpm --filter @memberbase/gymbase dev:<nombre-gym>
```

---

## Estado actual de clientes

| Cliente      | ID (dev)                               | Puerto | Estado     |
|-------------|----------------------------------------|--------|------------|
| iron-gym     | 00000000-0000-0000-0000-000000000001  | 3001   | ✅ Activo  |
| zenith-club  | 00000000-0000-0000-0000-000000000002  | 3002   | ✅ Config lista, sin datos propios aún |

---

## Deploy en Vercel por gym

Cada gym = un proyecto separado en Vercel apuntando al mismo repo, con variables de entorno distintas:

```
NEXT_PUBLIC_GYM_CLIENT=<nombre-gym>
GYMBASE_ORG_ID=<UUID-del-gym>
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Con Vercel CLI:
```bash
vercel link   # vincular el proyecto del gym
vercel env add NEXT_PUBLIC_GYM_CLIENT production  # ingresar el valor
vercel env add GYMBASE_ORG_ID production
vercel --prod
```

---

## Tiempo estimado total

| Paso | Tiempo |
|------|--------|
| Crear theme.config.ts | 15–30 min (diseño de colores) |
| Registrar en theme.ts + package.json | 5 min |
| Crear org en Supabase | 5 min |
| Assets (logo, favicon) | 30–60 min (depende de si ya existen) |
| Seed de datos demo (planes, clases, etc.) | 1–2 h |
| **Total sin datos** | ~1 hora |
| **Total con datos demo** | ~3–4 horas |
