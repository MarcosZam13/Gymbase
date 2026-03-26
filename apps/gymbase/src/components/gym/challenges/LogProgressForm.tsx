// LogProgressForm.tsx — Formulario para que el miembro registre su progreso en un reto

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { logProgress } from "@/actions/challenge.actions";
import { logChallengeProgressSchema, type LogChallengeProgressInput } from "@/lib/validations/challenges";

interface LogProgressFormProps {
  challengeId: string;
  goalUnit: string;
}

export function LogProgressForm({ challengeId, goalUnit }: LogProgressFormProps): React.ReactNode {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LogChallengeProgressInput>({
    resolver: zodResolver(logChallengeProgressSchema),
    defaultValues: { challenge_id: challengeId },
  });

  async function onSubmit(data: LogChallengeProgressInput): Promise<void> {
    setFeedback(null);
    const result = await logProgress(data);
    if (result.success) {
      setFeedback({ type: "success", message: "Progreso registrado" });
      reset({ challenge_id: challengeId });
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
      <input type="hidden" {...register("challenge_id")} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="progress_value">Progreso ({goalUnit})</Label>
          <Input id="progress_value" type="number" step="0.1" {...register("value", { valueAsNumber: true })} />
          {errors.value && <p className="text-xs text-red-600">{errors.value.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="progress_notes">Notas</Label>
          <Input id="progress_notes" {...register("notes")} />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Registrar
      </Button>
    </form>
  );
}
