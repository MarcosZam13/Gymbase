// page.tsx — Grid de contenido exclusivo con filtro de categorías, tema oscuro GymBase

import { Suspense } from "react";
import Link from "next/link";
import {
  FileText,
  Video,
  Image as ImageIcon,
  FileDown,
  Link as LinkIcon,
  Lock,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { getContentForUser } from "@core/actions/content.actions";
import { getUserSubscription } from "@core/actions/payment.actions";
import { getCategories } from "@core/actions/category.actions";
import { CategoryFilter } from "@core/app/(portal)/portal/content/CategoryFilter";
import type { ContentType } from "@/types/database";

const TYPE_ICONS: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  article: FileText,
  video:   Video,
  image:   ImageIcon,
  file:    FileDown,
  link:    LinkIcon,
};

const TYPE_LABELS: Record<ContentType, string> = {
  article: "Artículo",
  video:   "Video",
  image:   "Imagen",
  file:    "Archivo",
  link:    "Enlace",
};

// Color de ícono según tipo de contenido
const TYPE_COLORS: Record<ContentType, string> = {
  article: "#38BDF8",
  video:   "#FF5E14",
  image:   "#A855F7",
  file:    "#22C55E",
  link:    "#FACC15",
};

interface PortalContentPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function PortalContentPage({ searchParams }: PortalContentPageProps): Promise<React.ReactNode> {
  const { category: categorySlug } = await searchParams;

  const [contentItems, subscription, categories] = await Promise.all([
    getContentForUser(),
    getUserSubscription(),
    getCategories(true),
  ]);

  const hasActiveSubscription = subscription?.status === "active";

  // Sin membresía activa — CTA para suscribirse
  if (!hasActiveSubscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
          >
            Contenido exclusivo
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--gym-text-muted)" }}>
            Accede a artículos, videos y recursos de entrenamiento
          </p>
        </div>

        <div
          className="flex flex-col items-center gap-4 py-20 rounded-2xl"
          style={{
            backgroundColor: "var(--gym-bg-card)",
            border: "1px solid var(--gym-border)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,94,20,0.1)" }}
          >
            <Lock className="w-7 h-7" style={{ color: "#FF5E14" }} />
          </div>
          <div className="text-center">
            <p className="font-semibold" style={{ color: "var(--gym-text-primary)" }}>
              Contenido exclusivo para miembros
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--gym-text-muted)" }}>
              Necesitas una membresía activa para acceder.
            </p>
          </div>
          <Link
            href="/portal/plans"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "#FF5E14", color: "#FFFFFF" }}
          >
            Ver planes disponibles
          </Link>
        </div>
      </div>
    );
  }

  // Filtrar por categoría si hay un slug activo
  const filtered = categorySlug
    ? contentItems.filter((item) => {
        const cat = item.category as { slug: string } | null | undefined;
        return cat?.slug === categorySlug;
      })
    : contentItems;

  return (
    <div className="space-y-6">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5" style={{ color: "#FF5E14" }} />
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
            >
              Contenido exclusivo
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--gym-text-muted)" }}>
            {filtered.length} elemento{filtered.length !== 1 ? "s" : ""} disponible{filtered.length !== 1 ? "s" : ""}
            {categorySlug && (
              <span> en esta categoría</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Filtro de categorías ─────────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <CategoryFilter
          categories={categories}
          activeSlug={categorySlug ?? null}
          totalCount={contentItems.length}
        />
      </Suspense>

      {/* ── Grid de contenido ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-16 rounded-2xl"
          style={{
            backgroundColor: "var(--gym-bg-card)",
            border: "1px solid var(--gym-border)",
          }}
        >
          <BookOpen className="w-8 h-8" style={{ color: "var(--gym-text-ghost)" }} />
          <p className="text-sm" style={{ color: "var(--gym-text-muted)" }}>
            No hay contenido en esta categoría aún.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const TypeIcon = TYPE_ICONS[item.type as ContentType];
            const typeColor = TYPE_COLORS[item.type as ContentType];
            const catColor = (item.category as { color: string } | null)?.color ?? "#FF5E14";
            const catName  = (item.category as { name: string } | null)?.name ?? "";

            return (
              <Link
                key={item.id}
                href={`/portal/content/${item.id}`}
                className="group flex flex-col p-4 rounded-2xl transition-all duration-150 hover:scale-[1.02]"
                style={{
                  backgroundColor: "var(--gym-bg-card)",
                  border: "1px solid var(--gym-border)",
                }}
              >
                {/* Fila superior: tipo + categoría */}
                <div className="flex items-center gap-2 mb-3">
                  {/* Badge de tipo */}
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${typeColor}15`,
                      color: typeColor,
                    }}
                  >
                    <TypeIcon className="w-3 h-3" />
                    {TYPE_LABELS[item.type as ContentType]}
                  </div>

                  {/* Badge de categoría */}
                  {catName && (
                    <div
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold ml-auto"
                      style={{
                        backgroundColor: `${catColor}18`,
                        color: catColor,
                      }}
                    >
                      {catName}
                    </div>
                  )}
                </div>

                {/* Título */}
                <h3
                  className="text-sm font-semibold line-clamp-2 flex-1 leading-snug"
                  style={{ color: "var(--gym-text-primary)" }}
                >
                  {item.title}
                </h3>

                {/* Descripción */}
                {item.description && (
                  <p
                    className="text-xs mt-2 line-clamp-2 leading-relaxed"
                    style={{ color: "var(--gym-text-muted)" }}
                  >
                    {item.description}
                  </p>
                )}

                {/* Footer: link de leer más */}
                <div
                  className="flex items-center gap-1 mt-3 pt-3 text-[11px] font-medium"
                  style={{
                    borderTop: "1px solid var(--gym-border)",
                    color: "var(--gym-text-ghost)",
                  }}
                >
                  <span className="group-hover:text-[#FF5E14] transition-colors" style={{ color: "inherit" }}>
                    Ver contenido
                  </span>
                  <ChevronRight className="w-3 h-3 group-hover:text-[#FF5E14] transition-colors" style={{ color: "inherit" }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
