// middleware.ts — Middleware de autenticación, autorización y resolución de tenant para GymBase

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Cache en memoria del proceso — evita queries a DB en cada request para datos que cambian rarísimo.
const orgCache = new Map<string, { orgId: string; expiresAt: number }>();
const ORG_ID_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Resuelve el org_id a partir del hostname.
 * Cache: 5 min. Para localhost/dev usa la env var GYMBASE_ORG_ID.
 */
async function resolveOrgId(hostname: string): Promise<string | null> {
  const now    = Date.now();
  const cached = orgCache.get(hostname);

  if (cached && cached.expiresAt > now) return cached.orgId;

  let orgId: string | null = null;

  if (
    hostname === "localhost" ||
    hostname.startsWith("localhost:") ||
    hostname.includes(".vercel.app") ||
    hostname.includes("127.0.0.1")
  ) {
    orgId = process.env.GYMBASE_ORG_ID ?? "00000000-0000-0000-0000-000000000001";
  } else {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_org_id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ p_hostname: hostname }),
      });
      if (res.ok) {
        const data = await res.json();
        orgId = typeof data === "string" ? data : null;
      }
    } catch {
      orgId = null;
    }
  }

  if (orgId) {
    orgCache.set(hostname, { orgId, expiresAt: now + ORG_ID_CACHE_TTL_MS });
  }

  return orgId;
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const hostname = request.headers.get("host") ?? "localhost";
  const path     = request.nextUrl.pathname;

  // 1. Resolver org_id desde el hostname
  const orgId = await resolveOrgId(hostname);

  // 2. Gym no encontrado → redirigir (el matcher ya excluye /gym-not-found)
  if (!orgId) {
    const url = request.nextUrl.clone();
    url.pathname = "/gym-not-found";
    return NextResponse.redirect(url);
  }

  // 3. Enriquecer headers del request con x-org-id
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-org-id", orgId);

  // 4. Crear response inicial con los headers enriquecidos
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // 5. Crear cliente Supabase para autenticación
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
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
    const isProtectedRoute =
      path.startsWith("/admin") ||
      path.startsWith("/portal") ||
      path.startsWith("/owner");

    const needsMembershipFetch =
      isProtectedRoute ||
      path === "/login" ||
      path === "/register";

    let role: string | null = null;

    if (needsMembershipFetch) {
      // Buscar membresía del usuario en el gym actual
      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .maybeSingle();

      if (membership) {
        role = membership.role;
      } else if (isProtectedRoute) {
        // Sin fila en org_members → auto-join como 'member' (Google OAuth u otro gym)
        const { error: joinError } = await supabase
          .from("org_members")
          .insert({ user_id: user.id, org_id: orgId, role: "member" });

        if (!joinError) {
          role = "member";
        }
      }
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

  supabaseResponse.headers.set("x-org-id", orgId);
  return supabaseResponse;
}
