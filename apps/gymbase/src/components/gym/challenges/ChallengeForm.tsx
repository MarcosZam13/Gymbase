// ChallengeForm.tsx — Formulario admin para crear un nuevo reto

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { Textarea } from "@core/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { Alert, AlertDescription } from "@core/components/ui/alert";
import { createChallenge } from "@/actions/challenge.actions";
import { createChallengeSchema, type CreateChallengeInput } from "@/lib/validations/challenges";

// Descripción de cada tipo de reto para orientar al admin
const CHALLENGE_TYPE_INFO: Record<string, { label: string; description: string; unit: string }> = {
  attendance: {
    label: "Asistencia",
    description: "Mide cuántas veces asisten al gym en el periodo",
    unit: "visitas",
  },
  workout: {
    label: "Entrenamiento",
    description: "Mide la cantidad de sesiones de workout completadas",
    unit: "sesiones",
  },
  weight: {
    label: "Peso / fuerza",
    description: "Mide progreso en levantamiento de peso (kg totales)",
    unit: "kg",
  },
  custom: {
    label: "Personalizado",
    description: "Define tu propia métrica y unidad de medida",
    unit: "",
  },
};

export function ChallengeForm(): React.ReactNode {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<CreateChallengeInput>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: { is_public: true },
  });

  function handleTypeChange(value: string): void {
    setSelectedType(value);
    setValue("type", value as CreateChallengeInput["type"]);
    // Pre-rellenar la unidad según el tipo seleccionado
    const info = CHALLENGE_TYPE_INFO[value];
    if (info?.unit) setValue("goal_unit", info.unit);
  }

  async function onSubmit(data: CreateChallengeInput): Promise<void> {
    setError(null);
    const result = await createChallenge({
      ...data,
      banner_url: data.banner_url || null,
    });
    if (result.success) {
      router.push("/admin/challenges");
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al crear el reto";
      setError(msg);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" placeholder="Reto de asistencia de enero" {...register("title")} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" rows={3} placeholder="Explica el objetivo del reto a los participantes…" {...register("description")} />
      </div>

      {/* Selector de tipo con descripción contextual */}
      <div className="space-y-1.5">
        <Label>Tipo de reto</Label>
        <Select onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo…" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CHALLENGE_TYPE_INFO).map(([value, info]) => (
              <SelectItem key={value} value={value}>{info.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedType && (
          <p className="text-xs text-muted-foreground">{CHALLENGE_TYPE_INFO[selectedType]?.description}</p>
        )}
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="goal_value">Meta</Label>
          <Input id="goal_value" type="number" step="any" min={0} {...register("goal_value", { valueAsNumber: true })} />
          {errors.goal_value && <p className="text-xs text-destructive">{errors.goal_value.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal_unit">Unidad</Label>
          <Input id="goal_unit" placeholder="visitas, kg, sesiones…" {...register("goal_unit")} />
          {errors.goal_unit && <p className="text-xs text-destructive">{errors.goal_unit.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="starts_at">Inicio</Label>
          <Input id="starts_at" type="datetime-local" {...register("starts_at")} />
          {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ends_at">Fin</Label>
          <Input id="ends_at" type="datetime-local" {...register("ends_at")} />
          {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="max_participants">Máx. participantes (opcional)</Label>
          <Input id="max_participants" type="number" min={2} max={1000} placeholder="Sin límite" {...register("max_participants", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prize_description">Premio (opcional)</Label>
          <Input id="prize_description" placeholder="Mes gratis, camiseta…" {...register("prize_description")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="banner_url">URL de imagen banner (opcional)</Label>
        <Input id="banner_url" type="url" placeholder="https://…" {...register("banner_url")} />
        {errors.banner_url && <p className="text-xs text-destructive">{errors.banner_url.message}</p>}
        <p className="text-xs text-muted-foreground">Imagen que se mostrará en la tarjeta del reto</p>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_public" {...register("is_public")} className="w-4 h-4 accent-primary rounded border-border" />
        <Label htmlFor="is_public">Visible para todos los miembros</Label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear reto
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
