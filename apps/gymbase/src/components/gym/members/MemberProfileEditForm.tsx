// MemberProfileEditForm.tsx — Formulario para editar nombre, teléfono y foto de un miembro (admin)

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMemberProfile } from "@/actions/member.actions";
import { uploadMemberAvatar } from "@/actions/member.actions";
import { ImageUploadButton } from "@/components/shared/ImageUploadButton";

const schema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface MemberProfileEditFormProps {
  memberId: string;
  initialName: string | null;
  initialPhone: string | null;
  initialAvatarUrl?: string | null;
}

export function MemberProfileEditForm({
  memberId,
  initialName,
  initialPhone,
  initialAvatarUrl,
}: MemberProfileEditFormProps): React.ReactNode {
  const [editing, setEditing] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initialName ?? "",
      phone: initialPhone ?? "",
    },
  });

  function handleCancel(): void {
    reset({ full_name: initialName ?? "", phone: initialPhone ?? "" });
    setEditing(false);
  }

  async function onSubmit(data: FormValues): Promise<void> {
    const result = await updateMemberProfile(memberId, {
      full_name: data.full_name,
      phone: data.phone || null,
    });
    if (result.success) {
      toast.success("Perfil actualizado");
      setEditing(false);
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al guardar los cambios";
      toast.error(msg);
    }
  }

  async function handleAvatarUpload(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("memberId", memberId);
    const result = await uploadMemberAvatar(fd);
    if (!result.success) throw new Error(typeof result.error === "string" ? result.error : "Error al subir");
    toast.success("Foto actualizada");
    return result.data!.url;
  }

  if (!editing) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 cursor-pointer"
        onClick={() => setEditing(true)}
      >
        <Pencil className="w-3.5 h-3.5" />
        Editar contacto
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-3 p-3 rounded-lg border border-border bg-muted/30">
      {/* Avatar upload */}
      <div className="flex items-center gap-3">
        <ImageUploadButton
          currentUrl={initialAvatarUrl}
          onUpload={handleAvatarUpload}
          shape="circle"
          width="w-16"
          height="h-16"
        />
        <div>
          <p className="text-[11px] font-medium" style={{ color: "var(--gym-text-primary)" }}>
            Foto de perfil
          </p>
          <p className="text-[10px]" style={{ color: "var(--gym-text-muted)" }}>
            JPG, PNG o WebP · máx 2 MB
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit_full_name">Nombre completo</Label>
        <Input id="edit_full_name" placeholder="Juan Pérez" {...register("full_name")} />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_phone">Teléfono</Label>
        <Input id="edit_phone" placeholder="8888-1234" {...register("phone")} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 cursor-pointer">
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleCancel} className="gap-1.5 cursor-pointer">
          <X className="w-3.5 h-3.5" />
          Cancelar
        </Button>
      </div>
    </form>
  );
}
