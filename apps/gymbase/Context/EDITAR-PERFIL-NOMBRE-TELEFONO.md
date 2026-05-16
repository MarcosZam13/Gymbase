# Edición de Perfil — Nombre y Teléfono

## Qué hay que construir

El perfil actual (`/portal/profile`) muestra nombre, membresía, rutina, asistencia y progreso, pero **no permite editar ningún dato personal**. Hay que agregar un formulario inline que permita al miembro cambiar su `full_name` y `phone`.

---

## Dónde vive el dato

| Campo | Tabla | Columna |
|---|---|---|
| Nombre | `profiles` | `full_name` (text, nullable) |
| Teléfono | `profiles` | `phone` (text, nullable) |

La política RLS `profiles_update_own` ya existe y permite que el usuario edite su propio perfil:
```sql
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```
No hay que tocar la DB.

---

## Archivos a crear / modificar

### 1. Server Action — `updateMyProfile`
**Archivo:** `src/actions/settings.actions.ts` (agregar al final)

```typescript
const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional().nullable(),
  phone:     z.string().max(20).optional().nullable(),
});

export async function updateMyProfile(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) return { success: false, error: "Error al guardar" };

  revalidatePath("/portal/profile");
  return { success: true };
}
```

### 2. Componente cliente — `ProfileEditForm`
**Archivo:** `src/components/gym/members/ProfileEditForm.tsx` (nuevo, client component)

El componente muestra los valores actuales pre-rellenados y al guardar llama a `updateMyProfile`.

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";
import { updateMyProfile } from "@/actions/settings.actions";

interface Props {
  fullName: string | null;
  phone: string | null;
}

export function ProfileEditForm({ fullName, phone }: Props) {
  const [name, setName] = useState(fullName ?? "");
  const [tel, setTel] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await updateMyProfile({ full_name: name || null, phone: tel || null });
    setSaving(false);
    if (res.success) toast.success("Perfil actualizado");
    else toast.error(typeof res.error === "string" ? res.error : "Error al guardar");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-[#555]">Nombre completo</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-sidebar border border-[#222] rounded-lg px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[var(--gym-accent)]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-[#555]">Teléfono</label>
        <input
          value={tel}
          onChange={(e) => setTel(e.target.value)}
          placeholder="Ej: +506 8888-8888"
          className="w-full bg-sidebar border border-[#222] rounded-lg px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[var(--gym-accent)]"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-9 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "var(--gym-accent)", color: "#000" }}
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
```

### 3. Integrar en `profile/page.tsx`

Agregar una nueva sección entre el header (avatar/nombre) y la membresía:

```tsx
import { ProfileEditForm } from "@/components/gym/members/ProfileEditForm";

// Dentro del JSX, después del bloque del header (SECCIÓN 1):
<div
  className="p-5 rounded-2xl space-y-4"
  style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
>
  <p className="text-[10px] font-semibold uppercase tracking-[0.08em]"
     style={{ color: "var(--gym-text-ghost)" }}>
    Datos personales
  </p>
  <ProfileEditForm
    fullName={profile?.full_name ?? null}
    phone={profile?.phone ?? null}
  />
</div>
```

---

## UX considerada

- El formulario va pre-rellenado con los valores actuales (no vacío).
- Si el usuario no cambia nada y guarda, es un no-op (Supabase no genera error).
- El teléfono es libre — no se valida formato porque Costa Rica, LATAM y fuera tienen formatos distintos.
- Después de guardar, `revalidatePath("/portal/profile")` actualiza el nombre en el header sin recargar la página completa.
- El campo email **no** se expone aquí — cambiarlo requiere flujo de verificación por Supabase Auth y es un feature separado.
