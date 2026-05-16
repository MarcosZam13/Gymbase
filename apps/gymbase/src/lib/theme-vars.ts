// theme-vars.ts — Genera los CSS custom properties del tema a partir del ThemeConfig estático.
// Los valores se aplican como inline style en <html> — tienen mayor especificidad que :root en globals.css.

export function buildThemeVarsFromConfig(
  config: Pick<import("../../theme.config").ThemeConfig, "colors" | "radius">
): Record<string, string> {
  const { colors, radius } = config;

  // Jerarquía de fondos — derivada del surface base con color-mix
  // Permite que cada gym tenga su propia paleta de profundidad sin campos extra en la config
  const cardBg     = `color-mix(in srgb, ${colors.surface} 96%, white)`;  // card — ligeramente más claro
  const elevatedBg = `color-mix(in srgb, ${colors.surface} 93%, white)`;  // inputs, dropdowns
  const hoverBg    = `color-mix(in srgb, ${colors.surface} 88%, white)`;  // hover state

  // Borde más visible para separadores secundarios
  const borderMd = `color-mix(in srgb, ${colors.border} 70%, white)`;

  // Ghost text: textMuted mezclado con el fondo — texto muy apagado pero derivado del tema
  const ghostText = `color-mix(in srgb, ${colors.textMuted} 55%, ${colors.background})`;

  // Acento con 12.5% de opacidad para fondos (formato hex de 8 dígitos)
  const primaryDim = `${colors.primary}20`;

  return {
    // ── Shadcn / Tailwind tokens ─────────────────────────────────────────────
    "--primary":                    colors.primary,
    "--primary-foreground":         colors.primaryForeground,
    "--secondary":                  elevatedBg,
    "--secondary-foreground":       colors.text,
    "--accent":                     colors.accent,
    "--accent-foreground":          colors.accentForeground,
    "--background":                 colors.background,
    "--foreground":                 colors.text,
    "--card":                       cardBg,
    "--card-foreground":            colors.text,
    "--popover":                    elevatedBg,
    "--popover-foreground":         colors.text,
    "--muted":                      elevatedBg,
    "--muted-foreground":           colors.textMuted,
    "--border":                     colors.border,
    "--input":                      colors.input,
    "--ring":                       colors.ring,
    "--radius":                     radius.card,
    "--destructive":                colors.danger,
    "--destructive-foreground":     colors.dangerForeground,

    // ── GymBase design tokens ────────────────────────────────────────────────
    "--gym-bg-base":                colors.background,
    "--gym-bg-surface":             colors.surface,
    "--gym-bg-card":                cardBg,
    "--gym-bg-elevated":            elevatedBg,
    "--gym-bg-hover":               hoverBg,

    "--gym-border":                 colors.border,
    "--gym-border-md":              borderMd,

    "--gym-accent":                 colors.primary,
    "--gym-accent-dim":             primaryDim,

    "--gym-success":                colors.success,
    "--gym-warning":                colors.warning,
    "--gym-danger":                 colors.danger,
    "--gym-info":                   "#38BDF8",

    "--gym-text-primary":           colors.text,
    "--gym-text-secondary":         colors.textMuted,
    "--gym-text-muted":             colors.textMuted,
    "--gym-text-ghost":             ghostText,

    // ── Sidebar ──────────────────────────────────────────────────────────────
    "--sidebar":                    colors.surface,
    "--sidebar-foreground":         colors.text,
    "--sidebar-primary":            colors.primary,
    "--sidebar-primary-foreground": colors.primaryForeground,
    "--sidebar-accent":             elevatedBg,
    "--sidebar-accent-foreground":  colors.text,
    "--sidebar-border":             colors.border,
    "--sidebar-ring":               colors.ring,

    // ── Charts ───────────────────────────────────────────────────────────────
    "--chart-1":                    colors.primary,
    "--chart-2":                    colors.success,
    "--chart-3":                    "#38BDF8",
    "--chart-4":                    colors.warning,
    "--chart-5":                    colors.danger,

    // ── Misc ─────────────────────────────────────────────────────────────────
    "--card-radius":                radius.card,
    "--card-shadow":                "none",
  };
}
