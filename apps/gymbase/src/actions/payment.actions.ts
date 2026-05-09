// payment.actions.ts — Server actions para pagos, suscripciones y comprobantes de pago

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import { buildPaginationRange, buildPaginatedResult } from "@/types/pagination";
import type { ActionResult, PaymentProofWithDetails, Subscription } from "@/types/database";
import type { PaginatedResult } from "@/types/pagination";

export type PaymentStatusFilter = "all" | "pending" | "approved" | "rejected";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const PAYMENT_SELECT = `
  id, subscription_id, user_id, file_url, file_path, amount,
  payment_method, notes, status, reviewed_by, reviewed_at,
  rejection_reason, created_at,
  profile:profiles!payment_proofs_user_id_fkey(id, full_name, email, avatar_url),
  subscription:subscriptions!payment_proofs_subscription_id_fkey(
    id, status, starts_at, expires_at,
    plan:membership_plans(id, name, price, currency, duration_days)
  )
`;

// Obtiene la suscripción más reciente del usuario (activa, pendiente o cancelada)
export async function getUserSubscription(): Promise<Subscription | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at, plan:membership_plans(id, name, price, currency, duration_days, features)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getUserSubscription] Error:", error.message);
    return null;
  }

  return data as Subscription | null;
}

// Crea una suscripción en estado pendiente — el miembro debe subir comprobante después
export async function createSubscription(planId: string): Promise<ActionResult<{ subscriptionId: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();

  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("id")
    .eq("id", planId)
    .eq("is_active", true)
    .single();

  if (planError || !plan) return { success: false, error: "Plan no disponible" };

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ user_id: user.id, plan_id: planId, status: "pending" })
    .select("id")
    .single();

  if (error) {
    console.error("[createSubscription] Error:", error.message);
    return { success: false, error: "Error al crear la suscripción" };
  }

  revalidatePath("/portal");
  return { success: true, data: { subscriptionId: data.id } };
}

// Cancela una suscripción — la RLS permite que el miembro cancele solo la propia
export async function cancelSubscription(subscriptionId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", subscriptionId);

  if (error) {
    console.error("[cancelSubscription] Error:", error.message);
    return { success: false, error: "Error al cancelar la suscripción" };
  }

  revalidatePath("/portal/membership");
  revalidatePath("/admin/members");
  return { success: true };
}

// Sube el comprobante de pago y lo asocia a una suscripción pendiente
export async function uploadPaymentProof(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const file = formData.get("file") as File | null;
  const subscriptionId = formData.get("subscriptionId") as string | null;
  const paymentMethod = (formData.get("paymentMethod") as string | null) ?? "transfer";
  const notes = (formData.get("notes") as string | null) ?? "";

  if (!file || !subscriptionId) return { success: false, error: "Datos incompletos" };

  // Validar archivo en el servidor — nunca confiar solo en validación del cliente
  if (file.size > MAX_FILE_SIZE_BYTES) return { success: false, error: "El archivo excede el límite de 5MB" };
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return { success: false, error: "Formato no permitido. Use JPG, PNG, WebP o PDF" };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const filePath = `${user.id}/${subscriptionId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[uploadPaymentProof] Upload error:", uploadError.message);
    return { success: false, error: "Error al subir el archivo" };
  }

  const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(filePath);

  const { error: insertError } = await supabase
    .from("payment_proofs")
    .insert({
      user_id: user.id,
      subscription_id: subscriptionId,
      file_url: urlData.publicUrl,
      file_path: filePath,
      payment_method: paymentMethod,
      notes: notes || null,
      status: "pending",
    });

  if (insertError) {
    console.error("[uploadPaymentProof] Insert error:", insertError.message);
    return { success: false, error: "Error al registrar el comprobante" };
  }

  revalidatePath("/portal/membership");
  revalidatePath("/admin/payments");
  return { success: true };
}

const approvePaymentSchema = z.object({ paymentId: z.string().uuid() });

// Aprueba un comprobante y activa la suscripción con las fechas calculadas según el plan
export async function approvePayment(formData: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = approvePaymentSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const { paymentId } = parsed.data;
  const supabase = await createClient();

  const { data: proof, error: proofError } = await supabase
    .from("payment_proofs")
    .select("subscription_id, subscription:subscriptions!payment_proofs_subscription_id_fkey(plan:membership_plans(duration_days))")
    .eq("id", paymentId)
    .single();

  if (proofError || !proof) return { success: false, error: "Comprobante no encontrado" };

  try {
    const now = new Date();
    const sub = proof.subscription as { plan?: { duration_days?: number } } | null;
    const durationDays = sub?.plan?.duration_days ?? 30;
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Actualizar comprobante y suscripción en paralelo — ambos deben completarse
    const [{ error: updateProofError }, { error: updateSubError }] = await Promise.all([
      supabase.from("payment_proofs").update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
      }).eq("id", paymentId),
      supabase.from("subscriptions").update({
        status: "active",
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      }).eq("id", proof.subscription_id),
    ]);

    if (updateProofError) throw new Error(updateProofError.message);
    if (updateSubError) throw new Error(updateSubError.message);

    revalidatePath("/admin/payments");
    revalidatePath("/admin/members");
    return { success: true };
  } catch (error) {
    console.error("[approvePayment] Error:", error);
    return { success: false, error: "Error al aprobar el pago" };
  }
}

const rejectPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  rejectionReason: z.string().optional(),
});

// Rechaza un comprobante y registra el motivo para notificar al miembro
export async function rejectPayment(formData: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = rejectPaymentSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const { paymentId, rejectionReason } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("payment_proofs")
    .update({
      status: "rejected",
      rejection_reason: rejectionReason ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (error) {
    console.error("[rejectPayment] Error:", error.message);
    return { success: false, error: "Error al rechazar el pago" };
  }

  revalidatePath("/admin/payments");
  return { success: true };
}

// Obtiene comprobantes pendientes sin paginar — usada en el panel de revisión rápida
export async function getPendingPayments(): Promise<PaymentProofWithDetails[]> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) return [];

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("payment_proofs")
      .select(PAYMENT_SELECT)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = data ?? [];

    // Firmar todas las URLs en un solo llamado al storage (evita N+1)
    const adminClient = createAdminClient();
    const paths = rows.filter((p) => p.file_path).map((p) => p.file_path);
    const { data: signedData } = paths.length > 0
      ? await adminClient.storage.from("payment-proofs").createSignedUrls(paths, 3600)
      : { data: [] };

    const signedMap = new Map((signedData ?? []).map((s) => [s.path, s.signedUrl]));

    return rows.map((proof) => ({
      ...proof,
      file_url: (proof.file_path && signedMap.get(proof.file_path)) || proof.file_url,
    })) as unknown as PaymentProofWithDetails[];
  } catch (error) {
    console.error("[getPendingPayments] Error:", error);
    return [];
  }
}

const registerManualPaymentSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  paymentMethod: z.string(),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

// Registra un pago presencial para un miembro nuevo — crea suscripción activa directamente
export async function registerManualPayment(input: {
  userId: string;
  planId: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  amount: number;
  notes?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "owner")) return { success: false, error: "Sin permisos" };

  const parsed = registerManualPaymentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const { userId, planId, paymentMethod, amount, notes } = parsed.data;
  const supabase = await createClient();

  try {
    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("duration_days")
      .eq("id", planId)
      .single();

    if (planError || !plan) throw new Error("Plan no encontrado");

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (subError || !sub) throw new Error(subError?.message ?? "Error al crear suscripción");

    const { error: proofError } = await supabase
      .from("payment_proofs")
      .insert({
        user_id: userId,
        subscription_id: sub.id,
        amount,
        payment_method: paymentMethod,
        notes: notes ?? "Pago presencial registrado por admin",
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        file_url: "",
        file_path: "",
      });

    if (proofError) throw new Error(proofError.message);

    revalidatePath("/admin/members");
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error) {
    console.error("[registerManualPayment] Error:", error);
    return { success: false, error: "Error al registrar el pago" };
  }
}

// Obtiene comprobantes de pago paginados con filtro de estado para el panel admin
export async function getAllPaymentsAdmin(
  params: { page: number; pageSize: number; status?: PaymentStatusFilter } = { page: 1, pageSize: 25 }
): Promise<PaginatedResult<PaymentProofWithDetails>> {
  const user = await getCurrentUser();
  const empty = buildPaginatedResult([], 0, params);
  if (!user || user.role !== "admin" && user.role !== "owner") return empty;

  const supabase = await createClient();
  const { from, to } = buildPaginationRange(params);

  try {
    // Ejecutar count y data en paralelo — filtro de estado aplicado a ambas queries
    let countQ = supabase.from("payment_proofs").select("*", { count: "exact", head: true });
    let dataQ = supabase
      .from("payment_proofs")
      .select(PAYMENT_SELECT)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.status && params.status !== "all") {
      countQ = countQ.eq("status", params.status);
      dataQ = dataQ.eq("status", params.status);
    }

    const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
    if (error) throw new Error(error.message);

    const rows = data ?? [];

    // Resolver amounts antes de firmar URLs
    const withAmounts = rows.map((proof) => {
      const subscription = proof.subscription as { plan?: { price?: number } } | null;
      return { ...proof, amount: proof.amount ?? subscription?.plan?.price ?? null };
    });

    // Firmar todas las URLs en un solo llamado al storage (evita N+1)
    const adminClient = createAdminClient();
    const paths = withAmounts.filter((p) => p.file_path).map((p) => p.file_path);
    const { data: signedData } = paths.length > 0
      ? await adminClient.storage.from("payment-proofs").createSignedUrls(paths, 3600)
      : { data: [] };

    const signedMap = new Map((signedData ?? []).map((s) => [s.path, s.signedUrl]));

    const proofs = withAmounts.map((proof) => ({
      ...proof,
      file_url: (proof.file_path && signedMap.get(proof.file_path)) || proof.file_url,
    }));

    return buildPaginatedResult(proofs as unknown as PaymentProofWithDetails[], count ?? 0, params);
  } catch (error) {
    console.error("[getAllPaymentsAdmin] Error:", error);
    return empty;
  }
}

// Cuenta comprobantes pendientes para el subtitle del topbar — query ligera sin datos
export async function getPendingPaymentsCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return 0;

  const supabase = await createClient();
  try {
    const { count, error } = await supabase
      .from("payment_proofs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch (error) {
    console.error("[getPendingPaymentsCount] Error:", error);
    return 0;
  }
}

// Obtiene el historial de pagos de un miembro específico (para el tab Pagos en su perfil)
export async function getMemberPayments(memberId: string): Promise<PaymentProofWithDetails[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return [];

  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("payment_proofs")
      .select(`
        id, subscription_id, user_id, file_url, file_path, amount,
        payment_method, notes, status, reviewed_by, reviewed_at,
        rejection_reason, created_at,
        subscription:subscriptions!payment_proofs_subscription_id_fkey(
          id, status, starts_at, expires_at,
          plan:membership_plans(id, name, price, currency, duration_days)
        )
      `)
      .eq("user_id", memberId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const withAmounts = rows.map((proof) => {
      const subscription = proof.subscription as { plan?: { price?: number } } | null;
      return { ...proof, amount: proof.amount ?? subscription?.plan?.price ?? null };
    });

    // Firmar todas las URLs en un solo llamado al storage (evita N+1)
    const adminClient = createAdminClient();
    const paths = withAmounts.filter((p) => p.file_path).map((p) => p.file_path);
    const { data: signedData } = paths.length > 0
      ? await adminClient.storage.from("payment-proofs").createSignedUrls(paths, 3600)
      : { data: [] };

    const signedMap = new Map((signedData ?? []).map((s) => [s.path, s.signedUrl]));

    return withAmounts.map((proof) => ({
      ...proof,
      file_url: (proof.file_path && signedMap.get(proof.file_path)) || proof.file_url,
    })) as unknown as PaymentProofWithDetails[];
  } catch (error) {
    console.error("[getMemberPayments] Error:", error);
    return [];
  }
}

const renewManualSubscriptionSchema = z.object({
  memberId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  planId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "transfer", "other"]),
  notes: z.string().optional(),
});

// Renueva una suscripción existente con un pago presencial (usado desde el perfil del miembro).
// A diferencia de registerManualPayment, este action opera sobre una suscripción ya existente
// y puede encolar el nuevo período si aún está vigente (no pierde tiempo pagado).
export async function renewManualSubscription(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = renewManualSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const { memberId, subscriptionId, planId, amount, paymentMethod, notes } = parsed.data;
  const supabase = await createClient();

  try {
    // Insertar el comprobante como aprobado — no hay archivo digital en pagos presenciales
    const { error: proofError } = await supabase
      .from("payment_proofs")
      .insert({
        user_id: memberId,
        subscription_id: subscriptionId,
        amount,
        payment_method: paymentMethod,
        notes: notes ?? "Pago presencial registrado por admin",
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        file_url: "",
        file_path: "",
      });

    if (proofError) throw new Error(proofError.message);

    // Obtener duración del plan seleccionado y el vencimiento actual de la suscripción
    // en paralelo — necesitamos ambos para calcular las fechas correctas
    const [{ data: plan }, { data: currentSub }] = await Promise.all([
      supabase.from("membership_plans").select("duration_days").eq("id", planId).single(),
      supabase.from("subscriptions").select("expires_at").eq("id", subscriptionId).single(),
    ]);

    const durationDays = plan?.duration_days ?? 30;

    // Si la suscripción todavía está vigente, encolar el nuevo período
    // para que arranque cuando venza la actual — no se pierde tiempo pagado
    const currentExpiry = currentSub?.expires_at ? new Date(currentSub.expires_at) : null;
    const now = new Date();
    const startsAt = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const expiresAt = new Date(startsAt);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Actualizar suscripción: plan_id si cambió, estado y fechas siempre
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({
        plan_id: planId,
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", subscriptionId);

    if (subError) throw new Error(subError.message);

    revalidatePath(`/admin/members/${memberId}`);
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error) {
    console.error("[renewManualSubscription] Error:", error);
    return { success: false, error: "Error al registrar el pago" };
  }
}
