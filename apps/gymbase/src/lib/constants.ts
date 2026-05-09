// constants.ts — Constantes globales del sistema

// Validación de archivos de comprobante de pago
export const ALLOWED_PROOF_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_FILE_SIZE_LABEL = "5MB";

// Nombres de buckets de Supabase Storage
export const STORAGE_BUCKETS = {
  PAYMENT_PROOFS: "payment-proofs",
  CONTENT_MEDIA: "content-media",
  AVATARS: "avatars",
} as const;

// Monedas soportadas
export const SUPPORTED_CURRENCIES = ["CRC", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Formatos de moneda para display
export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  CRC: "₡",
  USD: "$",
};

// Duración mínima y máxima de planes en días
export const MIN_PLAN_DURATION_DAYS = 1;
export const MAX_PLAN_DURATION_DAYS = 365;

// Buckets de storage exclusivos de GymBase
export const GYM_STORAGE_BUCKETS = {
  PROGRESS_PHOTOS: "progress-photos",
  EXERCISE_MEDIA: "exercise-media",
  CHALLENGE_BANNERS: "challenge-banners",
} as const;

// Capacidad máxima por defecto del gimnasio (configurable por admin)
export const DEFAULT_GYM_CAPACITY = 50;

// Tiempo máximo de un check-in abierto antes del auto-cierre (en horas)
export const MAX_CHECKIN_HOURS = 4;

// Grupos musculares para la biblioteca de ejercicios
export const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "quads", "hamstrings", "glutes", "calves", "core", "full_body",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Niveles de dificultad de ejercicios
export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

// Niveles de fitness para el perfil de salud
export const FITNESS_LEVELS = ["beginner", "intermediate", "advanced", "athlete"] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

// Tipos de reto
export const CHALLENGE_TYPES = ["attendance", "weight", "workout", "custom"] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

// Niveles de ocupación del gym
export const OCCUPANCY_LEVELS = {
  FREE: { max: 0.5, label: "Libre", color: "bg-success" },
  MODERATE: { max: 0.8, label: "Moderado", color: "bg-warning" },
  FULL: { max: 1.0, label: "Lleno", color: "bg-danger" },
} as const;
