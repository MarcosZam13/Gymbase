// middleware.ts — Middleware de autenticación y autorización para GymBase
// Extiende el core con soporte para el rol 'owner' y la ruta /owner/*

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Sincronizar cookies entre request y response para mantener la sesión activa
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() verifica el token con el servidor — no usar getSession() aquí
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const redirect = (to: string): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    return NextResponse.redirect(url);
  };

  // Rutas protegidas sin sesión → login
  if (
    !user &&
    (path.startsWith("/admin") || path.startsWith("/portal") || path.startsWith("/owner"))
  ) {
    return redirect("/login");
  }

  if (user) {
    // Obtener rol solo cuando la ruta lo requiere para no hacer una query extra en cada request de portal
    const needsRoleCheck =
      path.startsWith("/admin") ||
      path.startsWith("/owner") ||
      path === "/login" ||
      path === "/register";

    let role: string | null = null;

    if (needsRoleCheck) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? null;
    }

    // Redirigir desde login/register según rol
    if (path === "/login" || path === "/register") {
      if (role === "owner") return redirect("/owner/dashboard");
      if (role === "admin") return redirect("/admin");
      return redirect("/portal/dashboard");
    }

    // /owner/* — exclusivo para owners
    if (path.startsWith("/owner")) {
      if (role !== "owner") {
        return redirect(role === "admin" ? "/admin" : "/portal/dashboard");
      }
    }

    // /admin/* — accesible para admin y owner
    if (path.startsWith("/admin")) {
      if (role !== "admin" && role !== "owner") {
        return redirect("/portal/dashboard");
      }
    }
  }

  return supabaseResponse;
}
