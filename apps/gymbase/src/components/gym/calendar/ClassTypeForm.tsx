// ClassTypeForm.tsx — Formulario admin para crear tipos de clase

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { createClassType } from "@/actions/calendar.actions";
import { classTypeSchema, type ClassTypeInput } from "@/lib/validations/calendar";

export function ClassTypeForm(): React.ReactNode {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClassTypeInput>({
    resolver: zodResolver(classTypeSchema),
  });

  async function onSubmit(data: ClassTypeInput): Promise<void> {
    setFeedback(null);
    const result = await createClassType(data);
    if (result.success) {
      setFeedback({ type: "success", message: "Tipo de clase creado" });
      reset();
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al crear";
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="ct_name">Nombre</Label>
          <Input id="ct_name" {...register("name")} placeholder="Yoga, Spinning..." />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="ct_color">Color</Label>
          <Input id="ct_color" type="color" {...register("color")} defaultValue="#3B82F6" />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Crear tipo
      </Button>
    </form>
  );
}
