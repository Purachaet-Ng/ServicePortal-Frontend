import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The error state every list and detail page owes the user (WORKFLOW.md §A10).
 * Shows the real message from client.js — "Cannot reach the server" and
 * "Ticket not found" need different reactions from the reader.
 */
export function ErrorState({ error, onRetry, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-8 text-destructive" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="font-medium">Something went wrong</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error?.message ?? "Please try again."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
