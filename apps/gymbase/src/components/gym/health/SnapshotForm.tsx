// SnapshotForm.tsx — Formulario rápido para agregar un snapshot de métricas de salud

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { addHealthSnapshot } from "@/actions/health.actions";
import { healthSnapshotSchema, type HealthSnapshotInput } from "@/lib/validations/health";

interface SnapshotFormProps {
  userId: string;
}

export function SnapshotForm({ userId }: SnapshotFormProps): React.ReactNode {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<HealthSnapshotInput>({
    resolver: zodResolver(healthSnapshotSchema),
    defaultValues: { user_id: userId },
  });

  async function onSubmit(data: HealthSnapshotInput): Promise<void> {
    setFeedback(null);
    const result = await addHealthSnapshot(data);
    if (result.success) {
      setFeedback({ type: "success", message: "Medición registrada" });
      reset({ user_id: userId });
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al registrar";
      setFeedback({ type: "error", message: msg });
    }
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {feedback && (
        <div className={`px-3 py-2 rounded-md text-sm ${feedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {feedback.message}
        </div>
      )}
      <input type="hidden" {...register("user_id")} />
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="snap_weight">Peso (kg)*</Label>
          <Input id="snap_weight" type="number" step="0.1" {...register("weight_kg", { valueAsNumber: true })} />
          {errors.weight_kg && <p className="text-xs text-red-600">{errors.weight_kg.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="snap_fat">Grasa (%)</Label>
          <Input id="snap_fat" type="number" step="0.1" {...register("body_fat_pct", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="snap_muscle">Músculo (kg)</Label>
          <Input id="snap_muscle" type="number" step="0.1" {...register("muscle_mass_kg", { valueAsNumber: true })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="snap_notes">Notas</Label>
        <Input id="snap_notes" {...register("notes")} placeholder="Observaciones opcionales..." />
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Registrar medición
      </Button>
    </form>
  );
}
