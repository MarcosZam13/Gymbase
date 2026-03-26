// challenge.actions.ts — Server actions para gestión de retos y gamificación

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  fetchChallenges, fetchChallengeById, insertChallenge,
  fetchParticipants, fetchParticipantCount, insertParticipant,
  fetchMyParticipation, insertChallengeProgress, fetchChallengeProgressTotal,
  fetchMyBadges,
} from "@/services/challenge.service";
import { createChallengeSchema, logChallengeProgressSchema } from "@/lib/validations/challenges";
import type { ActionResult } from "@/types/database";
import type { Challenge, ChallengeParticipant, ChallengeBadge } from "@/types/gym-challenges";

export async function getChallenges(): Promise<Challenge[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const challenges = await fetchChallenges(supabase, orgId);
    // Agregar conteo de participantes
    const withCounts = await Promise.all(
      challenges.map(async (c) => {
        const count = await fetchParticipantCount(supabase, c.id);
        return { ...c, participants_count: count };
      })
    );
    return withCounts;
  } catch (error) {
    console.error("[getChallenges] Error:", error);
    return [];
  }
}

export async function getChallengeDetail(challengeId: string): Promise<{
  challenge: Challenge | null;
  participants: ChallengeParticipant[];
  myParticipation: ChallengeParticipant | null;
  myProgress: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { challenge: null, participants: [], myParticipation: null, myProgress: 0 };
  const supabase = await createClient();
  try {
    const [challenge, participants] = await Promise.all([
      fetchChallengeById(supabase, challengeId),
      fetchParticipants(supabase, challengeId),
    ]);
    const myParticipation = await fetchMyParticipation(supabase, challengeId, user.id);
    let myProgress = 0;
    if (myParticipation) {
      myProgress = await fetchChallengeProgressTotal(supabase, myParticipation.id);
    }
    // Agregar progreso total a cada participante
    const withProgress = await Promise.all(
      participants.map(async (p) => {
        const total = await fetchChallengeProgressTotal(supabase, p.id);
        return { ...p, total_progress: total };
      })
    );
    return { challenge, participants: withProgress, myParticipation, myProgress };
  } catch (error) {
    console.error("[getChallengeDetail] Error:", error);
    return { challenge: null, participants: [], myParticipation: null, myProgress: 0 };
  }
}

export async function createChallenge(input: unknown): Promise<ActionResult<Challenge>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const parsed = createChallengeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const challenge = await insertChallenge(supabase, orgId, user.id, parsed.data);
    revalidatePath("/admin/challenges");
    revalidatePath("/portal/challenges");
    return { success: true, data: challenge };
  } catch (error) {
    console.error("[createChallenge] Error:", error);
    return { success: false, error: "Error al crear el reto" };
  }
}

export async function joinChallenge(challengeId: string): Promise<ActionResult<ChallengeParticipant>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    // Verificar que no esté inscrito ya
    const existing = await fetchMyParticipation(supabase, challengeId, user.id);
    if (existing) return { success: false, error: "Ya estás inscrito en este reto" };
    // Verificar capacidad
    const challenge = await fetchChallengeById(supabase, challengeId);
    if (!challenge) return { success: false, error: "Reto no encontrado" };
    if (challenge.max_participants) {
      const count = await fetchParticipantCount(supabase, challengeId);
      if (count >= challenge.max_participants) return { success: false, error: "El reto está lleno" };
    }
    const participant = await insertParticipant(supabase, challengeId, user.id, orgId);
    revalidatePath(`/portal/challenges/${challengeId}`);
    revalidatePath("/portal/challenges");
    return { success: true, data: participant };
  } catch (error) {
    console.error("[joinChallenge] Error:", error);
    return { success: false, error: "Error al unirse al reto" };
  }
}

export async function logProgress(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const parsed = logChallengeProgressSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const participation = await fetchMyParticipation(supabase, parsed.data.challenge_id, user.id);
    if (!participation) return { success: false, error: "No estás inscrito en este reto" };
    await insertChallengeProgress(supabase, participation.id, parsed.data.value, parsed.data.notes);
    revalidatePath(`/portal/challenges/${parsed.data.challenge_id}`);
    return { success: true };
  } catch (error) {
    console.error("[logProgress] Error:", error);
    return { success: false, error: "Error al registrar progreso" };
  }
}

export async function getMyBadges(): Promise<ChallengeBadge[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await fetchMyBadges(supabase, user.id);
  } catch (error) {
    console.error("[getMyBadges] Error:", error);
    return [];
  }
}
