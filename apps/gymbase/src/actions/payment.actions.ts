// payment.actions.ts — Wraps core payment actions + acción para listar todos los pagos en admin

"use server";

// "use server" no permite export * — se re-exportan solo las funciones necesarias como wrappers async
import {
  approvePayment as coreApprovePayment,
  rejectPayment as coreRejectPayment,
  uploadPaymentProof as coreUploadPaymentProof,
  cancelSubscription as coreCancelSubscription,
  createSubscription as coreCreateSubscription,
  getUserSubscription as coreGetUserSubscription,
  getPendingPayments as coreGetPendingPayments,
  registerManualPayment as coreRegisterManualPayment,
} from "@core/actions/payment.actions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import type { ActionResult, PaymentProofWithDetails, Subscription } from "@/types/database";

export async function approvePayment(formData: unknown): Promise<ActionResult> {
  return coreApprovePayment(formData);
}

export async function rejectPayment(formData: unknown): Promise<ActionResult> {
  return coreRejectPayment(formData);
}

export async function uploadPaymentProof(formData: FormData): Promise<ActionResult> {
  return coreUploadPaymentProof(formData);
}

export async function cancelSubscription(subscriptionId: string): Promise<ActionResult> {
  return coreCancelSubscription(subscriptionId);
}

export async function createSubscription(planId: string): Promise<ActionResult<{ subscriptionId: string }>> {
  return coreCreateSubscription(planId);
}

export async function getUserSubscription(): Promise<Subscription | null> {
  return coreGetUserSubscription();
}

export async function getPendingPayments(): Promise<PaymentProofWithDetails[]> {
  return coreGetPendingPayments();
}

// Obtiene todos los comprobantes de pago (cualquier estado) para el panel admin
export async function getAllPaymentsAdmin(): Promise<PaymentProofWithDetails[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];

  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("payment_proofs")
      .select(`
        id, subscription_id, user_id, file_url, file_path, amount,
        payment_method, notes, status, reviewed_by, reviewed_at,
        rejection_reason, created_at,
        profile:profiles!payment_proofs_user_id_fkey(id, full_name, email, avatar_url),
        subscription:subscriptions!payment_proofs_subscription_id_fkey(
          id, status, starts_at, expires_at,
          plan:membership_plans(id, name, price, currency, duration_days)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    // Generar URLs firmadas con el admin client para omitir las políticas de storage RLS
    const adminClient = createAdminClient();
    const proofs = await Promise.all(
      (data ?? []).map(async (proof) => {
        // Fallback: si amount es NULL en DB, usar el precio del plan
        const subscription = proof.subscription as { plan?: { price?: number } } | null;
        const amount = proof.amount ?? subscription?.plan?.price ?? null;

        if (!proof.file_path) return { ...proof, amount };
        const { data: signed } = await adminClient.storage
          .from("payment-proofs")
          .createSignedUrl(proof.file_path, 3600);
        return { ...proof, amount, file_url: signed?.signedUrl ?? proof.file_url };
      })
    );

    return proofs as unknown as PaymentProofWithDetails[];
  } catch (error) {
    console.error("[getAllPaymentsAdmin] Error:", error);
    return [];
  }
}

// Obtiene el historial de pagos de un miembro específico (para el tab Pagos en su perfil)
export async function getMemberPayments(memberId: string): Promise<PaymentProofWithDetails[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];

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

    // Signed URLs con adminClient — igual que getAllPaymentsAdmin
    const adminClient = createAdminClient();
    const proofs = await Promise.all(
      (data ?? []).map(async (proof) => {
        const subscription = proof.subscription as { plan?: { price?: number } } | null;
        const amount = proof.amount ?? subscription?.plan?.price ?? null;
        if (!proof.file_path) return { ...proof, amount };
        const { data: signed } = await adminClient.storage
          .from("payment-proofs")
          .createSignedUrl(proof.file_path, 3600);
        return { ...proof, amount, file_url: signed?.signedUrl ?? proof.file_url };
      })
    );

    return proofs as unknown as PaymentProofWithDetails[];
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

// Re-exporta la acción core para el flujo frío desde /admin/payments
export async function registerManualPayment(input: {
  userId: string;
  planId: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  amount: number;
  notes?: string;
}): Promise<ActionResult> {
  return coreRegisterManualPayment(input);
}

// Renueva una suscripción existente con un pago presencial (usado desde el perfil del miembro).
// A diferencia de registerManualPayment, este action opera sobre una suscripción ya existente
// y puede encolar el nuevo período si aún está vigente (no pierde tiempo pagado).
export async function renewManualSubscription(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

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
