// member.actions.ts — Server actions para edición de datos de perfil de miembros (admin)

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser, getOrgId, createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

const createMemberSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100),
  email: z.string().email("Email inválido"),
  phone: z.string().max(20).optional().nullable(),
  plan_id: z.string().uuid("Plan inválido").optional().nullable(),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// Crea un nuevo miembro en Supabase Auth, actualiza su perfil y le asigna una membresía (solo admin)
export async function createMember(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { full_name, email, phone, plan_id, starts_at, expires_at } = parsed.data;
  const [supabase, orgId] = await Promise.all([createClient(), getOrgId()]);

  // Verificar si el email ya tiene membresía en ESTE gym
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMembership } = await supabase
      .from("org_members")
      .select("id")
      .eq("user_id", existingProfile.id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (existingMembership) return { success: false, error: "Este email ya está registrado en este gym" };
  }

  // Usar el cliente con service_role_key — auth.admin.* requiere permisos de servicio
  const adminSupabase = createAdminClient();

  // Enviar invitación con org_id en metadata para que el trigger cree org_members
  const { data: authData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role: "member", org_id: orgId },
  });
  if (inviteError) {
    console.error("[createMember] Error al invitar usuario:", inviteError.message);
    return { success: false, error: "Error al crear la cuenta. Verifica la configuración del servidor." };
  }

  const newUserId = authData.user.id;

  // Actualizar el perfil con nombre y teléfono (el trigger ya crea el registro base + org_members)
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: newUserId, email, full_name, phone: phone ?? null }, { onConflict: "id" });
  if (profileError) {
    console.error("[createMember] Error al actualizar perfil:", profileError.message);
  }

  // Garantizar que exista la fila en org_members (el trigger puede haber corrido antes del upsert)
  await supabase
    .from("org_members")
    .upsert({ user_id: newUserId, org_id: orgId, role: "member" }, { onConflict: "user_id,org_id" });

  // Crear la membresía si se seleccionó un plan
  if (plan_id) {
    const startsAt = starts_at ? new Date(starts_at).toISOString() : new Date().toISOString();
    let expiresAt: string | null = expires_at ? new Date(expires_at).toISOString() : null;

    // Si no hay fecha de vencimiento manual, calcularla según la duración del plan
    if (!expiresAt) {
      const { data: plan } = await supabase
        .from("membership_plans")
        .select("duration_days")
        .eq("id", plan_id)
        .single();
      if (plan) {
        const expDate = new Date(startsAt);
        expDate.setDate(expDate.getDate() + plan.duration_days);
        expiresAt = expDate.toISOString();
      }
    }

    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: newUserId,
      plan_id,
      status: "active",
      starts_at: startsAt,
      expires_at: expiresAt,
    });
    if (subError) {
      console.error("[createMember] Error al crear suscripción:", subError.message);
    }
  }

  revalidatePath("/admin/members");
  return { success: true, data: { id: newUserId } };
}

const updateMemberProfileSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  avatar_url: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
});

// Actualiza el nombre, teléfono y avatar_url de un miembro desde el panel de admin
export async function updateMemberProfile(
  memberId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = updateMemberProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  // Normalizar avatar_url: cadena vacía → null
  const updateData = {
    ...parsed.data,
    avatar_url: parsed.data.avatar_url || null,
  };

  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", memberId);
    if (error) throw error;
    revalidatePath(`/admin/members/${memberId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateMemberProfile] Error:", error);
    return { success: false, error: "Error al actualizar el perfil" };
  }
}

const MIME_TO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Sube una foto de perfil para un miembro desde el panel de admin y actualiza profiles.avatar_url
export async function uploadMemberAvatar(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) return { success: false, error: "Sin permisos" };

  const memberId = formData.get("memberId");
  const file = formData.get("file");

  if (typeof memberId !== "string" || !memberId) return { success: false, error: "memberId requerido" };
  if (!(file instanceof Blob)) return { success: false, error: "Archivo requerido" };

  const ext = MIME_TO_EXT[file.type];
  if (!ext) return { success: false, error: "Solo se permiten imágenes JPG, PNG o WebP" };
  if (file.size > 2 * 1024 * 1024) return { success: false, error: "La imagen no puede superar 2 MB" };

  const adminClient = createAdminClient();
  const path = `${memberId}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(path, new Uint8Array(arrayBuffer), { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[uploadMemberAvatar] Upload error:", uploadError.message);
    return { success: false, error: "Error al subir la imagen" };
  }

  const { data: { publicUrl } } = adminClient.storage.from("avatars").getPublicUrl(path);

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", memberId);

  if (updateError) {
    console.error("[uploadMemberAvatar] DB update error:", updateError.message);
    return { success: false, error: "Imagen subida pero no se pudo actualizar el perfil" };
  }

  revalidatePath("/admin/members");
  return { success: true, data: { url: publicUrl } };
}

// Cuenta membresías activas que vencen en los próximos 7 días — KPI de alerta en el dashboard admin
export async function getExpiringMembershipsCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return 0;

  const supabase = await createClient();
  const now = new Date().toISOString();
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("expires_at", now)
    .lte("expires_at", in7days);

  return count ?? 0;
}
