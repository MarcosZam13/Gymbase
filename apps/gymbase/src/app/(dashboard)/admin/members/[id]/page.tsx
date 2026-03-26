// page.tsx — Perfil detallado de un miembro con tabs de salud, rutina y membresía

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, Shield } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Badge } from "@core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { getMemberById } from "@core/actions/admin.actions";
import { formatDate, formatPrice } from "@/lib/utils";
import { getHealthProfile, getHealthHistory } from "@/actions/health.actions";
import { getRoutines } from "@/actions/routine.actions";
import { HealthProfileCard } from "@/components/gym/health/HealthProfileCard";
import { HealthSnapshotList } from "@/components/gym/health/HealthSnapshotList";
import { HealthMetricsForm } from "@/components/gym/health/HealthMetricsForm";
import { SnapshotForm } from "@/components/gym/health/SnapshotForm";
import { MemberProfileEditForm } from "@/components/gym/members/MemberProfileEditForm";
import { themeConfig } from "@/lib/theme";
import type { SubscriptionStatus } from "@/types/database";

const STATUS_CONFIG: Record<SubscriptionStatus | "none", { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Activo",        variant: "default" },
  pending:   { label: "Pendiente",     variant: "secondary" },
  expired:   { label: "Expirado",      variant: "destructive" },
  cancelled: { label: "Cancelado",     variant: "outline" },
  rejected:  { label: "Rechazado",     variant: "destructive" },
  none:      { label: "Sin membresía", variant: "outline" },
};

interface MemberDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function MemberDetailPage({ params, searchParams }: MemberDetailPageProps): Promise<React.ReactNode> {
  const { id } = await params;
  const { tab = "info" } = await searchParams;

  const member = await getMemberById(id);
  if (!member) notFound();

  const subscriptions = member.active_subscription as unknown as Array<{
    status: SubscriptionStatus;
    starts_at: string | null;
    expires_at: string | null;
    plan?: { name: string; price: number; currency: string; duration_days: number };
  }> | undefined;
  const sub = Array.isArray(subscriptions) ? subscriptions[0] : undefined;
  const status = (sub?.status ?? "none") as SubscriptionStatus | "none";

  // Cargar datos de salud y rutinas en paralelo si los módulos están activos
  const [healthProfile, healthSnapshots, routines] = await Promise.all([
    themeConfig.features.gym_health_metrics ? getHealthProfile(id) : Promise.resolve(null),
    themeConfig.features.gym_health_metrics ? getHealthHistory(id, 10) : Promise.resolve([]),
    themeConfig.features.gym_routines ? getRoutines() : Promise.resolve([]),
  ]);

  const TABS = [
    { key: "info", label: "Información" },
    ...(themeConfig.features.gym_health_metrics ? [{ key: "health", label: "Salud" }] : []),
    ...(themeConfig.features.gym_routines ? [{ key: "routine", label: "Rutina" }] : []),
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navegación */}
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin/members">
          <ArrowLeft className="w-4 h-4" />
          Volver a miembros
        </Link>
      </Button>

      {/* Header del perfil */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{member.full_name ?? "Sin nombre"}</h1>
          <p className="text-muted-foreground text-sm">{member.email}</p>
        </div>
        <Badge variant={STATUS_CONFIG[status].variant}>{STATUS_CONFIG[status].label}</Badge>
      </div>

      {/* Tabs de navegación */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/members/${id}?tab=${key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab: Información */}
      {tab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                {member.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                {member.phone ?? "Sin teléfono"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                Miembro desde {formatDate(member.created_at)}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4 shrink-0" />
                Rol: {member.role}
              </div>
              <MemberProfileEditForm
                memberId={member.id}
                initialName={member.full_name ?? null}
                initialPhone={member.phone ?? null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Membresía</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {sub ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{sub.plan?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio</span>
                    <span>{sub.plan ? formatPrice(sub.plan.price, sub.plan.currency) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inicio</span>
                    <span>{formatDate(sub.starts_at ?? null)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vencimiento</span>
                    <span>{formatDate(sub.expires_at ?? null)}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Sin membresía activa</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Salud */}
      {tab === "health" && themeConfig.features.gym_health_metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Perfil de salud actual */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Perfil de salud</h2>
              <HealthProfileCard profile={healthProfile} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Actualizar perfil</CardTitle>
                </CardHeader>
                <CardContent>
                  <HealthMetricsForm userId={id} profile={healthProfile} />
                </CardContent>
              </Card>
            </div>

            {/* Historial de snapshots */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Historial de mediciones</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nuevo snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <SnapshotForm userId={id} />
                </CardContent>
              </Card>
              <HealthSnapshotList snapshots={healthSnapshots} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Rutina */}
      {tab === "routine" && themeConfig.features.gym_routines && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Rutina asignada</h2>
          <Card>
            <CardContent className="p-6">
              {routines.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No hay rutinas creadas aún.</p>
                  <Button asChild size="sm">
                    <Link href="/admin/routines/new">Crear rutina</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Asigna una rutina a este miembro desde la sección de rutinas.
                  </p>
                  <div className="space-y-2">
                    {routines.map((routine) => (
                      <div
                        key={routine.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div>
                          <p className="font-medium text-sm">{routine.name}</p>
                          {routine.description && (
                            <p className="text-xs text-muted-foreground">{routine.description}</p>
                          )}
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/routines/${routine.id}`}>Ver rutina</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
