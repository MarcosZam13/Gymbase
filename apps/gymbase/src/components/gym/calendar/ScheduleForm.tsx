// ScheduleForm.tsx — Formulario admin para programar una nueva clase

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { Textarea } from "@core/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { Alert, AlertDescription } from "@core/components/ui/alert";
import { scheduleClass } from "@/actions/calendar.actions";
import { scheduleClassSchema, type ScheduleClassInput } from "@/lib/validations/calendar";
import type { ClassType } from "@/types/gym-calendar";
import type { AdminProfile } from "@/actions/settings.actions";

// Opciones de duración predefinidas — los valores más comunes en gyms
const DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "60 min", minutes: 60 },
  { label: "75 min", minutes: 75 },
  { label: "90 min", minutes: 90 },
];

interface ScheduleFormProps {
  classTypes: ClassType[];
  instructors?: AdminProfile[];
}

export function ScheduleForm({ classTypes, instructors = [] }: ScheduleFormProps): React.ReactNode {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ScheduleClassInput>({
    resolver: zodResolver(scheduleClassSchema),
  });

  const startsAt = watch("starts_at");

  // Calcula y actualiza ends_at cuando cambia starts_at o la duración seleccionada
  function applyDuration(minutes: number, start?: string): void {
    const base = start ?? startsAt;
    if (!base) return;
    const startDate = new Date(base);
    if (isNaN(startDate.getTime())) return;
    const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
    // Formatear como datetime-local (YYYY-MM-DDTHH:mm)
    const formatted = endDate.toISOString().slice(0, 16);
    setValue("ends_at", formatted);
  }

  function handleStartsAtChange(e: React.ChangeEvent<HTMLInputElement>): void {
    register("starts_at").onChange(e);
    applyDuration(durationMinutes, e.target.value);
  }

  function handleDurationChange(value: string): void {
    const minutes = parseInt(value, 10);
    setDurationMinutes(minutes);
    applyDuration(minutes);
  }

  async function onSubmit(data: ScheduleClassInput): Promise<void> {
    setFeedback(null);
    const result = await scheduleClass(data);
    if (result.success) {
      setFeedback({ type: "success", message: "Clase programada correctamente" });
      reset();
      setDurationMinutes(60);
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al programar";
      setFeedback({ type: "error", message: msg });
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {feedback && (
        <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Tipo de clase */}
      <div className="space-y-1.5">
        <Label>Tipo de clase</Label>
        <Select onValueChange={(v) => setValue("type_id", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo…" />
          </SelectTrigger>
          <SelectContent>
            {classTypes.map((ct) => (
              <SelectItem key={ct.id} value={ct.id}>
                <span className="flex items-center gap-2">
                  {ct.color && (
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ct.color }} />
                  )}
                  {ct.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type_id && <p className="text-xs text-destructive">{errors.type_id.message}</p>}
      </div>

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" placeholder="Ej: Yoga matutino" {...register("title")} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Instructor */}
      {instructors.length > 0 && (
        <div className="space-y-1.5">
          <Label>Instructor</Label>
          <Select onValueChange={(v) => setValue("instructor_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar instructor…" />
            </SelectTrigger>
            <SelectContent>
              {instructors.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.full_name ?? inst.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Inicio + Duración */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="starts_at">Inicio</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            {...register("starts_at")}
            onChange={handleStartsAtChange}
          />
          {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Duración</Label>
          <Select
            value={String(durationMinutes)}
            onValueChange={handleDurationChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map(({ label, minutes }) => (
                <SelectItem key={minutes} value={String(minutes)}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Campo oculto que guarda el ends_at calculado */}
          <Input type="hidden" {...register("ends_at")} />
          {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
        </div>
      </div>

      {/* Capacidad y ubicación */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="max_capacity">Capacidad máx.</Label>
          <Input id="max_capacity" type="number" min={1} max={200} placeholder="Sin límite" {...register("max_capacity", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Ubicación</Label>
          <Input id="location" placeholder="Sala A, Estudio, Piscina…" {...register("location")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" rows={2} placeholder="Descripción breve de la clase…" {...register("description")} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="gap-2 w-full">
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Programar clase
      </Button>
    </form>
  );
}
