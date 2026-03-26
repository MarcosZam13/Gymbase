// MembersClient.tsx — Tabla de miembros con búsqueda en tiempo real

"use client";

import { useState, useDeferredValue } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@core/components/ui/badge";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@core/components/ui/table";
import { formatDate, formatPrice } from "@/lib/utils";
import type { MemberWithSubscription, SubscriptionStatus } from "@/types/database";

// Configuración visual de los badges de estado
const STATUS_CONFIG: Record<SubscriptionStatus | "none", { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Activo",        variant: "default" },
  pending:   { label: "Pendiente",     variant: "secondary" },
  expired:   { label: "Expirado",      variant: "destructive" },
  cancelled: { label: "Cancelado",     variant: "outline" },
  rejected:  { label: "Rechazado",     variant: "destructive" },
  none:      { label: "Sin membresía", variant: "outline" },
};

interface MembersClientProps {
  members: MemberWithSubscription[];
}

export function MembersClient({ members }: MembersClientProps): React.ReactNode {
  const [query, setQuery] = useState("");
  // useDeferredValue evita renders bloqueantes durante el tipeo
  const deferredQuery = useDeferredValue(query);

  const filtered = deferredQuery.trim()
    ? members.filter((m) => {
        const q = deferredQuery.toLowerCase();
        return (
          m.full_name?.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone?.toLowerCase().includes(q)
        );
      })
    : members;

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nombre, correo o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} de {members.length} miembro{members.length !== 1 ? "s" : ""}
      </p>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Plan actual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Miembro desde</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {query ? "No se encontraron miembros con esa búsqueda" : "No hay miembros registrados aún"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => {
                // Obtener la suscripción más reciente
                const subscriptions = member.active_subscription as unknown as Array<{
                  status: SubscriptionStatus;
                  expires_at: string | null;
                  plan?: { name: string; price: number; currency: string };
                }> | undefined;
                const sub = Array.isArray(subscriptions) ? subscriptions[0] : undefined;
                const status = (sub?.status ?? "none") as SubscriptionStatus | "none";
                const statusConfig = STATUS_CONFIG[status];

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{member.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.phone ?? "—"}</TableCell>
                    <TableCell>
                      {sub?.plan ? (
                        <span>
                          {sub.plan.name}{" "}
                          <span className="text-muted-foreground text-xs">
                            ({formatPrice(sub.plan.price, sub.plan.currency)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(sub?.expires_at ?? null)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(member.created_at)}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/members/${member.id}`}>Ver perfil</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
