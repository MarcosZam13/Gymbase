// server.ts — Cliente de Supabase para Server Components, Server Actions y helpers de multi-tenant

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Crea una instancia del cliente de Supabase para el contexto del servidor.
// Lee las cookies de la request actual para mantener la sesión del usuario.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll puede fallar en Server Components de solo lectura — es esperado
          }
        },
      },
    }
  );
}

// Obtiene el perfil del usuario autenticado actual desde la base de datos.
// cache() deduplica la llamada dentro del mismo render tree para evitar rate limits de auth API.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, phone, created_at, updated_at")
    .eq("id", user.id)
    .single();

  return profile;
});

// Cliente con service_role_key para operaciones admin (auth.admin.*)
// Solo usar en Server Actions con verificación de rol previa — nunca exponer al cliente
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurado. Agrégalo al archivo .env.local");
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Obtiene el org_id del gym que corresponde al request actual.
// En multi-tenant: lee el header x-org-id inyectado por el middleware.
// Fallback para entornos sin middleware configurado: variable de entorno GYMBASE_ORG_ID.
export async function getOrgId(): Promise<string> {
  const headersList = await headers();
  const orgId = headersList.get("x-org-id");

  if (orgId) return orgId;

  const envOrgId = process.env.GYMBASE_ORG_ID;
  if (envOrgId) return envOrgId;

  throw new Error(
    "No se pudo determinar el org_id. Verifica la configuración del middleware y GYMBASE_ORG_ID."
  );
}
