// settings.actions.ts — Server actions para configuración del gym y gestión de administradores

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser, getOrgId, createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

// Schema de validación para actualizar la configuración del gym
const orgSettingsSchema = z.object({
  gym_name: z.string().min(1, "El nombre es requerido").max(100).optional().nullable(),
  slogan: z.string().max(200).optional().nullable(),
  sinpe_number: z.string().max(20).optional().nullable(),
  sinpe_name: z.string().max(100).optional().nullable(),
  max_capacity: z.number().int().min(1).max(10000).optional().nullable(),
  cancel_minutes: z.number().int().min(0).max(1440).optional().nullable(),
});

export type OrgSettings = {
  id: string;
  gym_name: string | null;
  slogan: string | null;
  sinpe_number: string | null;
  sinpe_name: string | null;
  max_capacity: number | null;
  cancel_minutes: number | null;
};

export type AdminProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
};

// Obtiene la configuración actual del gym — solo el owner puede verla y editarla
export async function getOrgSettings(): Promise<OrgSettings | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return null;

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, gym_name, slogan, sinpe_number, sinpe_name, max_capacity, cancel_minutes")
      .eq("id", orgId)
      .single();
    if (error) throw error;
    return data as OrgSettings;
  } catch (error) {
    console.error("[getOrgSettings] Error:", error);
    return null;
  }
}

// Retorna datos públicos del gym para mostrar en el portal — accesible por cualquier usuario autenticado
export async function getPublicOrgInfo(): Promise<{
  gym_name: string | null;
  sinpe_number: string | null;
  sinpe_name: string | null;
} | null> {
  // Usamos admin client porque miembros no tienen RLS access a la tabla organizations
  const supabase = createAdminClient();
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from("organizations")
      .select("gym_name, sinpe_number, sinpe_name")
      .eq("id", orgId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[getPublicOrgInfo] Error:", error);
    return null;
  }
}

// Actualiza la configuración del gym — solo el owner puede modificarla
export async function updateOrgSettings(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = orgSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { error } = await supabase
      .from("organizations")
      .update(parsed.data)
      .eq("id", orgId);
    if (error) throw error;
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[updateOrgSettings] Error:", error);
    return { success: false, error: "Error al guardar la configuración" };
  }
}

// Lista todos los usuarios con rol admin u owner en el gym actual
export async function getAdmins(): Promise<AdminProfile[]> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) return [];

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from("org_members")
      .select("role, joined_at, profiles!inner(id, full_name, email)")
      .eq("org_id", orgId)
      .in("role", ["admin", "owner"])
      .order("joined_at");
    if (error) throw error;
    return (data ?? []).map((m) => {
      const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { id: string; full_name: string | null; email: string };
      return { id: p.id, full_name: p.full_name, email: p.email, role: m.role, created_at: m.joined_at };
    });
  } catch (error) {
    console.error("[getAdmins] Error:", error);
    return [];
  }
}

// Promueve a admin un usuario existente o envía invitación si no existe
export async function promoteToAdmin(email: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return { success: false, error: "Sin permisos" };
  }

  const emailParsed = z.string().email("Email inválido").safeParse(email);
  if (!emailParsed.success) return { success: false, error: "Email inválido" };

  const supabase = await createClient();
  const orgId = await getOrgId();
  try {
    // Buscar el profile por email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", emailParsed.data)
      .maybeSingle();

    if (profile) {
      // Verificar membresía actual en este gym
      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", profile.id)
        .eq("org_id", orgId)
        .maybeSingle();

      if (membership?.role === "admin") return { success: false, error: "Este usuario ya es administrador" };
      if (membership?.role === "owner") return { success: false, error: "Este usuario ya es owner" };

      // Upsert a admin en este gym
      const { error } = await supabase
        .from("org_members")
        .upsert({ user_id: profile.id, org_id: orgId, role: "admin" }, { onConflict: "user_id,org_id" });
      if (error) throw error;
    } else {
      // Usuario no existe: enviar invitación con org_id y role en metadata
      const adminSupabase = createAdminClient();
      const { error } = await adminSupabase.auth.admin.inviteUserByEmail(emailParsed.data, {
        data: { role: "admin", org_id: orgId },
      });
      if (error) throw error;
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[promoteToAdmin] Error:", error);
    return { success: false, error: "Error al agregar administrador. Verifica la configuración del servidor." };
  }
}

// Promueve a owner un usuario existente — solo el owner puede crear más owners
export async function promoteToOwner(email: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return { success: false, error: "Sin permisos" };

  const emailParsed = z.string().email("Email inválido").safeParse(email);
  if (!emailParsed.success) return { success: false, error: "Email inválido" };

  const supabase = await createClient();
  const orgId = await getOrgId();
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", emailParsed.data)
      .maybeSingle();

    if (profile) {
      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", profile.id)
        .eq("org_id", orgId)
        .maybeSingle();

      if (membership?.role === "owner") return { success: false, error: "Este usuario ya es owner" };

      const { error } = await supabase
        .from("org_members")
        .upsert({ user_id: profile.id, org_id: orgId, role: "owner" }, { onConflict: "user_id,org_id" });
      if (error) throw error;
    } else {
      const adminSupabase = createAdminClient();
      const { error } = await adminSupabase.auth.admin.inviteUserByEmail(emailParsed.data, {
        data: { role: "owner", org_id: orgId },
      });
      if (error) throw error;
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[promoteToOwner] Error:", error);
    return { success: false, error: "Error al agregar owner. Verifica la configuración del servidor." };
  }
}

// Busca miembros del gym actual por nombre o email
export async function searchMembers(
  query: string,
): Promise<Array<{ id: string; full_name: string | null; email: string; role: string }>> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) return [];
  if (query.trim().length < 2) return [];

  const supabase = await createClient();
  const orgId = await getOrgId();
  try {
    const { data } = await supabase
      .from("org_members")
      .select("role, profiles!inner(id, full_name, email)")
      .eq("org_id", orgId)
      .neq("role", "owner")
      .or(`profiles.full_name.ilike.%${query.replace(/[%_\\]/g, (c) => `\\${c}`)}%,profiles.email.ilike.%${query.replace(/[%_\\]/g, (c) => `\\${c}`)}%`)
      .order("role")
      .limit(8);

    return (data ?? []).map((m) => {
      const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { id: string; full_name: string | null; email: string };
      return { id: p.id, full_name: p.full_name, email: p.email, role: m.role };
    });
  } catch {
    return [];
  }
}

// Revoca el rol privilegiado de un usuario, lo degrada a miembro en este gym
export async function revokeAdmin(userId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return { success: false, error: "Sin permisos" };
  }

  if (user.id === userId) {
    return { success: false, error: "No puedes revocar tus propios permisos" };
  }

  const supabase = await createClient();
  const orgId = await getOrgId();
  try {
    const { data: target } = await supabase
      .from("org_members")
      .select("role")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .single();

    if (user.role === "admin" && target?.role === "owner") {
      return { success: false, error: "No tienes permisos para revocar a un owner" };
    }

    const { error } = await supabase
      .from("org_members")
      .update({ role: "member" })
      .eq("user_id", userId)
      .eq("org_id", orgId);
    if (error) throw error;
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[revokeAdmin] Error:", error);
    return { success: false, error: "Error al revocar permisos" };
  }
}

// ─── Upload de avatar propio (miembro actualiza su propia foto) ───────────────

const MIME_TO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadMyAvatar(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const file = formData.get("file");
  if (!(file instanceof Blob)) return { success: false, error: "Archivo requerido" };

  const ext = MIME_TO_EXT[file.type];
  if (!ext) return { success: false, error: "Solo se permiten imágenes JPG, PNG o WebP" };
  if (file.size > 2 * 1024 * 1024) return { success: false, error: "La imagen no puede superar 2 MB" };

  const adminClient = createAdminClient();
  const path = `${user.id}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(path, new Uint8Array(arrayBuffer), { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[uploadMyAvatar] Upload error:", uploadError.message);
    return { success: false, error: "Error al subir la imagen" };
  }

  const { data: { publicUrl } } = adminClient.storage.from("avatars").getPublicUrl(path);

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("[uploadMyAvatar] DB update error:", updateError.message);
    return { success: false, error: "Imagen subida pero no se pudo actualizar el perfil" };
  }

  revalidatePath("/portal/profile");
  return { success: true, data: { url: publicUrl } };
}
