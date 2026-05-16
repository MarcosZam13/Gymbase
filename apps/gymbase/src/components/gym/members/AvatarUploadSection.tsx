// AvatarUploadSection — Avatar clicable con upload para el portal del miembro

"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadMyAvatar } from "@/actions/settings.actions";

interface AvatarUploadSectionProps {
  currentUrl?: string | null;
  initials: string;
}

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024;

export function AvatarUploadSection({ currentUrl, initials }: AvatarUploadSectionProps): React.ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG o WebP");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("La imagen no puede superar 2 MB");
      return;
    }

    const local = URL.createObjectURL(file);
    setPreview(local);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadMyAvatar(fd);
      if (!result.success) throw new Error(typeof result.error === "string" ? result.error : "Error");
      setPreview(result.data!.url);
      URL.revokeObjectURL(local);
      toast.success("Foto de perfil actualizada");
    } catch {
      toast.error("Error al subir la imagen");
      setPreview(currentUrl ?? null);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative w-14 h-14 shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-14 h-14 rounded-2xl overflow-hidden relative group cursor-pointer"
        style={{ border: "1px solid color-mix(in srgb, var(--gym-accent) 20%, transparent)" }}
        title="Cambiar foto de perfil"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-lg font-bold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--gym-accent) 12%, transparent)",
              color: "var(--gym-accent)",
              fontFamily: "var(--font-barlow)",
            }}
          >
            {initials}
          </div>
        )}

        {/* Overlay en hover / carga */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${loading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: "inherit" }}
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin text-white" />
            : <Upload className="w-4 h-4 text-white" />}
        </div>
      </button>
    </div>
  );
}
