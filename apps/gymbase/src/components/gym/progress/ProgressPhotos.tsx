// ProgressPhotos.tsx — Grid de fotos de progreso del miembro

import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { Badge } from "@core/components/ui/badge";
import { Camera } from "lucide-react";
import type { ProgressPhoto } from "@/types/gym-health";

interface ProgressPhotosProps {
  photos: ProgressPhoto[];
}

const PHOTO_TYPE_LABELS: Record<string, string> = {
  front: "Frente",
  side: "Lateral",
  back: "Espalda",
};

export function ProgressPhotos({ photos }: ProgressPhotosProps): React.ReactNode {
  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay fotos de progreso.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fotos de progreso</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.photo_url}
                alt={`Progreso ${PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type}`}
                className="w-full h-40 object-cover rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 rounded-b-lg px-2 py-1">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">{PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type}</Badge>
                  <span className="text-xs text-white">
                    {new Date(photo.taken_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
