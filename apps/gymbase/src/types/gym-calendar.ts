// gym-calendar.ts — Tipos para el módulo de calendario de clases

export interface ClassType {
  id: string;
  org_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
}

export interface ScheduledClass {
  id: string;
  org_id: string;
  type_id: string;
  instructor_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  max_capacity: number | null;
  location: string | null;
  description: string | null;
  is_cancelled: boolean;
  created_at: string;
  class_type?: ClassType;
  bookings_count?: number;
}

export interface ClassBooking {
  id: string;
  user_id: string;
  org_id: string;
  class_id: string;
  status: "confirmed" | "cancelled" | "waitlist";
  booked_at: string;
  scheduled_class?: ScheduledClass;
}

export type BookingStatus = "confirmed" | "cancelled" | "waitlist";
