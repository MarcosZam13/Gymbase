# Sistema de Temas — GymBase White Label

> Última actualización: 2026-05-11
> Estado: **Implementado y funcionando**

---

## Cómo funciona (en una línea)

Cada gym tiene un archivo `theme.config.ts` → genera CSS vars → se inyecta como `style` en `<html>` → todo el UI responde automáticamente.

---

## Archivos clave

| Archivo | Qué hace |
|---|---|
| `clients/gymbase/<nombre>/theme.config.ts` | **El único archivo que hay que tocar** para personalizar un gym |
| `apps/gymbase/src/lib/theme.ts` | Carga el config correcto según `NEXT_PUBLIC_GYM_CLIENT` |
| `apps/gymbase/src/lib/theme-vars.ts` | Convierte el config en CSS custom properties |
| `apps/gymbase/src/app/layout.tsx` | Aplica las vars como `style` en `<html>` (máxima especificidad) |
| `apps/gymbase/theme.config.ts` | Config base / fallback (no se toca normalmente) |

---

## Estructura del theme.config.ts

```typescript
export const themeConfig = {
  timezone: "America/Costa_Rica",         // zona horaria para calendario

  brand: {
    name: "Iron Gym",                     // nombre en navbar y sidebar
    tagline: "Forja tu mejor versión",    // subtítulo del gym
    logo: "/theme/logo.svg",              // logo en public/theme/
    favicon: "/theme/favicon.ico",
  },

  colors: {
    primary: "#FF5E14",                   // ← EL COLOR MÁS IMPORTANTE
    primaryHover: "#FF7A3D",              // hover del primary (botones)
    primaryForeground: "#FFFFFF",         // texto sobre el primary
    accent: "#FF5E14",                    // generalmente = primary
    accentForeground: "#FFFFFF",
    background: "#0A0A0A",               // fondo del body
    surface: "#111111",                  // sidebar, cards base
    text: "#F5F5F5",                     // texto principal
    textMuted: "#737373",                // texto secundario / labels
    border: "#1E1E1E",                   // bordes
    input: "#1A1A1A",                    // fondo de inputs
    ring: "#FF5E14",                     // outline de focus
    success: "#22C55E",                  // verde para estados OK
    warning: "#FACC15",                  // amarillo para advertencias
    danger: "#EF4444",                   // rojo para errores/destrucción
    dangerForeground: "#FFFFFF",
  },

  fonts: {
    sans: "'DM Sans', 'Inter', sans-serif",
    heading: "'Barlow Condensed', 'Inter', sans-serif",
  },

  radius: {
    button: "0.5rem",    // border-radius de botones
    card: "0.75rem",     // border-radius de cards e inputs
    input: "0.375rem",
  },

  contact: {
    whatsapp: "50612345678",
    email: "info@irongym.com",
    instagram: "@irongym",
  },

  payment: {
    sinpe_number: "88888888",
    sinpe_name: "Iron Gym CR",
    instructions: "Transfiere al número indicado con tu nombre completo en el concepto.",
    currency: "CRC",
  },

  features: {
    community: true,                      // Módulo comunidad/posts
    content: true,                        // Módulo contenido/videos
    gym_qr_checkin: true,                // Check-in por QR
    gym_health_metrics: true,            // Salud y métricas corporales
    gym_routines: true,                  // Rutinas de entrenamiento
    gym_progress: false,                 // Fotos de progreso (desactivado)
    gym_calendar: true,                  // Calendario de clases
    gym_challenges: true,               // Retos y ranking
    gym_member_custom_routines: true,    // Miembros crean sus rutinas
    gym_inventory: true,                 // Inventario de productos
    gym_marketplace: true,              // Tienda para miembros
    gym_accounting: true,               // Dashboard financiero (owner)
  },
} as const;
```

---

## CSS vars que genera theme-vars.ts

A partir del config, se generan automáticamente:

### Fondos (jerarquía de profundidad)
```
--gym-bg-base      = colors.background          (fondo del body)
--gym-bg-surface   = colors.surface             (sidebar, topbar)
--gym-bg-card      = surface + 4% white         (cards)
--gym-bg-elevated  = surface + 7% white         (inputs, dropdowns)
--gym-bg-hover     = surface + 12% white        (hover states)
```

### Colores semánticos
```
--gym-accent       = colors.primary             (naranja/cyan/lo que sea)
--gym-accent-dim   = primary + 20 hex alpha     (fondo tintado sutil)
--gym-success      = colors.success
--gym-warning      = colors.warning
--gym-danger       = colors.danger
```

### Texto
```
--gym-text-primary    = colors.text
--gym-text-secondary  = colors.textMuted
--gym-text-muted      = colors.textMuted
--gym-text-ghost      = textMuted 55% opacidad  (labels de sección del sidebar)
```

### Shadcn tokens (para componentes UI)
```
--primary         → bg-primary, text-primary
--destructive     → bg-destructive, text-destructive
--muted           → bg-muted, text-muted-foreground
--border          → border-border
--card            → bg-card
```

---

## Cómo se usan en los componentes

**Regla de oro**: nunca usar colores hex hardcodeados. Solo:

```tsx
// ✅ Correcto — responde al tema
style={{ backgroundColor: "var(--gym-accent)" }}
className="bg-primary text-primary"
style={{ backgroundColor: "color-mix(in srgb, var(--gym-accent) 10%, transparent)" }}

// ❌ Incorrecto — hardcodeado iron-gym
style={{ backgroundColor: "#FF5E14" }}
style={{ backgroundColor: "rgba(255,94,20,0.1)" }}
className="bg-[#FF5E14]"
```

### Opacidades del acento (usar color-mix)
```
10% → color-mix(in srgb, var(--gym-accent) 10%, transparent)
20% → color-mix(in srgb, var(--gym-accent) 20%, transparent)
30% → color-mix(in srgb, var(--gym-accent) 30%, transparent)
```

### Tailwind utilities equivalentes
```
bg-primary/10    = 10% del acento de fondo
bg-primary/20    = 20%
border-primary/30 = borde al 30% de opacidad
text-primary     = color del acento
```

---

## Excepciones intencionales (no tocar)

1. **Email templates** (`src/lib/email/templates/*.tsx`) — clientes de email no soportan CSS vars, usan hex hardcodeado.
2. **AttendanceHeatmap** — gradiente de calor `["#1E1E1E", "#FFB899", "#FF9666", "#FF7A3D", "#FF5E14"]` — escala visual diseñada para el naranja. Si el acento no es naranja, este componente quedará visualmente diferente.
3. **ClassTypeForm** — picker de colores para tipos de clase — son colores de datos del usuario, no del tema.

---

## Clientes actuales

| Gym | Carpeta cliente | Org ID | Puerto dev | Acento |
|---|---|---|---|---|
| Iron Gym | `clients/gymbase/iron-gym/` | `000...0001` | 3001 | `#FF5E14` naranja |
| Zenith Club | `clients/gymbase/zenith-club/` | `000...0002` | 3002 | `#06B6D4` cyan |

### Comandos dev
```bash
pnpm dev              # Zenith Club (puerto 3001) — default
pnpm dev:iron-gym     # Iron Gym (puerto 3001)
pnpm dev:zenith-club  # Zenith Club (puerto 3002)
```

---

## Agregar un nuevo gym

1. Crear `clients/gymbase/<nombre>/theme.config.ts` — copiar de zenith-club y modificar
2. Registrar en `apps/gymbase/src/lib/theme.ts` (importar y agregar al switch)
3. Agregar script en `apps/gymbase/package.json`
4. Insertar organización en Supabase con UUID fijo
5. Poner assets en `apps/gymbase/public/theme/` (logo.svg, favicon.ico)
6. Deploy en Vercel con `NEXT_PUBLIC_GYM_CLIENT=<nombre>` y `GYMBASE_ORG_ID=<uuid>`

Ver `Context/ONBOARDING-NUEVO-GYM.md` para el proceso completo.

---

## Por qué inline style en `<html>` y no :root

Los inline styles tienen especificidad máxima (más que `:root` en globals.css).
Esto significa que los valores del gym activo siempre ganan sin necesidad de `!important`.

`layout.tsx`:
```tsx
<html lang="es" style={buildThemeVarsFromConfig(themeConfig)}>
```

Los fallbacks en `globals.css > :root` son iron-gym (valores por defecto del codebase),
pero en producción siempre se sobreescriben por el inline style.
