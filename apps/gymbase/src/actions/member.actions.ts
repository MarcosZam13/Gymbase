// member.actions.ts — Server actions para edición de datos de perfil de miembros (admin)

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

const updateMemberProfileSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
});

// Actualiza el nombre y teléfono de un miembro desde el panel de admin
export async function updateMemberProfile(
  memberId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const parsed = updateMemberProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", memberId);
    if (error) throw error;
    revalidatePath(`/admin/members/${memberId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateMemberProfile] Error:", error);
    return { success: false, error: "Error al actualizar el perfil" };
  }
}
