// content.actions.ts — Server actions para gestión y acceso a contenido (CRUD + gym-specific)

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import { createContentSchema, updateContentSchema } from "@/lib/validations/content";
import { buildPaginationRange, buildPaginatedResult } from "@/types/pagination";
import type { ActionResult, Content, MembershipPlan } from "@/types/database";
import type { PaginatedResult } from "@/types/pagination";

// ─── Contenido paginado para el portal ───────────────────────────────────────

// RLS filtra automáticamente según rol y membresía activa — igual que getContentForUser
export async function getContentForUserPaginated(params: {
  page: number;
  pageSize: number;
  search?: string;
  categorySlug?: string;
}): Promise<PaginatedResult<Content>> {
  const user = await getCurrentUser();
  const empty = buildPaginatedResult([], 0, params);
  if (!user) return empty;

  const supabase = await createClient();
  const { from, to } = buildPaginationRange(params);

  const CONTENT_SELECT = `
    id, title, description, type, body, media_url, thumbnail_url,
    is_published, sort_order, created_by, created_at, updated_at, category_id,
    category:content_categories(id, name, slug, color),
    plans:content_plans(plan_id)
  `;

  try {
    let countQ = supabase.from("content").select("*", { count: "exact", head: true });
    let dataQ = supabase.from("content").select(CONTENT_SELECT).order("sort_order", { ascending: true }).range(from, to);

    if (params.search?.trim()) {
      const term = params.search.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
      const f = `title.ilike.%${term}%,description.ilike.%${term}%`;
      countQ = countQ.or(f);
      dataQ = dataQ.or(f);
    }

    if (params.categorySlug) {
      // La RLS no permite filtrar directamente por slug de categoría — filtramos por join
      const { data: catRow } = await supabase
        .from("content_categories")
        .select("id")
        .eq("slug", params.categorySlug)
        .single();
      if (catRow) {
        countQ = countQ.eq("category_id", catRow.id);
        dataQ = dataQ.eq("category_id", catRow.id);
      } else {
        return empty;
      }
    }

    const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
    if (error) throw new Error(error.message);

    return buildPaginatedResult((data ?? []) as unknown as Content[], count ?? 0, params);
  } catch (error) {
    console.error("[getContentForUserPaginated] Error:", error);
    return empty;
  }
}

// Obtiene un contenido por ID con sus plan_ids para la vista de edición admin
export async function getContentByIdForAdmin(
  id: string
): Promise<(Content & { plan_ids: string[] }) | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content")
    .select(`
      id, title, description, type, body, media_url, thumbnail_url,
      is_published, sort_order, created_by, created_at, updated_at, category_id,
      post_plans:content_plans(plan_id)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const rawPlans = (data.post_plans as Array<{ plan_id: string }>) ?? [];
  return {
    ...(data as unknown as Content),
    plan_ids: rawPlans.map((p) => p.plan_id),
  };
}

// ─── Favoritos del miembro (server-side fetch) ────────────────────────────────

// Retorna los IDs de contenido que el usuario actual tiene marcado como favorito
export async function getMyFavoriteIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("content_favorites")
    .select("content_id")
    .eq("user_id", user.id);

  return (data ?? []).map((r) => r.content_id);
}

// ─── Conteos de vistas (admin) ────────────────────────────────────────────────

// Retorna un mapa contentId → total_views — solo admins/owners
// Usa RPC con GROUP BY en PostgreSQL — evita traer todas las filas al servidor Node
export async function getAllContentViewCounts(): Promise<Record<string, number>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return {};

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_content_view_counts");

  if (!data) return {};

  return Object.fromEntries(
    (data as Array<{ content_id: string; view_count: number }>).map(
      (r) => [r.content_id, Number(r.view_count)]
    )
  );
}

// ─── CRUD base (portado desde core) ──────────────────────────────────────────

// Obtiene el contenido accesible para el usuario actual — RLS filtra por rol y membresía
export async function getContentForUser(): Promise<Content[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content")
    .select(`
      id, title, description, type, body, media_url, thumbnail_url,
      is_published, sort_order, created_by, created_at, updated_at,
      category_id,
      category:content_categories(id, name, slug, color),
      plans:content_plans(plan_id)
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getContentForUser] Error:", error.message);
    return [];
  }

  return data as unknown as Content[];
}

// Obtiene un contenido por ID con validación de acceso vía RLS
export async function getContentById(id: string): Promise<Content | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content")
    .select(`
      id, title, description, type, body, media_url, thumbnail_url,
      is_published, sort_order, created_by, created_at, updated_at,
      plans:membership_plans!content_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at)
    `)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as unknown as Content;
}

// Crea un nuevo contenido y lo asocia a los planes seleccionados (solo admin)
export async function createContent(formData: unknown): Promise<ActionResult<Content>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = createContentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { plan_ids, ...contentData } = parsed.data;
  const supabase = await createClient();

  const { data: content, error: contentError } = await supabase
    .from("content")
    .insert({
      title: contentData.title,
      description: contentData.description || null,
      type: contentData.type,
      body: contentData.body || null,
      media_url: contentData.media_url || null,
      thumbnail_url: contentData.thumbnail_url || null,
      is_published: contentData.is_published,
      sort_order: contentData.sort_order,
      category_id: contentData.category_id || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (contentError) {
    console.error("[createContent] Error al crear:", contentError.message);
    return { success: false, error: "Error al crear el contenido." };
  }

  const { error: plansError } = await supabase
    .from("content_plans")
    .insert(plan_ids.map((plan_id) => ({ content_id: content.id, plan_id })));

  if (plansError) {
    console.error("[createContent] Error al asociar planes:", plansError.message);
    return { success: false, error: "Contenido creado pero error al asociar planes." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/portal/content");
  return { success: true, data: content as Content };
}

// Actualiza un contenido existente (solo admin)
export async function updateContent(formData: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = updateContentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { id, plan_ids, ...updates } = parsed.data;
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("content")
    .update({
      ...updates,
      description: updates.description || null,
      body: updates.body || null,
      media_url: updates.media_url || null,
      thumbnail_url: updates.thumbnail_url || null,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[updateContent] Error:", updateError.message);
    return { success: false, error: "Error al actualizar el contenido." };
  }

  if (plan_ids && plan_ids.length > 0) {
    await supabase.from("content_plans").delete().eq("content_id", id);
    await supabase.from("content_plans").insert(
      plan_ids.map((plan_id) => ({ content_id: id, plan_id }))
    );
  }

  revalidatePath("/admin/content");
  revalidatePath("/portal/content");
  return { success: true };
}

// Elimina un contenido y sus relaciones con planes (solo admin)
export async function deleteContent(contentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  await supabase.from("content_plans").delete().eq("content_id", contentId);

  const { error } = await supabase.from("content").delete().eq("id", contentId);
  if (error) {
    console.error("[deleteContent] Error:", error.message);
    return { success: false, error: "Error al eliminar el contenido." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/portal/content");
  return { success: true };
}

// Cambia el estado publicado/borrador de un contenido (solo admin)
export async function togglePublished(contentId: string, isPublished: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("content")
    .update({ is_published: isPublished })
    .eq("id", contentId);

  if (error) {
    console.error("[togglePublished] Error:", error.message);
    return { success: false, error: "Error al cambiar el estado del contenido." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/portal/content");
  return { success: true };
}

// ─── Query admin extendida con conteos ────────────────────────────────────────

// Retorna todo el contenido para el admin con campo view_count y plan_ids inyectados
export async function getAllContentWithViews(): Promise<(Content & { view_count: number; plan_ids: string[] })[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return [];

  const supabase = await createClient();

  const [{ data: contentData }, viewCounts] = await Promise.all([
    supabase
      .from("content")
      .select(`
        id, title, description, type, body, media_url, thumbnail_url,
        is_published, sort_order, created_by, created_at, updated_at,
        category_id,
        plans:membership_plans!content_plans(id, name),
        post_plans:content_plans(plan_id)
      `)
      .order("sort_order", { ascending: true }),
    getAllContentViewCounts(),
  ]);

  if (!contentData) return [];

  return contentData.map((item) => {
    const rawPlans = (item.post_plans as Array<{ plan_id: string }>) ?? [];
    return {
      ...(item as unknown as Content),
      plans: (item.plans as unknown as MembershipPlan[]) ?? [],
      view_count: viewCounts[item.id] ?? 0,
      plan_ids: rawPlans.map((p) => p.plan_id),
    };
  });
}

// ─── Upload de thumbnail a content-media ─────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadContentThumbnail(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) return { success: false, error: "Sin permisos" };

  const file = formData.get("file");
  if (!(file instanceof Blob)) return { success: false, error: "Archivo requerido" };

  const ext = MIME_TO_EXT[file.type];
  if (!ext) return { success: false, error: "Solo se permiten imágenes JPG, PNG o WebP" };
  if (file.size > 2 * 1024 * 1024) return { success: false, error: "La imagen no puede superar 2 MB" };

  const adminClient = createAdminClient();
  const path = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await adminClient.storage
    .from("content-media")
    .upload(path, new Uint8Array(arrayBuffer), { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[uploadContentThumbnail] Upload error:", uploadError.message);
    return { success: false, error: "Error al subir la imagen" };
  }

  const { data: { publicUrl } } = adminClient.storage.from("content-media").getPublicUrl(path);
  return { success: true, data: { url: publicUrl } };
}
