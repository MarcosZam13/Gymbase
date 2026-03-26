// SettingsClient.tsx — Componente cliente para editar configuración del gym y administradores

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, UserPlus, X, Shield, Settings, CreditCard } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@core/components/ui/card";
import { Alert, AlertDescription } from "@core/components/ui/alert";
import { updateOrgSettings, promoteToAdmin, revokeAdmin } from "@/actions/settings.actions";
import type { OrgSettings, AdminProfile } from "@/actions/settings.actions";

// Schema de validación para el formulario de configuración
const settingsFormSchema = z.object({
  gym_name: z.string().min(1, "El nombre es requerido").max(100),
  slogan: z.string().max(200).optional().or(z.literal("")),
  sinpe_number: z.string().max(20).optional().or(z.literal("")),
  sinpe_name: z.string().max(100).optional().or(z.literal("")),
  max_capacity: z.number().int().min(1).max(10000).optional().nullable(),
  cancel_minutes: z.number().int().min(0).max(1440).optional().nullable(),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface SettingsClientProps {
  settings: OrgSettings | null;
  admins: AdminProfile[];
  currentUserId: string;
}

export function SettingsClient({ settings, admins: initialAdmins, currentUserId }: SettingsClientProps): React.ReactNode {
  const [admins, setAdmins] = useState<AdminProfile[]>(initialAdmins);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      gym_name: settings?.gym_name ?? "",
      slogan: settings?.slogan ?? "",
      sinpe_number: settings?.sinpe_number ?? "",
      sinpe_name: settings?.sinpe_name ?? "",
      max_capacity: settings?.max_capacity ?? null,
      cancel_minutes: settings?.cancel_minutes ?? null,
    },
  });

  async function onSubmitSettings(data: SettingsFormValues): Promise<void> {
    const result = await updateOrgSettings({
      ...data,
      slogan: data.slogan || null,
      sinpe_number: data.sinpe_number || null,
      sinpe_name: data.sinpe_name || null,
    });
    if (result.success) {
      toast.success("Configuración guardada");
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al guardar";
      toast.error(msg);
    }
  }

  async function handleInvite(): Promise<void> {
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    setInviteLoading(true);
    const result = await promoteToAdmin(inviteEmail.trim());
    setInviteLoading(false);
    if (result.success) {
      toast.success("Administrador agregado correctamente");
      setInviteEmail("");
      // Refrescar lista: agregar placeholder hasta que la página se recargue
      setAdmins(prev => [...prev, {
        id: "pending",
        full_name: null,
        email: inviteEmail.trim(),
        role: "admin",
        created_at: new Date().toISOString(),
      }]);
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error";
      setInviteError(msg);
    }
  }

  async function handleRevoke(userId: string): Promise<void> {
    setRevokeLoading(userId);
    const result = await revokeAdmin(userId);
    setRevokeLoading(null);
    if (result.success) {
      toast.success("Permisos revocados");
      setAdmins(prev => prev.filter(a => a.id !== userId));
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ——— Sección 1: Información del Gym ——— */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Información del gym</CardTitle>
          </div>
          <CardDescription>Datos visibles en la app y en los comprobantes de pago</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitSettings)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gym_name">Nombre del gym</Label>
                <Input id="gym_name" placeholder="Ej: FitPro Studio" {...register("gym_name")} />
                {errors.gym_name && <p className="text-xs text-destructive">{errors.gym_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slogan">Eslogan</Label>
                <Input id="slogan" placeholder="Ej: Entrena diferente" {...register("slogan")} />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Información de pago SINPE</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sinpe_number">Número SINPE</Label>
                  <Input id="sinpe_number" placeholder="8888-1234" {...register("sinpe_number")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sinpe_name">Nombre registrado en SINPE</Label>
                  <Input id="sinpe_name" placeholder="Juan Pérez" {...register("sinpe_name")} />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <span className="text-sm font-medium block mb-3">Capacidad y clases</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="max_capacity">Aforo máximo del gym</Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    min={1}
                    max={10000}
                    placeholder="50"
                    {...register("max_capacity", { valueAsNumber: true })}
                  />
                  {errors.max_capacity && <p className="text-xs text-destructive">{errors.max_capacity.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cancel_minutes">Minutos mín. para cancelar clase</Label>
                  <Input
                    id="cancel_minutes"
                    type="number"
                    min={0}
                    max={1440}
                    placeholder="60"
                    {...register("cancel_minutes", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">0 = sin restricción</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ——— Sección 2: Administradores ——— */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Administradores</CardTitle>
          </div>
          <CardDescription>Usuarios con acceso al panel de administración</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de admins actuales */}
          <div className="space-y-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg border border-border"
              >
                <div>
                  <p className="text-sm font-medium">{admin.full_name ?? admin.email}</p>
                  {admin.full_name && (
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  )}
                </div>
                {admin.id !== currentUserId && admin.id !== "pending" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive h-7 text-xs"
                    disabled={revokeLoading === admin.id}
                    onClick={() => handleRevoke(admin.id)}
                  >
                    {revokeLoading === admin.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    Revocar
                  </Button>
                ) : admin.id === "pending" ? (
                  <span className="text-xs text-muted-foreground italic">Invitación enviada</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Tú</span>
                )}
              </div>
            ))}
            {admins.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No hay administradores registrados.</p>
            )}
          </div>

          {/* Agregar administrador */}
          <div className="border-t border-border pt-4">
            <Label className="mb-2 block">Agregar administrador</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Si el correo ya está registrado, se le otorgará el rol admin. Si no, se enviará una invitación.
            </p>
            {inviteError && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="admin@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleInvite())}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={inviteLoading || !inviteEmail.trim()}
                onClick={handleInvite}
                className="gap-2 shrink-0"
              >
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Agregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
