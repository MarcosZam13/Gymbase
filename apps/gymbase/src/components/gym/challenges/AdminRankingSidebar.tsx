// AdminRankingSidebar.tsx — Sidebar de ranking en tiempo real para la vista admin de retos

import type { Challenge, ChallengeParticipant } from "@/types/gym-challenges";

interface AdminRankingSidebarProps {
  challenges: Challenge[];
  activeDetail: {
    challenge: Challenge | null;
    participants: ChallengeParticipant[];
  } | null;
}

// Colores de posición del podio
const POSITION_COLORS = ["#FACC15", "#9CA3AF", "#CD7C2F"];

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function AdminRankingSidebar({ challenges, activeDetail }: AdminRankingSidebarProps): React.ReactNode {
  const challenge = activeDetail?.challenge;
  const participants = activeDetail?.participants ?? [];
  const sorted = [...participants].sort((a, b) => (b.total_progress ?? 0) - (a.total_progress ?? 0));
  const goalValue = challenge?.goal_value ?? 1;

  return (
    <div className="bg-sidebar border border-border rounded-[18px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border">
        <span className="text-xs font-semibold text-[#666] uppercase tracking-[0.08em]">
          Ranking en tiempo real
        </span>
        {challenge && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {challenges
              .filter(c => {
                const now = new Date();
                return now >= new Date(c.starts_at) && now <= new Date(c.ends_at);
              })
              .map(c => (
                <span
                  key={c.id}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer transition-all ${c.id === challenge?.id ? "bg-primary/10 border border-primary text-primary" : "bg-muted border border-border text-[#666]"}`}
                >
                  {c.title}
                </span>
              ))
            }
          </div>
        )}
      </div>

      {/* Ranking list */}
      <div className="flex-1 px-4 py-3">
        {sorted.length === 0 ? (
          <p className="text-xs text-[#444] text-center py-8">
            {challenge ? "Sin participantes aún" : "No hay retos activos"}
          </p>
        ) : (
          <div className="space-y-0">
            {sorted.map((p, i) => {
              const progress = p.total_progress ?? 0;
              const pct = Math.min(100, Math.round((progress / goalValue) * 100));
              const posColor = POSITION_COLORS[i] ?? "#444";
              const initials = getInitials(p.profile?.full_name);

              return (
                <div key={p.id} className="flex items-center gap-2.5 py-2 border-b border-[#141414] last:border-b-0">
                  {/* Posición */}
                  <div className="w-5 text-center font-barlow font-bold text-sm flex-shrink-0" style={{ color: posColor }}>
                    {i + 1}
                  </div>
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-barlow flex-shrink-0"
                    style={
                      i === 0 ? { background: "rgba(250,204,21,0.15)", color: "#FACC15" }
                      : i === 1 ? { background: "rgba(156,163,175,0.12)", color: "#9CA3AF" }
                      : i === 2 ? { background: "rgba(205,124,47,0.12)", color: "#CD7C2F" }
                      : { background: "var(--card)", color: "#666" }
                    }
                  >
                    {initials}
                  </div>
                  {/* Nombre */}
                  <div className="text-xs font-medium text-white flex-1 truncate">
                    {p.profile?.full_name ?? "Participante"}
                  </div>
                  {/* Barra + valor */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-0.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[11px] font-semibold font-barlow text-[#aaa] min-w-[28px] text-right">
                      {progress}/{goalValue}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Badges footer */}
      {sorted.length > 0 && (
        <div className="flex gap-2 flex-wrap px-4 py-3 border-t border-border">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161616] border border-border rounded-full">
            <span className="text-sm">🏆</span>
            <span className="text-[10px] text-[#666]">Ganador</span>
            <span className="text-[11px] font-semibold font-barlow text-primary">
              {sorted.filter(p => (p.total_progress ?? 0) >= goalValue).length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161616] border border-border rounded-full">
            <span className="text-sm">🥇</span>
            <span className="text-[10px] text-[#666]">Completaron</span>
            <span className="text-[11px] font-semibold font-barlow text-primary">{sorted.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
