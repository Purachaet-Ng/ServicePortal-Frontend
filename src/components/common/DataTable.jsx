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
 * Wrapped in overflow-x-auto so a wide table scrolls inside its own box rather
 * than making the page scroll sideways on mobile.
 */
export function DataTable({ columns, data, onRowClick, meta, page, onPageChange }) {
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
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs uppercase tracking-wide text-muted-foreground"
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
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {/* getAllCells, not getVisibleCells: in v9 the visible-cells
                    helper moved off the row and became a standalone function
                    (row_getVisibleCells). Nothing here hides columns, so the
                    two return the same list — and this one is a real method on
                    the core row. */}
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums">
            Page {page} of {lastPage} · {total} total
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
