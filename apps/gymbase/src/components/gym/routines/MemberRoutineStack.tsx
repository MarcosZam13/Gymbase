// MemberRoutineStack.tsx — Tab Rutina del perfil de miembro: stack de rutinas activas + historial

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Trash2, Plus, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import {
  assignRoutineToMemberAction,
  removeRoutineFromMemberAction,
  setFeaturedRoutineAction,
} from "@/actions/routine.actions";
import type { MemberRoutine, Routine } from "@/types/gym-routines";

interface MemberRoutineStackProps {
  memberId: string;
  activeRoutines: MemberRoutine[];
  historyRoutines: MemberRoutine[];
  availableRoutines: Routine[];
}

export function MemberRoutineStack({
  memberId,
  activeRoutines,
  historyRoutines,
  availableRoutines,
}: MemberRoutineStackProps): React.ReactNode {
  const router = useRouter();
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>("");
  const [labelInput, setLabelInput] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [featuringId, setFeaturingId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Rutinas del gym disponibles que el miembro aún no tiene activa
  const assignedRoutineIds = new Set(activeRoutines.map((r) => r.routine_id));
  const unassignedRoutines = availableRoutines.filter((r) => !assignedRoutineIds.has(r.id));

  async function handleAssign(): Promise<void> {
    if (!selectedRoutineId) {
      toast.error("Selecciona una rutina");
      return;
    }
    setAssigning(true);
    const result = await assignRoutineToMemberAction({
      user_id: memberId,
      routine_id: selectedRoutineId,
      label: labelInput.trim() || undefined,
    });
    setAssigning(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al asignar");
      return;
    }
    toast.success("Rutina agregada al stack");
    setShowAssignSheet(false);
    setSelectedRoutineId("");
    setLabelInput("");
    router.refresh();
  }

  async function handleSetFeatured(memberRoutineId: string): Promise<void> {
    setFeaturingId(memberRoutineId);
    const result = await setFeaturedRoutineAction({ member_routine_id: memberRoutineId });
    setFeaturingId(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al destacar la rutina");
      return;
    }
    toast.success("Rutina destacada actualizada");
    router.refresh();
  }

  async function handleRemove(memberRoutineId: string, routineName: string): Promise<void> {
    setRemovingId(memberRoutineId);
    const result = await removeRoutineFromMemberAction({ member_routine_id: memberRoutineId });
    setRemovingId(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al quitar");
      return;
    }
    toast.success(`"${routineName}" retirada del stack`);
    router.refresh();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-3">

      {/* ── Sección superior: Stack de rutinas activas ── */}
      <div className="bg-card border border-border rounded-[14px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-[0.08em]">
            Rutinas activas
          </p>
          <button
            onClick={() => setShowAssignSheet(true)}
            className="flex items-center gap-1.5 h-7 px-3 text-[11px] font-semibold rounded-lg border border-border bg-muted text-[#888] hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Asignar rutina
          </button>
        </div>

        {/* Lista del stack */}
        {activeRoutines.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-[#444]">Sin rutinas asignadas</p>
            <p className="text-[10px] text-[#333] mt-1">
              Usa &quot;Asignar rutina&quot; para agregar una al stack
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeRoutines.map((mr) => {
              const routineName = mr.routine?.name ?? "Rutina sin nombre";
              const isRemoving = removingId === mr.id;
              const isFeaturing = featuringId === mr.id;

              return (
                <div
                  key={mr.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    mr.is_featured ? "bg-[#0d1208]" : "hover:bg-[#0f0f0f]"
                  }`}
                >
                  {/* Indicador featured */}
                  <Star
                    className={`w-3.5 h-3.5 shrink-0 ${
                      mr.is_featured ? "text-primary fill-primary" : "text-muted-foreground"
                    }`}
                  />

                  {/* Info de la rutina */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[12px] font-medium truncate ${
                        mr.is_featured ? "text-white" : "text-[#ccc]"
                      }`}>
                        {routineName}
                      </p>
                      {mr.is_featured && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0"
                          style={{ backgroundColor: "var(--gym-accent-dim)", color: "var(--gym-accent)", border: "1px solid var(--gym-accent-dim)" }}
                        >
                          Destacada
                        </span>
                      )}
                      {mr.label && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 bg-muted text-[#666] border border-[#222]">
                          {mr.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#444] mt-0.5">
                      {mr.routine?.days_per_week ? `${mr.routine.days_per_week} días/semana · ` : ""}
                      Asignada {formatDate(mr.starts_at)}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!mr.is_featured && (
                      <button
                        onClick={() => handleSetFeatured(mr.id)}
                        disabled={isFeaturing}
                        title="Marcar como destacada"
                        className="h-7 px-2.5 text-[10px] font-medium rounded-lg border border-[#222] text-[#555] hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        {isFeaturing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Star className="w-3 h-3" />
                        )}
                        Destacar
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(mr.id, routineName)}
                      disabled={isRemoving}
                      title="Quitar del stack"
                      className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#222] text-[#555] hover:border-[rgba(239,68,68,0.4)] hover:text-[#EF4444] transition-colors disabled:opacity-40"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sheet de asignación (overlay) ── */}
      {showAssignSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowAssignSheet(false)}
          />
          {/* Panel */}
          <div className="relative z-10 w-full sm:max-w-sm bg-card border border-border rounded-t-[20px] sm:rounded-[16px] p-5 space-y-4 mx-4 mb-0 sm:mb-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Asignar rutina</p>
              <button
                onClick={() => setShowAssignSheet(false)}
                className="text-[#555] hover:text-[#888] text-sm"
              >
                ✕
              </button>
            </div>

            {/* Select de rutinas */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555] uppercase tracking-[0.06em]">
                Rutina del gym
              </label>
              {unassignedRoutines.length === 0 ? (
                <p className="text-[11px] text-[#444] py-2">
                  Todas las rutinas ya están asignadas a este miembro.
                </p>
              ) : (
                <div className="max-h-[200px] overflow-y-auto space-y-1 pr-0.5">
                  {unassignedRoutines.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoutineId(r.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-[10px] border transition-all ${
                        selectedRoutineId === r.id
                          ? "border-primary/50 bg-primary/[8%]"
                          : "border-border hover:border-border"
                      }`}
                    >
                      <p className={`text-[12px] font-medium ${
                        selectedRoutineId === r.id ? "text-primary" : "text-[#ccc]"
                      }`}>
                        {r.name}
                      </p>
                      {r.days_per_week && (
                        <p className="text-[10px] text-[#444] mt-0.5">{r.days_per_week} días/semana</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input de etiqueta */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555] uppercase tracking-[0.06em]">
                Etiqueta (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Fuerza, Cardio, En casa…"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                maxLength={50}
                className="w-full h-9 bg-sidebar border border-border rounded-[10px] px-3 text-[12px] text-[#ccc] placeholder:text-[#333] outline-none focus:border-border transition-colors"
              />
            </div>

            {/* Botón confirmar */}
            <button
              onClick={handleAssign}
              disabled={assigning || !selectedRoutineId}
              className="w-full h-9 bg-primary text-white text-[12px] font-semibold rounded-[10px] disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {assigning ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Asignando…</>
              ) : (
                "Agregar al stack"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Sección inferior: Historial de rutinas ── */}
      {historyRoutines.length > 0 && (
        <div className="bg-card border border-border rounded-[14px] overflow-hidden">
          <button
            onClick={() => setHistoryExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f0f0f] transition-colors"
          >
            <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em]">
              Historial de rutinas ({historyRoutines.length})
            </p>
            {historyExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-[#444]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[#444]" />
            }
          </button>

          {historyExpanded && (
            <div className="divide-y divide-border border-t border-border">
              {historyRoutines.map((mr) => (
                <div key={mr.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-[#888] truncate">
                        {mr.routine?.name ?? "Rutina eliminada"}
                      </p>
                      {mr.label && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 bg-[#161616] text-[#444] border border-border">
                          {mr.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#333] mt-0.5">
                      {formatDate(mr.starts_at)} — retirada
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
