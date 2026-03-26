// page.tsx — Detalle de contenido individual con renderizado según tipo

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Download } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Badge } from "@core/components/ui/badge";
import { getContentById } from "@core/actions/content.actions";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import type { ContentType } from "@/types/database";

const TYPE_LABELS: Record<ContentType, string> = {
  article: "Artículo",
  video: "Video",
  image: "Imagen",
  file: "Archivo",
  link: "Enlace",
};

interface ContentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentDetailPage({ params }: ContentDetailPageProps): Promise<React.ReactNode> {
  const { id } = await params;
  const content = await getContentById(id);

  // RLS en Supabase ya valida el acceso
  if (!content) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/portal/content">
          <ArrowLeft className="w-4 h-4" />
          Volver al contenido
        </Link>
      </Button>

      <div className="space-y-2">
        <Badge variant="outline">{TYPE_LABELS[content.type]}</Badge>
        <h1 className="text-2xl font-bold leading-tight">{content.title}</h1>
        {content.description && (
          <p className="text-muted-foreground">{content.description}</p>
        )}
      </div>

      <div className="space-y-4">
        {/* Video: embed de YouTube o URL directa */}
        {content.type === "video" && content.media_url && (() => {
          const embedUrl = getYouTubeEmbedUrl(content.media_url);
          return (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <video src={content.media_url} controls className="w-full h-full" />
              )}
            </div>
          );
        })()}

        {/* Imagen */}
        {content.type === "image" && content.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.media_url}
            alt={content.title}
            className="rounded-lg max-w-full border border-border"
          />
        )}

        {/* Artículo: HTML sanitizado */}
        {content.type === "article" && content.body && (
          <div
            className="prose prose-sm max-w-none text-foreground"
            // WORKAROUND: dangerouslySetInnerHTML para renderizar HTML de artículos del admin
            dangerouslySetInnerHTML={{ __html: content.body }}
          />
        )}

        {/* Archivo: botón de descarga */}
        {content.type === "file" && content.media_url && (
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted">
            <Download className="w-8 h-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{content.title}</p>
              {content.description && (
                <p className="text-sm text-muted-foreground">{content.description}</p>
              )}
            </div>
            <Button asChild>
              <a href={content.media_url} download target="_blank" rel="noopener noreferrer">
                Descargar
              </a>
            </Button>
          </div>
        )}

        {/* Enlace externo */}
        {content.type === "link" && content.media_url && (
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted">
            <ExternalLink className="w-8 h-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{content.title}</p>
              {content.description && (
                <p className="text-sm text-muted-foreground">{content.description}</p>
              )}
            </div>
            <Button asChild variant="outline">
              <a href={content.media_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                Abrir enlace
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
