import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import ListEmptyState from "@/components/common/EmptyState";
import { ALL } from "@/lib/constants";
import InventoryList from "./InventoryList";

const movementLabels = {
  IN: "Stock received",
  RESERVE: "Reserved for request",
  RELEASE: "Reservation released",
  OUT: "Issued",
  RETURN: "Returned to stock",
  ADJUST: "Stock adjusted",
};

const movementOptions = Object.entries(movementLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export function InventoryHistoryPanel({
  movements,
  movementType,
  movementDepartment,
  isSystemAdmin,
  accountDepartment,
  onTypeChange,
  onDepartmentChange,
  onReset,
  onDownload,
}) {
  const visibleMovements = movements.filter(
    (movement) =>
      (movementType === ALL || movement.type === movementType) &&
      (movementDepartment === ALL ||
        String(movement.stock.departmentId) === movementDepartment),
  );
  const departmentOptions = [
    ...new Map(
      movements.map((movement) => [
        movement.stock.department.id,
        movement.stock.department,
      ]),
    ).values(),
  ].map((department) => ({ value: department.id, label: department.name }));
  const isFiltered =
    movementType !== ALL || (isSystemAdmin && movementDepartment !== ALL);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Stock reports and history</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {visibleMovements.length} of {movements.length} records
            </p>
          </div>
          <Button variant="outline" onClick={onDownload}>
            Download PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <FilterBar
          isFiltered={isFiltered}
          onClear={onReset}
          clearLabel="Clear filters"
          className="pt-4"
        >
          {isSystemAdmin ? (
            <FilterSelect
              value={movementDepartment}
              onChange={onDepartmentChange}
              options={departmentOptions}
              allLabel="All departments"
              className="h-10 sm:w-44"
            />
          ) : (
            <div className="flex h-10 items-center rounded-lg border bg-muted/40 px-3 text-sm sm:w-44">
              Department: {accountDepartment?.name ?? "Your department"}
            </div>
          )}
          <FilterSelect
            value={movementType}
            onChange={onTypeChange}
            options={movementOptions}
            allLabel="All types"
            className="h-10 sm:w-44"
          />
        </FilterBar>

        {visibleMovements.length ? (
          <InventoryList>
            {visibleMovements.map((movement) => (
              <div
                key={movement.id}
                className="grid gap-1 rounded-lg border p-3 text-sm sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-medium">{movement.stock.item.name}</p>
                  <p className="text-muted-foreground">
                    {movement.stock.department.name} ·{" "}
                    {movementLabels[movement.type] ?? movement.type} ·{" "}
                    {new Date(movement.createdAt).toLocaleString("th-TH")}
                  </p>
                  {movement.note && (
                    <p className="mt-1 text-muted-foreground">
                      Note: {movement.note}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Performed by:{" "}
                    {movement.actor
                      ? `${movement.actor.firstname} ${movement.actor.lastname}`
                      : "-"}
                  </p>
                </div>
                <span className="tabular-nums">
                  On hand {movement.onHandDelta > 0 ? "+" : ""}
                  {movement.onHandDelta} · Reserved{" "}
                  {movement.reservedDelta > 0 ? "+" : ""}
                  {movement.reservedDelta}
                </span>
              </div>
            ))}
          </InventoryList>
        ) : (
          <ListEmptyState
            isFiltered={isFiltered}
            onClearFilters={onReset}
            title="No stock history yet"
            description="History appears after stock is received, reserved, issued, returned, or adjusted."
            noMatchesTitle="No matching history"
            noMatchesDescription="No records match the current filters."
            clearFiltersLabel="Clear filters"
            className="py-10"
          />
        )}
      </CardContent>
    </Card>
  );
}

export default InventoryHistoryPanel;
