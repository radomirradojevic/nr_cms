import {
  getPublishedCommentsForPost,
  type PublicComment,
} from "@/data/comments";
import { getTranslations } from "@/lib/i18n/server";
import { BlogCommentForm } from "./blog-comment-form";
import { BlogCommentThread } from "./blog-comment-thread";

type Props = {
  contentId: string;
  postSlug: string;
  allowAnonymous: boolean;
};

type ThreadNode = PublicComment & { replies: PublicComment[] };

function buildThread(rows: PublicComment[]): ThreadNode[] {
  const top: ThreadNode[] = [];
  const byId = new Map<string, ThreadNode>();
  for (const r of rows) {
    if (r.parentId === null) {
      const node: ThreadNode = { ...r, replies: [] };
      byId.set(r.id, node);
      top.push(node);
    }
  }
  for (const r of rows) {
    if (r.parentId !== null) {
      const parent = byId.get(r.parentId);
      if (parent) parent.replies.push(r);
    }
  }
  return top;
}

export async function BlogComments({
  contentId,
  postSlug,
  allowAnonymous,
}: Props) {
  const t = await getTranslations("frontend");
  const rows = await getPublishedCommentsForPost(contentId);
  const thread = buildThread(rows);

  return (
    <section className="mt-12 space-y-6 border-t pt-8" id="comments">
      <h2 className="text-2xl font-semibold">
        {t("public.comments.title")} {rows.length > 0 && `(${rows.length})`}
      </h2>

      {thread.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("public.comments.empty")}
        </p>
      ) : (
        <ol className="space-y-4">
          {thread.map((c) => (
            <BlogCommentThread
              key={c.id}
              node={c}
              contentId={contentId}
              postSlug={postSlug}
              allowAnonymous={allowAnonymous}
            />
          ))}
        </ol>
      )}

      <BlogCommentForm
        contentId={contentId}
        postSlug={postSlug}
        allowAnonymous={allowAnonymous}
      />
    </section>
  );
}
