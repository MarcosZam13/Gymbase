// AddDayButton.tsx — Botón para agregar un nuevo día a una rutina

"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { addDay } from "@/actions/routine.actions";

interface AddDayButtonProps {
  routineId: string;
  nextDayNumber: number;
}

export function AddDayButton({ routineId, nextDayNumber }: AddDayButtonProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  async function handleAdd(): Promise<void> {
    setIsLoading(true);
    await addDay(routineId, nextDayNumber);
    setIsLoading(false);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleAdd} disabled={isLoading} className="gap-1">
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      Agregar día
    </Button>
  );
}
