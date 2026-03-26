// checkin.ts — Schemas de validación para check-in por QR y registro manual

import { z } from "zod";

export const scanQRSchema = z.object({
  qr_code: z
    .string()
    .min(1, "El código QR es requerido")
    .max(500, "Código QR inválido"),
});

export const manualCheckinSchema = z.object({
  user_id: z
    .string()
    .uuid("ID de usuario inválido"),
});

export const checkoutSchema = z.object({
  attendance_id: z
    .string()
    .uuid("ID de asistencia inválido"),
});

export type ScanQRInput = z.infer<typeof scanQRSchema>;
export type ManualCheckinInput = z.infer<typeof manualCheckinSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
