// MemberProgressPhotoUpload.tsx — Modal para que el miembro suba sus propias fotos de progreso

"use client";

import { useState, useTransition, useRef } from "react";
import { Camera, X, Upload, CheckCircle } from "lucide-react";
import { uploadProgressPhoto } from "@/actions/health.actions";

type PhotoType = "front" | "side" | "back";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: "Frente",
  side: "Lado",
  back: "Espalda",
};

// Subir foto de progreso propio — no necesita memberId, el action usa user.id del servidor
export function MemberProgressPhotoUpload(): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [photoType, setPhotoType] = useState<PhotoType>("front");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose(): void {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setOpen(false);
    setPreviewUrl(null);
    setNotes("");
    setError(null);
    setSuccess(false);
    setPhotoType("front");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = e.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona una foto primero");
      return;
    }

    const formData = new FormData(form);
    // No incluir memberId — el action usará user.id del servidor
    formData.delete("memberId");

    startTransition(async () => {
      const result = await uploadProgressPhoto(formData);
      if (!result.success) {
        setError(typeof result.error === "string" ? result.error : "Error al subir la foto");
        return;
      }
      setSuccess(true);
      setTimeout(() => handleClose(), 1200);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors"
        style={{
          backgroundColor: "rgba(255,94,20,0.1)",
          border: "1px solid rgba(255,94,20,0.25)",
          color: "#FF5E14",
        }}
      >
        <Camera className="w-3.5 h-3.5" />
        Subir foto
      </button>

      {/* Overlay del modal */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="w-full max-w-sm bg-[#111] border border-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" style={{ color: "#FF5E14" }} />
                <p className="text-[13px] font-semibold" style={{ color: "var(--gym-text-primary)" }}>
                  Subir foto de progreso
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-[#444] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Selector de tipo de foto */}
              <div className="grid grid-cols-3 gap-2">
                {(["front", "side", "back"] as PhotoType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPhotoType(type)}
                    className="py-2 rounded-lg text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: photoType === type ? "rgba(255,94,20,0.15)" : "#1a1a1a",
                      border: `1px solid ${photoType === type ? "#FF5E14" : "#222"}`,
                      color: photoType === type ? "#FF5E14" : "var(--gym-text-muted)",
                    }}
                  >
                    {PHOTO_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              <input type="hidden" name="photoType" value={photoType} />

              {/* Área de preview / selector de archivo */}
              <div
                className="relative rounded-xl overflow-hidden cursor-pointer"
                style={{
                  aspectRatio: "3/4",
                  backgroundColor: "#0d0d0d",
                  border: "1px dashed #2a2a2a",
                }}
                onClick={() => fileRef.current?.click()}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Upload className="w-8 h-8" style={{ color: "#333" }} />
                    <p className="text-[11px]" style={{ color: "#444" }}>
                      Toca para seleccionar foto
                    </p>
                    <p className="text-[9px]" style={{ color: "#333" }}>
                      JPG, PNG o WebP · máx 5MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "#444" }}>
                  Notas (opcional)
                </label>
                <textarea
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej: semana 4 del programa..."
                  className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[12px] resize-none outline-none focus:border-[#FF5E14]"
                  style={{ color: "var(--gym-text-primary)" }}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-[11px] text-red-400 text-center">{error}</p>
              )}

              {/* Botón de submit */}
              <button
                type="submit"
                disabled={isPending || success}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  backgroundColor: success ? "rgba(34,197,94,0.15)" : "#FF5E14",
                  color: success ? "#22C55E" : "#fff",
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {success ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Subida correctamente
                  </span>
                ) : isPending ? (
                  "Subiendo..."
                ) : (
                  "Guardar foto"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
