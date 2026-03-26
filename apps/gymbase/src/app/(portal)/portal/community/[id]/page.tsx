// page.tsx — Detalle de un post con hilo de comentarios

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pin } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Badge } from "@core/components/ui/badge";
import { Separator } from "@core/components/ui/separator";
import { getPostById } from "@core/actions/community.actions";
import { getUserSubscription } from "@core/actions/payment.actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import CommentForm from "@core/app/(portal)/portal/community/[id]/CommentForm";
import { DeletePostButton } from "@core/app/(portal)/portal/community/[id]/DeletePostButton";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps): Promise<React.ReactNode> {
  const { id } = await params;

  const [post, subscription, currentUser] = await Promise.all([
    getPostById(id),
    getUserSubscription(),
    getCurrentUser(),
  ]);

  if (!post) notFound();

  const canComment = subscription?.status === "active";
  // El autor puede borrar su propio post
  const isAuthor = currentUser?.id === post.user_id;
  const visibleComments = (post.comments ?? []).filter((c) => c.is_visible);

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/portal/community">
          <ArrowLeft className="w-4 h-4" />
          Volver a la comunidad
        </Link>
      </Button>

      <article className="space-y-3">
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-bold leading-tight flex-1">{post.title}</h1>
          {post.is_pinned && (
            <Badge variant="secondary" className="shrink-0 gap-1 mt-1">
              <Pin className="w-3 h-3" />
              Fijado
            </Badge>
          )}
          {isAuthor && <DeletePostButton postId={post.id} />}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{post.author?.full_name ?? "Miembro"}</span>
          <span>·</span>
          <span>{formatDate(post.created_at)}</span>
        </div>

        <p className="text-foreground whitespace-pre-wrap leading-relaxed">{post.body}</p>
      </article>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-semibold">
          {visibleComments.length} comentario{visibleComments.length !== 1 ? "s" : ""}
        </h2>

        {visibleComments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aún no hay comentarios. ¡Sé el primero!
          </p>
        )}

        {visibleComments.map((comment) => (
          <div key={comment.id} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{comment.author?.full_name ?? "Miembro"}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-xs">{formatDate(comment.created_at)}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.body}</p>
          </div>
        ))}

        {canComment ? (
          <CommentForm postId={post.id} />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Necesitas una membresía activa para comentar.{" "}
            <Link href="/portal/plans" className="text-primary underline underline-offset-2">
              Ver planes
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
