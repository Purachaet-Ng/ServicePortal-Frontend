import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton rows for a loading list. Never a blank screen, never a bare spinner
 * where rows are about to appear — the skeleton keeps the layout from jumping
 * when the data lands (WORKFLOW.md §A10).
 */
export function LoadingRows({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 py-2">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className="h-5 flex-1"
              style={{ maxWidth: columnIndex === 0 ? "40%" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default LoadingRows;
