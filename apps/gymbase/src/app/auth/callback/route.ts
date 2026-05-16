// auth/callback/route.ts — Route handler para OAuth (Google) e invitaciones por email
// Maneja dos flujos:
//   1. OAuth (Google): llega con ?code=...
//   2. Invitaciones / reset de contraseña: llega con ?token_hash=...&type=invite|recovery|email

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "invite" | "recovery" | "email" | null;
  const next = searchParams.get("next") ?? "/portal/dashboard";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
      global: {
        headers: process.env.GYMBASE_ORG_ID ? { "x-org-id": process.env.GYMBASE_ORG_ID } : {},
      },
    }
  );

  // ── Flujo 1: OAuth (Google) ──────────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[OAuth callback] Error al intercambiar código:", error.message);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login?error=oauth_failed`);

    const orgId = process.env.GYMBASE_ORG_ID;

    if (orgId) {
      // Verificar/crear membresía en este gym (auto-join para Google OAuth)
      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .maybeSingle();

      if (!membership) {
        // Primera vez en este gym — crear fila como miembro
        await supabase.from("org_members").insert({ user_id: user.id, org_id: orgId, role: "member" });
        return NextResponse.redirect(`${origin}${next}`);
      }

      const role = membership.role;
      const destination = role === "owner" ? "/owner/dashboard" : role === "admin" ? "/admin" : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // ── Flujo 2: Invitación o recuperación de contraseña ────────────────────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      console.error("[Email callback] Error al verificar token:", error.message);
      return NextResponse.redirect(`${origin}/login?error=invalid_link`);
    }

    // invite y recovery → establecer/cambiar contraseña
    // email → confirmación de cuenta → ir al dashboard
    const destination = type === "email" ? next : "/reset-password";
    return NextResponse.redirect(`${origin}${destination}`);
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
