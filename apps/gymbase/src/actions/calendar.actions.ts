// calendar.actions.ts — Server actions para gestión de clases y reservas

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  fetchClassTypes, insertClassType,
  fetchScheduledClasses, insertScheduledClass, cancelScheduledClass,
  fetchBookingsForClass, fetchMyBookings, insertBooking, cancelBooking,
} from "@/services/calendar.service";
import { classTypeSchema, scheduleClassSchema, bookClassSchema } from "@/lib/validations/calendar";
import type { ActionResult } from "@/types/database";
import type { ClassType, ScheduledClass, ClassBooking } from "@/types/gym-calendar";

export async function getClassTypes(): Promise<ClassType[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    return await fetchClassTypes(supabase, orgId);
  } catch (error) {
    console.error("[getClassTypes] Error:", error);
    return [];
  }
}

export async function createClassType(input: unknown): Promise<ActionResult<ClassType>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const parsed = classTypeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const classType = await insertClassType(supabase, orgId, parsed.data);
    revalidatePath("/admin/calendar");
    return { success: true, data: classType };
  } catch (error) {
    console.error("[createClassType] Error:", error);
    return { success: false, error: "Error al crear el tipo de clase" };
  }
}

export async function getWeekSchedule(from: string, to: string): Promise<ScheduledClass[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const classes = await fetchScheduledClasses(supabase, orgId, from, to);
    // Agregar conteo de reservas a cada clase
    const withBookings = await Promise.all(
      classes.map(async (cls) => {
        const count = await fetchBookingsForClass(supabase, cls.id);
        return { ...cls, bookings_count: count };
      })
    );
    return withBookings;
  } catch (error) {
    console.error("[getWeekSchedule] Error:", error);
    return [];
  }
}

export async function scheduleClass(input: unknown): Promise<ActionResult<ScheduledClass>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const parsed = scheduleClassSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    // Usar el instructor seleccionado; si no se especificó, se usa el admin actual
    const instructorId = parsed.data.instructor_id ?? user.id;
    const { instructor_id: _, ...classData } = parsed.data;
    const scheduled = await insertScheduledClass(supabase, orgId, instructorId, classData);
    revalidatePath("/admin/calendar");
    revalidatePath("/portal/calendar");
    return { success: true, data: scheduled };
  } catch (error) {
    console.error("[scheduleClass] Error:", error);
    return { success: false, error: "Error al programar la clase" };
  }
}

export async function cancelClass(classId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    await cancelScheduledClass(supabase, classId);
    revalidatePath("/admin/calendar");
    revalidatePath("/portal/calendar");
    return { success: true };
  } catch (error) {
    console.error("[cancelClass] Error:", error);
    return { success: false, error: "Error al cancelar la clase" };
  }
}

export async function bookClass(input: unknown): Promise<ActionResult<ClassBooking>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const parsed = bookClassSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    // Verificar capacidad antes de reservar
    const scheduledClass = await supabase
      .from("gym_scheduled_classes")
      .select("max_capacity, is_cancelled")
      .eq("id", parsed.data.class_id)
      .single();
    if (scheduledClass.error || !scheduledClass.data) {
      return { success: false, error: "Clase no encontrada" };
    }
    if (scheduledClass.data.is_cancelled) {
      return { success: false, error: "Esta clase ha sido cancelada" };
    }
    if (scheduledClass.data.max_capacity) {
      const currentBookings = await fetchBookingsForClass(supabase, parsed.data.class_id);
      if (currentBookings >= scheduledClass.data.max_capacity) {
        return { success: false, error: "La clase está llena" };
      }
    }
    const booking = await insertBooking(supabase, user.id, orgId, parsed.data.class_id);
    revalidatePath("/portal/calendar");
    return { success: true, data: booking };
  } catch (error) {
    console.error("[bookClass] Error:", error);
    return { success: false, error: "Error al reservar la clase" };
  }
}

export async function cancelMyBooking(bookingId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const supabase = await createClient();
  try {
    await cancelBooking(supabase, bookingId, user.id);
    revalidatePath("/portal/calendar");
    return { success: true };
  } catch (error) {
    console.error("[cancelMyBooking] Error:", error);
    return { success: false, error: "Error al cancelar la reserva" };
  }
}

export async function getMyBookings(): Promise<ClassBooking[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await fetchMyBookings(supabase, user.id);
  } catch (error) {
    console.error("[getMyBookings] Error:", error);
    return [];
  }
}
