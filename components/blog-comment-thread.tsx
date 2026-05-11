"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BlogCommentForm } from "./blog-comment-form";
import type { PublicComment } from "@/data/comments";

type ThreadNode = PublicComment & { replies: PublicComment[] };

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function CommentBody({
  comment,
  isReply = false,
}: {
  comment: PublicComment;
  isReply?: boolean;
}) {
  return (
    <article
      className={
        "rounded-lg border p-4 " + (isReply ? "ml-8 bg-muted/30" : "bg-card")
      }
    >
      <header className="mb-2 flex flex-wrap items-baseline gap-2 text-sm">
        <span className="font-semibold">{comment.authorName}</span>
        <time
          className="text-xs text-muted-foreground"
          dateTime={new Date(comment.createdAt).toISOString()}
        >
          {formatDate(comment.createdAt)}
        </time>
      </header>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {comment.body}
      </p>
    </article>
  );
}

type Props = {
  node: ThreadNode;
  contentId: string;
  postSlug: string;
  allowAnonymous: boolean;
};

export function BlogCommentThread({
  node,
  contentId,
  postSlug,
  allowAnonymous,
}: Props) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyMsg, setReplyMsg] = useState<string | null>(null);

  return (
    <li className="space-y-3">
      <CommentBody comment={node} />

      {/* Replies */}
      {node.replies.length > 0 && (
        <ol className="space-y-3">
          {node.replies.map((r) => (
            <li key={r.id}>
              <CommentBody comment={r} isReply />
            </li>
          ))}
        </ol>
      )}

      {/* Reply success message */}
      {replyMsg && !showReplyForm && (
        <p className="ml-8 text-sm text-emerald-500" role="status">
          {replyMsg}
        </p>
      )}

      {/* Reply button — only on top-level comments */}
      {!showReplyForm && (
        <div className="ml-0 pl-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => { setShowReplyForm(true); setReplyMsg(null); }}
          >
            Reply
          </Button>
        </div>
      )}

      {/* Inline reply form */}
      {showReplyForm && (
        <div className="ml-8">
          <BlogCommentForm
            contentId={contentId}
            postSlug={postSlug}
            allowAnonymous={allowAnonymous}
            parentId={node.id}
            onCancel={() => setShowReplyForm(false)}
            onSubmitted={(msg) => { setReplyMsg(msg); setShowReplyForm(false); }}
          />
        </div>
      )}
    </li>
  );
}
