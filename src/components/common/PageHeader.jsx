import { cn } from "@/lib/utils";

/**
 * The top of every page: title, one line of context, and at most ONE primary
 * action on the right (STITCH-PROMPTS §00).
 */
export function PageHeader({ title, description, children, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  );
}

export default PageHeader;
