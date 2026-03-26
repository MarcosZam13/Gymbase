// server.ts — Cliente de Supabase para Server Components y Server Actions
// Re-exporta de core + agrega helper para obtener el org_id del gym

export { createClient, getCurrentUser } from "@core/lib/supabase/server";

import { createClient as _createClient } from "@core/lib/supabase/server";

// GymBase opera como single-tenant: un deployment = un gym = una org.
// Esta función obtiene el org_id de la primera (y única) organización.
// En multi-tenant se cambiaría por una resolución por dominio o sesión.
let cachedOrgId: string | null = null;

export async function getOrgId(): Promise<string> {
  if (cachedOrgId) return cachedOrgId;

  const supabase = await _createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (error || !data) {
    // Fallback: usar variable de entorno si la tabla no existe aún
    const envOrgId = process.env.GYMBASE_ORG_ID;
    if (envOrgId) return envOrgId;
    throw new Error("No se encontró una organización. Ejecuta las migraciones de GymBase.");
  }

  cachedOrgId = data.id;
  return data.id;
}
