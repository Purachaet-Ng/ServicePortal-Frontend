import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The metric block at the top of a dashboard (STITCH-PROMPTS, prompt 03).
 *
 * NOT four cards. A card means one record — a metric is a reading, not a
 * record, so these are separated by 1px vertical rules and sit directly on the
 * board background with no border, no radius and no shadow.
 *
 * The rules turn horizontal when the row stacks: `divide-x` on a wrapped flex
 * container draws a rule down the left of every item including the first on a
 * new line, which reads as a stray tick. Stacking below sm: and only then
 * switching to vertical rules avoids that entirely.
 */
export function MetricRow({ children, className }) {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * One reading: label, figure, and the second fact beneath it.
 *
 * `tone="signal"` paints the figure in signal text. Prompt 03 tints exactly the
 * metric a person has to act on, and the design direction caps the signal
 * colour at twice per screen — so at most one metric per role shape passes it.
 * Never pass it to two.
 *
 * A real 0 renders as 0. `isError` is the only em dash, because "we could not
 * ask" and "the answer is none" are different things to a reader.
 */
export function Metric({
  label,
  value,
  caption,
  tone,
  isPending,
  isError,
  className,
}) {
  return (
    <div className={cn("flex-1 py-3 sm:px-5 sm:first:pl-0 sm:last:pr-0", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>

      {/* Fixed height on the figure line so the row does not jump by 4px when
          the skeleton is replaced by the number. */}
      <div className="flex h-9 items-center">
        {isPending ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <p
            className={cn(
              "text-[28px] font-semibold leading-none tabular-nums",
              isError && "text-muted-foreground",
              tone === "signal" && !isError && "text-signal-text",
            )}
          >
            {isError ? "—" : value}
          </p>
        )}
      </div>

      {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

export default MetricRow;
