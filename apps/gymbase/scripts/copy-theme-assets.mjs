// copy-theme-assets.mjs
// Copia los assets del cliente activo (logo, favicon) a public/theme/ antes del build.
// Ejecutado automáticamente via "prebuild" y "predev" en package.json.

import { cpSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const client = process.env.NEXT_PUBLIC_GYM_CLIENT;

if (!client) {
  console.log("[theme-assets] NEXT_PUBLIC_GYM_CLIENT no definido — usando assets por defecto.");
  process.exit(0);
}

const srcDir = resolve(__dirname, `../../../clients/gymbase/${client}/public/theme`);
const destDir = resolve(__dirname, "../public/theme");

if (!existsSync(srcDir)) {
  console.log(`[theme-assets] Sin assets propios para "${client}" — usando assets por defecto.`);
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true, force: true });
console.log(`[theme-assets] Assets de "${client}" copiados a public/theme/`);
