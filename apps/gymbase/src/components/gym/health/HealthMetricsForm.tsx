// HealthMetricsForm.tsx — Formulario para que admin/trainer registre métricas de salud de un miembro

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { updateHealthProfile } from "@/actions/health.actions";
import { healthProfileSchema, type HealthProfileInput } from "@/lib/validations/health";
import type { HealthProfile } from "@/types/gym-health";

interface HealthMetricsFormProps {
  userId: string;
  profile: HealthProfile | null;
}

export function HealthMetricsForm({ userId, profile }: HealthMetricsFormProps): React.ReactNode {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<HealthProfileInput>({
    resolver: zodResolver(healthProfileSchema),
    defaultValues: {
      user_id: userId,
      height_cm: profile?.height_cm ?? undefined,
      weight_kg: profile?.weight_kg ?? undefined,
      body_fat_pct: profile?.body_fat_pct ?? undefined,
      muscle_mass_kg: profile?.muscle_mass_kg ?? undefined,
      resting_heart_rate: profile?.resting_heart_rate ?? undefined,
      blood_pressure: profile?.blood_pressure ?? "",
      fitness_level: profile?.fitness_level ?? undefined,
      injuries_notes: profile?.injuries_notes ?? "",
      trainer_notes: profile?.trainer_notes ?? "",
      medical_conditions: profile?.medical_conditions ?? "",
    },
  });

  async function onSubmit(data: HealthProfileInput): Promise<void> {
    setFeedback(null);
    const result = await updateHealthProfile(data);
    if (result.success) {
      setFeedback({ type: "success", message: "Perfil de salud actualizado" });
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al actualizar";
      setFeedback({ type: "error", message: msg });
    }
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {feedback && (
        <div className={`px-3 py-2 rounded-md text-sm ${feedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {feedback.message}
        </div>
      )}

      <input type="hidden" {...register("user_id")} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="height_cm">Altura (cm)</Label>
          <Input id="height_cm" type="number" step="0.1" {...register("height_cm", { valueAsNumber: true })} />
          {errors.height_cm && <p className="text-xs text-red-600">{errors.height_cm.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="weight_kg">Peso (kg)</Label>
          <Input id="weight_kg" type="number" step="0.1" {...register("weight_kg", { valueAsNumber: true })} />
          {errors.weight_kg && <p className="text-xs text-red-600">{errors.weight_kg.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="body_fat_pct">Grasa corporal (%)</Label>
          <Input id="body_fat_pct" type="number" step="0.1" {...register("body_fat_pct", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="muscle_mass_kg">Masa muscular (kg)</Label>
          <Input id="muscle_mass_kg" type="number" step="0.1" {...register("muscle_mass_kg", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="resting_heart_rate">FC reposo (bpm)</Label>
          <Input id="resting_heart_rate" type="number" {...register("resting_heart_rate", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="blood_pressure">Presión arterial</Label>
          <Input id="blood_pressure" placeholder="120/80" {...register("blood_pressure")} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="fitness_level">Nivel de condición física</Label>
        <select id="fitness_level" {...register("fitness_level")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
          <option value="">Seleccionar...</option>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzado</option>
          <option value="athlete">Atleta</option>
        </select>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 mb-1">
          <label htmlFor="injuries_notes" className="text-sm font-medium leading-none">
            Lesiones / Notas
          </label>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
            style={{ backgroundColor: "#FF5E1415", color: "#FF5E14", border: "1px solid #FF5E1430" }}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Solo admin
          </span>
        </div>
        <textarea id="injuries_notes" {...register("injuries_notes")} rows={2} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 mb-1">
          <label htmlFor="trainer_notes" className="text-sm font-medium leading-none">
            Notas del entrenador
          </label>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
            style={{ backgroundColor: "#FF5E1415", color: "#FF5E14", border: "1px solid #FF5E1430" }}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Solo admin
          </span>
        </div>
        <textarea id="trainer_notes" {...register("trainer_notes")} rows={2} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 mb-1">
          <label htmlFor="medical_conditions" className="text-sm font-medium leading-none">
            Condiciones médicas
          </label>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
            style={{ backgroundColor: "#FF5E1415", color: "#FF5E14", border: "1px solid #FF5E1430" }}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Solo admin
          </span>
        </div>
        <textarea id="medical_conditions" {...register("medical_conditions")} rows={2} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {profile ? "Actualizar perfil" : "Crear perfil"}
      </Button>
    </form>
  );
}
