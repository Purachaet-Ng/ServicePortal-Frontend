import { Inbox, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Nothing yet" and "no matches" are DIFFERENT SCREENS (WORKFLOW.md §A4).
 *
 * A new user with zero tickets needs a "create your first ticket" button.
 * Someone who filtered to URGENT and got nothing needs "clear filters". Showing
 * the create button to the second user is a dead end — the records exist, the
 * filter is just hiding them.
 *
 * `isFiltered` comes from useListQuery and is what tells them apart.
 */
export function ListEmptyState({
  isFiltered,
  onClearFilters,
  title,
  description,
  action,
  className,
}) {
  const Icon = isFiltered ? SearchX : Inbox;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="font-medium">
          {isFiltered ? "No matches" : (title ?? "Nothing here yet")}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isFiltered
            ? "No records match the current filters."
            : description}
        </p>
      </div>

      {isFiltered
        ? onClearFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          )
        : action}
    </div>
  );
}

export default ListEmptyState;
