import { flexRender, tableFeatures, useTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// No sorting/filtering/pagination features registered on purpose: those stay
// SERVER-side (useListQuery → the API). Adding rowSortingFeature etc. here
// would let the table sort/paginate page 1 of 7 client-side and quietly lie
// to the user.
const features = tableFeatures({});
const EMPTY_DATA = [];

/**
 * A thin wrapper over TanStack Table for the list pages.
 *
 * This is a BOARD, not a card: no border, no radius, no panel around it. It
 * sits directly on the page background and its only structure is the row rules
 * (STITCH-PROMPTS — a box means one record, a ruled grid means many).
 *
 * Still wrapped in overflow-x-auto so a wide table scrolls inside itself rather
 * than making the whole page scroll sideways on mobile.
 *
 * `rowAccent` is optional: `(row) => className | undefined`, returning a
 * background utility for that row's claim bar. Pass it only on screens where
 * rows genuinely differ in state — where every row shares one state the bar
 * carries no information, so those screens leave it off (the reservation queue
 * being the case the design calls out by name).
 */
export function DataTable({
  columns,
  data,
  onRowClick,
  meta,
  page,
  onPageChange,
  rowAccent,
}) {
  const table = useTable({
    features,
    data: data ?? EMPTY_DATA,
    columns,
  });

  const total = meta?.total ?? 0;
  const limit = meta?.limit ?? 20;
  const lastPage = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  // Sentence case, not uppercase. Nothing in this interface is
                  // set in capitals (STITCH-PROMPTS, rule five) — the column
                  // labels already arrive as "Status", "Priority", so dropping
                  // the utility is the whole change.
                  <TableHead
                    key={header.id}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const accent = rowAccent?.(row.original);

              return (
                <TableRow
                  key={row.id}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {/* getAllCells, not getVisibleCells: in v9 the visible-cells
                      helper moved off the row and became a standalone function
                      (row_getVisibleCells). Nothing here hides columns, so the
                      two return the same list — and this one is a real method on
                      the core row. */}
                  {row.getAllCells().map((cell, i) => (
                    <TableCell
                      key={cell.id}
                      className={cn(i === 0 && rowAccent && "relative")}
                    >
                      {/* The claim bar. A positioned span rather than a
                          border-left, for two reasons: the `bar` values are
                          background utilities, so a border-colour property
                          could not consume them; and a left border on a <tr>
                          is unreliable under border-collapse. Pinned inset-y-0
                          so it spans the full row height regardless of content.

                          aria-hidden because it is decorative reinforcement —
                          the status word beside it is what states the state,
                          and a screen reader announcing a colour would be
                          noise. That redundancy is also what keeps the bar
                          compliant with WCAG 1.4.1. */}
                      {i === 0 && accent && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-y-0 left-0 w-[3px]",
                            accent,
                          )}
                        />
                      )}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {total > limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {/* No middle dot joining the two facts — rule five. */}
          <span className="tabular-nums">
            Page {page} of {lastPage}, {total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
