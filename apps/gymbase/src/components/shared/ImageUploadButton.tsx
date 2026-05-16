// ImageUploadButton — área de upload reutilizable para avatars (circle) y thumbnails/banners (rect)

"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadButtonProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  shape?: "circle" | "rect";
  width?: string;
  height?: string;
  className?: string;
}

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export function ImageUploadButton({
  currentUrl,
  onUpload,
  shape = "circle",
  width = shape === "circle" ? "w-20" : "w-full",
  height = shape === "circle" ? "h-20" : "h-36",
  className,
}: ImageUploadButtonProps): React.ReactNode {
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

    // Preview local inmediato
    const local = URL.createObjectURL(file);
    setPreview(local);
    setLoading(true);

    try {
      const url = await onUpload(file);
      setPreview(url);
      URL.revokeObjectURL(local);
    } catch {
      toast.error("Error al subir la imagen");
      setPreview(currentUrl ?? null);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const rounded = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className={className}>
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
        className={`relative overflow-hidden flex items-center justify-center group cursor-pointer transition-all ${width} ${height} ${rounded}`}
        style={{
          backgroundColor: "var(--gym-bg-card)",
          border: "2px dashed var(--gym-border)",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <ImageIcon className="w-6 h-6" style={{ color: "var(--gym-text-muted)" }} />
            <span className="text-[10px]" style={{ color: "var(--gym-text-muted)" }}>
              Subir imagen
            </span>
          </div>
        )}

        {/* Overlay al hacer hover o mientras carga */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity ${loading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <>
              <Upload className="w-5 h-5 text-white" />
              <span className="text-[10px] text-white font-medium">
                {preview ? "Cambiar" : "Subir"}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}
