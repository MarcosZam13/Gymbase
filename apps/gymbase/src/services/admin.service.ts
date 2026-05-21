// admin.service.ts — Lógica de negocio para el panel de administración

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminDashboardStats, MemberWithSubscription } from "@/types/database";
import { buildPaginationRange, buildPaginatedResult } from "@/types/pagination";
import type { PaginationParams, PaginatedResult } from "@/types/pagination";

const SUBSCRIPTION_SELECT = `
  id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at,
  plan:membership_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at)
`;

const MEMBER_PROFILE_SELECT = `
  id, email, full_name, avatar_url, phone, created_at, updated_at,
  active_subscription:subscriptions(${SUBSCRIPTION_SELECT})
`;

// Obtiene los IDs de todos los miembros (role='member') del gym actual vía org_members (RLS-scoped)
async function getMemberIds(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("role", "member");
  return (data ?? []).map((m) => m.user_id as string);
}

// Obtiene los KPIs del dashboard ejecutando las queries en paralelo
export async function fetchAdminStats(
  supabase: SupabaseClient
): Promise<AdminDashboardStats> {
  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const [
    { count: activeMembers },
    { count: pendingPayments },
    { data: revenueData },
    { count: publishedContent },
    { count: newMembers },
  ] = await Promise.all([
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active").gt("expires_at", now.toISOString()),
    supabase.from("payment_proofs").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payment_proofs").select("amount").eq("status", "approved").gte("created_at", startOfMonth).lt("created_at", startOfNextMonth),
    supabase.from("content").select("*", { count: "exact", head: true }).eq("is_published", true),
    // Contar miembros nuevos vía org_members (scoped al org actual por RLS)
    supabase.from("org_members").select("*", { count: "exact", head: true }).eq("role", "member").gte("joined_at", thirtyDaysAgo),
  ]);

  const monthlyRevenue = (revenueData ?? []).reduce(
    (sum, proof) => sum + (proof.amount ?? 0),
    0
  );

  return {
    activeMembers: activeMembers ?? 0,
    pendingPayments: pendingPayments ?? 0,
    monthlyRevenue,
    publishedContent: publishedContent ?? 0,
    newMembersLast30Days: newMembers ?? 0,
  };
}

// Obtiene todos los miembros del gym actual con su suscripción activa
export async function fetchMembers(
  supabase: SupabaseClient
): Promise<MemberWithSubscription[]> {
  const memberIds = await getMemberIds(supabase);
  if (memberIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(MEMBER_PROFILE_SELECT)
    .in("id", memberIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ ...p, role: "member" })) as unknown as MemberWithSubscription[];
}

// ─── Tipos para el filtro de estado en la tabla de miembros ──────────────────
export type MemberStatusFilter = "all" | "active" | "expiring" | "expired";

export interface MembersQueryParams extends PaginationParams {
  search?: string;
  status?: MemberStatusFilter;
  planId?: string;
}

// Obtiene IDs de miembros cuya suscripción coincide con el filtro de estado
async function getMemberIdsByStatus(
  supabase: SupabaseClient,
  status: MemberStatusFilter,
  planId?: string
): Promise<string[]> {
  const now = new Date().toISOString();
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (status === "active") {
    let q = supabase.from("subscriptions").select("user_id").eq("status", "active").gt("expires_at", in7days);
    if (planId) q = q.eq("plan_id", planId);
    const { data } = await q;
    return [...new Set((data ?? []).map((s) => s.user_id as string))];
  }

  if (status === "expiring") {
    let q = supabase.from("subscriptions").select("user_id").eq("status", "active").gte("expires_at", now).lte("expires_at", in7days);
    if (planId) q = q.eq("plan_id", planId);
    const { data } = await q;
    return [...new Set((data ?? []).map((s) => s.user_id as string))];
  }

  if (status === "expired") {
    let q1 = supabase.from("subscriptions").select("user_id").in("status", ["expired", "cancelled"]);
    let q2 = supabase.from("subscriptions").select("user_id").eq("status", "active").lt("expires_at", now);
    if (planId) { q1 = q1.eq("plan_id", planId); q2 = q2.eq("plan_id", planId); }
    const [{ data: d1 }, { data: d2 }] = await Promise.all([q1, q2]);
    return [...new Set([...(d1 ?? []), ...(d2 ?? [])].map((s) => s.user_id as string))];
  }

  if (planId) {
    const { data } = await supabase.from("subscriptions").select("user_id").eq("plan_id", planId);
    return [...new Set((data ?? []).map((s) => s.user_id as string))];
  }

  return [];
}

// Obtiene miembros paginados con filtros de búsqueda, estado y plan (solo admin)
export async function fetchMembersPaginated(
  supabase: SupabaseClient,
  params: MembersQueryParams
): Promise<PaginatedResult<MemberWithSubscription>> {
  const { from, to } = buildPaginationRange(params);

  // Paso 1: IDs de miembros del org actual (role='member', scoped por RLS)
  const orgMemberIds = await getMemberIds(supabase);
  if (orgMemberIds.length === 0) return buildPaginatedResult([], 0, params);

  // Paso 2: Filtrar por estado/plan si aplica
  const hasSubFilter = (params.status && params.status !== "all") || Boolean(params.planId);
  let userIdFilter: string[] = orgMemberIds;

  if (hasSubFilter) {
    const statusIds = await getMemberIdsByStatus(supabase, params.status ?? "all", params.planId);
    // Intersección: miembros del org Y que coinciden con el filtro de estado
    const statusSet = new Set(statusIds);
    userIdFilter = orgMemberIds.filter((id) => statusSet.has(id));
    if (userIdFilter.length === 0) return buildPaginatedResult([], 0, params);
  }

  // Paso 3: Paginar profiles con los IDs filtrados
  let countQ = supabase.from("profiles").select("id", { count: "exact", head: true }).in("id", userIdFilter);
  let dataQ = supabase.from("profiles").select(MEMBER_PROFILE_SELECT).in("id", userIdFilter).order("created_at", { ascending: false }).range(from, to);

  if (params.search?.trim()) {
    const term = params.search.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
    const filter = `full_name.ilike.%${term}%,email.ilike.%${term}%`;
    countQ = countQ.or(filter);
    dataQ = dataQ.or(filter);
  }

  const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
  if (error) throw new Error(error.message);

  const members = (data ?? []).map((p) => ({ ...p, role: "member" })) as unknown as MemberWithSubscription[];
  return buildPaginatedResult(members, count ?? 0, params);
}

// Obtiene el perfil completo de un miembro específico
export async function fetchMemberById(
  supabase: SupabaseClient,
  memberId: string
): Promise<MemberWithSubscription | null> {
  // Verificar que el memberId es miembro de este org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", memberId)
    .maybeSingle();

  if (!membership) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(MEMBER_PROFILE_SELECT)
    .eq("id", memberId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, role: membership.role } as unknown as MemberWithSubscription;
}
