// middleware.ts — Guard de autenticación y autorización a nivel de rutas
// Reutiliza la lógica de middleware de MemberBase core

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto archivos estáticos y APIs internas
    "/((?!_next/static|_next/image|favicon.ico|theme/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
