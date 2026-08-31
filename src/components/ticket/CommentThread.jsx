import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { fullName, initials, formatRelative } from "@/lib/format";

/**
 * The discussion thread on a ticket (WORKFLOW.md §A6).
 *
 * Presentational: the parent owns the query and the mutation, this takes the
 * comments and an onSubmit. entity_type and entity_id are never sent — the
 * backend sets them from the route (PLAN.md §5, the polymorphic comments table).
 */
export function CommentThread({ comments = [], onSubmit, isPending }) {
  const [text, setText] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    // Clear optimistically so the box feels instant; the parent invalidates the
    // query on success and the real comment replaces this gap.
    setText("");
    try {
      await onSubmit(trimmed);
    } catch {
      // Put the text back rather than losing what they wrote.
      setText(trimmed);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {initials(comment.user)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="text-sm">
                <span className="font-medium">{fullName(comment.user)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatRelative(comment.createdAt)}
                </span>
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {comment.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a comment…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending || !text.trim()}>
            {isPending && <Spinner />}
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CommentThread;
