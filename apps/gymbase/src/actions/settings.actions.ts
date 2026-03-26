// settings.actions.ts — Server actions para configuración del gym y gestión de administradores

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
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

// Obtiene la configuración actual del gym desde la tabla organizations
export async function getOrgSettings(): Promise<OrgSettings | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

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

// Actualiza la configuración del gym en la tabla organizations
export async function updateOrgSettings(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

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

// Lista todos los usuarios con rol admin en la organización
export async function getAdmins(): Promise<AdminProfile[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];

  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("role", "admin")
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as AdminProfile[];
  } catch (error) {
    console.error("[getAdmins] Error:", error);
    return [];
  }
}

// Promueve a admin un usuario existente o envía invitación si no existe
export async function promoteToAdmin(email: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const emailParsed = z.string().email("Email inválido").safeParse(email);
  if (!emailParsed.success) return { success: false, error: "Email inválido" };

  const supabase = await createClient();
  try {
    // Verificar si el usuario ya existe en profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", emailParsed.data)
      .maybeSingle();

    if (profile) {
      if (profile.role === "admin") {
        return { success: false, error: "Este usuario ya es administrador" };
      }
      // Usuario existe: promover a admin
      const { error } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", profile.id);
      if (error) throw error;
    } else {
      // Usuario no existe: enviar invitación
      // NOTA: Requiere SUPABASE_SERVICE_ROLE_KEY en el servidor
      const { error } = await supabase.auth.admin.inviteUserByEmail(emailParsed.data, {
        data: { role: "admin" },
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

// Revoca el rol admin de un usuario, lo degrada a miembro
export async function revokeAdmin(userId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  // No permitir que un admin se quite sus propios permisos
  if (user.id === userId) return { success: false, error: "No puedes revocar tus propios permisos de administrador" };

  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "member" })
      .eq("id", userId);
    if (error) throw error;
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("[revokeAdmin] Error:", error);
    return { success: false, error: "Error al revocar permisos" };
  }
}
