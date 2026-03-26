// middleware.ts — Cliente de Supabase para el middleware de Next.js
// Se copia de core en lugar de re-exportar porque el middleware requiere resolución local
export { updateSession } from "@core/lib/supabase/middleware";
