// ManualCheckinForm.tsx — Formulario de check-in manual por búsqueda de miembro

"use client";

import { useState } from "react";
import { Search, Loader2, UserPlus } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { manualCheckin } from "@/actions/checkin.actions";
import type { MemberWithSubscription } from "@/types/database";

interface ManualCheckinFormProps {
  members: MemberWithSubscription[];
}

export function ManualCheckinForm({ members }: ManualCheckinFormProps): React.ReactNode {
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filtrar miembros por nombre o email
  const filtered = search.length >= 2
    ? members.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  async function handleCheckin(userId: string): Promise<void> {
    setIsLoading(true);
    setFeedback(null);

    const result = await manualCheckin({ user_id: userId });

    if (result.success) {
      setFeedback({ type: "success", message: "Check-in registrado correctamente" });
      setSearch("");
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al registrar";
      setFeedback({ type: "error", message: msg });
    }

    setIsLoading(false);
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar miembro por nombre o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`px-3 py-2 rounded-md text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Resultados de búsqueda */}
      {filtered.length > 0 && (
        <div className="border border-border rounded-md divide-y divide-border max-h-60 overflow-y-auto">
          {filtered.slice(0, 10).map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface"
            >
              <div>
                <p className="font-medium text-sm">{member.full_name ?? "Sin nombre"}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleCheckin(member.id)}
                className="gap-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Check-in
              </Button>
            </div>
          ))}
        </div>
      )}

      {search.length >= 2 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No se encontraron miembros
        </p>
      )}
    </div>
  );
}
