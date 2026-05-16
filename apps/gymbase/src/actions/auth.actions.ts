// auth.actions.ts — Acciones de autenticación; signUp overrideado para pasar org_id (multi-tenant)

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getOrgId } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import type { ActionResult } from "@/types/database";

const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

export async function signIn(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();

  const { data: attemptCount, error: rpcError } = await supabase.rpc(
    "count_recent_login_attempts",
    { p_identifier: parsed.data.email, p_minutes: RATE_LIMIT_WINDOW_MINUTES }
  );

  if (!rpcError && attemptCount >= MAX_LOGIN_ATTEMPTS) {
    return {
      success: false,
      error: `Demasiados intentos fallidos. Espera ${RATE_LIMIT_WINDOW_MINUTES} minutos antes de intentar de nuevo.`,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    await supabase.from("login_attempts").insert({ identifier: parsed.data.email });
    await supabase.rpc("cleanup_old_login_attempts");
    console.error("[signIn] Error de autenticación:", error.message);
    return { success: false, error: "Correo o contraseña incorrectos" };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Error al obtener la sesión" };

  const orgId = await getOrgId();
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  const role = membership?.role ?? "member";
  redirect(role === "owner" ? "/owner/dashboard" : role === "admin" ? "/admin" : "/portal/dashboard");
}

// Override: pasa org_id en options.data para que el trigger handle_new_user()
// lo asigne al perfil — sin esto, nuevos usuarios quedan sin org_id y son invisibles para RLS
export async function signUp(formData: FormData): Promise<ActionResult> {
  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const [supabase, orgId] = await Promise.all([createClient(), getOrgId()]);
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, org_id: orgId },
    },
  });

  if (error) {
    console.error("[signUp] Error al registrar:", error.message, error.code);
    if (error.message.includes("already registered") || error.code === "user_already_exists") {
      return { success: false, error: "Este correo ya está registrado. Inicia sesión o usa '¿Olvidaste tu contraseña?'." };
    }
    if ((error.message.includes("Signup") && error.message.includes("disabled")) || error.code === "signup_disabled") {
      return { success: false, error: "El registro público no está habilitado. Contacta al administrador para recibir una invitación." };
    }
    if (error.message.includes("rate limit") || error.code === "over_email_send_rate_limit") {
      return { success: false, error: "Demasiados intentos. Espera unos minutos antes de intentar de nuevo." };
    }
    if (error.message.includes("password") || error.code === "weak_password") {
      return { success: false, error: "La contraseña es demasiado débil. Usa al menos 6 caracteres." };
    }
    if (error.message.includes("email") && error.message.includes("invalid")) {
      return { success: false, error: "El formato del correo electrónico no es válido." };
    }
    return { success: false, error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  redirect("/portal/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const emailParsed = z.string().email("Correo inválido").safeParse(email);
  if (!emailParsed.success) return { success: false, error: "Correo inválido" };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(emailParsed.data, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    console.error("[requestPasswordReset] Error:", error.message);
  }
  return { success: true };
}

export async function updatePassword(newPassword: string): Promise<ActionResult> {
  const parsed = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").safeParse(newPassword);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });

  if (error) {
    console.error("[updatePassword] Error:", error.message);
    return { success: false, error: "Error al actualizar la contraseña. El enlace puede haber expirado." };
  }
  return { success: true };
}
