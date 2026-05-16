// theme.ts — Carga la configuración del gym activo según NEXT_PUBLIC_GYM_CLIENT
import type { ThemeConfig } from "../../theme.config";
import { themeConfig as defaultConfig } from "../../theme.config";
import { themeConfig as ironGymConfig } from "../../../../clients/gymbase/iron-gym/theme.config";
import { themeConfig as zenithClubConfig } from "../../../../clients/gymbase/zenith-club/theme.config";

const GYM_CLIENT = process.env.NEXT_PUBLIC_GYM_CLIENT;

const configs: Partial<Record<string, ThemeConfig>> = {
  "iron-gym": ironGymConfig as unknown as ThemeConfig,
  "zenith-club": zenithClubConfig as unknown as ThemeConfig,
};

export const themeConfig: ThemeConfig =
  (GYM_CLIENT ? configs[GYM_CLIENT] : undefined) ?? defaultConfig;

export type { ThemeConfig };
