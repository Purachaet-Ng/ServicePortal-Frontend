import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusChip from "@/components/common/StatusChip";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorState from "@/components/common/ErrorState";
import { downloadInventoryReport } from "@/api/inventory.api";
import { getDepartments } from "@/api/departments.api";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { ALL } from "@/lib/constants";
import {
  inventoryAdjustmentSchema,
  inventoryAssetSchema,
  inventoryItemSchema,
  inventoryIssueSchema,
  inventoryRequestSchema,
  inventoryReturnSchema,
  inventoryStockSchema,
} from "@/validators/inventory.validator";
import { useUsers } from "@/features/users/useUsers";
import InventoryHistoryPanel from "./InventoryHistoryPanel";
import InventoryList from "./InventoryList";
import InventorySelect from "./InventorySelect";
import ReplenishmentPanel from "./ReplenishmentPanel";
import {
  useAdjustInventoryStock,
  useCreateInventoryAsset,
  useCreateInventoryItem,
  useCreateInventoryRequest,
  useCreateInventoryStock,
  useDeleteInventoryItem,
  useInventoryItems,
  useInventoryMovements,
  useInventoryRequests,
  useInventoryStocks,
  useUpdateInventoryItem,
  useUpdateInventoryRequest,
  useUpdateInventoryStock,
  useInventoryAssignments,
  useIssueInventoryAsset,
  useReturnInventoryAssignment,
  useUpdateInventoryAsset,
} from "./useInventory";

const fieldClass = "mt-1";
const initialItem = { sku: "", name: "", unit: "", isSerialized: false };
const emptyList = [];
const assetStatusLabels = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  MAINTENANCE: "Under maintenance",
  RETIRED: "Retired",
};

function message(error) {
  toast.error(error?.message ?? "Unable to save changes");
}

function validate(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return result.data;
  toast.error(result.error.issues[0]?.message ?? "Please review the form");
  return null;
}

export function InventoryWorkspace() {
  const { user } = useAuth();
  const { can, canInDepartment, role } = usePermission();
  const isSystemAdmin = can("inventory:manage");
  const isApprover = can("inventory:approve");
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultWorkspaceView = isApprover ? "manage" : "request";
  const allowedWorkspaceViews = isApprover
    ? ["manage", "approvals", "request", "history"]
    : ["request", "approvals"];
  // Department admins replenish their own department through Request items.
  // Keep older notification links working without showing a separate task.
  const requestedWorkspaceView =
    searchParams.get("view") === "replenishment"
      ? (isSystemAdmin ? "approvals" : "request")
      : searchParams.get("view");
  const workspaceView = allowedWorkspaceViews.includes(requestedWorkspaceView)
    ? requestedWorkspaceView
    : defaultWorkspaceView;
  const setWorkspaceView = (view) => {
    setSearchParams(
      view === defaultWorkspaceView ? {} : { view },
      { replace: true },
    );
  };
  const [selectedPanel, setPanel] = useState(null);
  const panel = selectedPanel;
  const hasUser = Boolean(user);
  const stocksQuery = useInventoryStocks({ enabled: hasUser });
  const itemsQuery = useInventoryItems({ enabled: hasUser });
  const requestsQuery = useInventoryRequests({ enabled: hasUser });
  const movementsQuery = useInventoryMovements({
    enabled: hasUser && isApprover && workspaceView === "history",
  });
  const assignmentsQuery = useInventoryAssignments({
    enabled: hasUser && workspaceView === "approvals",
  });
  const usersQuery = useUsers({
    enabled:
      hasUser && isApprover && workspaceView === "manage" && panel === "asset",
  });
  const departmentsQuery = useQuery({
    queryKey: ["departments", "inventory"],
    queryFn: () => getDepartments(),
    select: (response) => response?.departments ?? response?.data ?? [],
    enabled: hasUser,
  });
  const createRequest = useCreateInventoryRequest();
  const updateRequest = useUpdateInventoryRequest();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const createStock = useCreateInventoryStock();
  const updateStock = useUpdateInventoryStock();
  const adjustStock = useAdjustInventoryStock();
  const createAsset = useCreateInventoryAsset();
  const issueAsset = useIssueInventoryAsset();
  const returnAssignment = useReturnInventoryAssignment();
  const updateAsset = useUpdateInventoryAsset();
  const stocks = stocksQuery.data ?? emptyList;
  const items = itemsQuery.data ?? emptyList;
  const requests = requestsQuery.data ?? emptyList;
  const movements = movementsQuery.data ?? emptyList;
  const assignments = assignmentsQuery.data ?? emptyList;
  const users = usersQuery.data ?? emptyList;
  const departments = departmentsQuery.data ?? emptyList;
  const accountDepartment = departments.find(
    (department) =>
      String(department.id) === String(user?.departmentId ?? ""),
  );
  const [departmentId, setDepartmentId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [reason, setReason] = useState("");
  const [itemForm, setItemForm] = useState(initialItem);
  const [editingItemId, setEditingItemId] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [stockForm, setStockForm] = useState({
    departmentId: "",
    itemId: "",
    minStock: 0,
  });
  const [stockDepartmentFilter, setStockDepartmentFilter] = useState(ALL);
  const [assetForm, setAssetForm] = useState({
    stockId: "",
    serialNo: "",
    assetTag: "",
  });
  const [issueForm, setIssueForm] = useState({
    assetId: "",
    userId: "",
    conditionOut: "",
    note: "",
  });
  const [adjustments, setAdjustments] = useState({});
  const [adjustmentModes, setAdjustmentModes] = useState({});
  const [adjustmentNotes, setAdjustmentNotes] = useState({});
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [handoverAssets, setHandoverAssets] = useState({});
  const [returnForms, setReturnForms] = useState({});
  const [assetEdits, setAssetEdits] = useState({});
  const [stockMinEdits, setStockMinEdits] = useState({});
  const [movementType, setMovementType] = useState(ALL);
  const [movementDepartment, setMovementDepartment] = useState(
    isSystemAdmin ? ALL : String(user?.departmentId ?? ""),
  );

  const activeDepartmentId =
    departmentId || String(stocks[0]?.departmentId ?? "");
  const activeStocks = useMemo(
    () =>
      stocks.filter(
        (stock) =>
          stock.isActive && String(stock.departmentId) === activeDepartmentId,
      ),
    [stocks, activeDepartmentId],
  );
  const selectedLines = activeStocks.flatMap((stock) => {
    const quantity = Number(quantities[stock.id] ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) return [];
    if (stock.item.isSerialized)
      return Array.from({ length: quantity }, () => ({
        stockId: stock.id,
        quantity: 1,
      }));
    return [{ stockId: stock.id, quantity }];
  });
  const actionableRequests = isApprover
    ? requests.filter((request) =>
        ["PENDING", "APPROVED"].includes(request.status),
      )
    : requests;
  const requestHistory = isApprover
    ? requests.filter((request) =>
        ["REJECTED", "FULFILLED", "CANCELLED"].includes(request.status),
      )
    : [];
  const serializedStocks = stocks.filter(
    (stock) =>
      stock.item.isSerialized &&
      (isSystemAdmin || canInDepartment(stock.departmentId)),
  );
  const selectedAssetStock = serializedStocks.find(
    (stock) => String(stock.id) === assetForm.stockId,
  );
  const issueableAssets = serializedStocks.flatMap((stock) =>
    stock.assets
      .filter((asset) => asset.status === "AVAILABLE")
      .map((asset) => ({ ...asset, stock })),
  );
  const eligibleRecipients = users.filter((candidate) => {
    if (role === "ADMIN_DEPT")
      return (
        candidate.role === "STAFF" &&
        candidate.departmentId === user?.departmentId
      );
    return Boolean(candidate.departmentId);
  });

  const submitRequest = async () => {
    const body = validate(inventoryRequestSchema, {
      fromDepartmentId: activeDepartmentId,
      reason,
      lines: selectedLines,
    });
    if (!body) return;
    try {
      await createRequest.mutateAsync(body);
      setQuantities({});
      setReason("");
      toast.success("Request submitted");
    } catch (error) {
      message(error);
    }
  };

  const submitDirectIssue = async () => {
    const body = validate(inventoryIssueSchema, issueForm);
    if (!body) return;
    try {
      await issueAsset.mutateAsync(body);
      setIssueForm({ assetId: "", userId: "", conditionOut: "", note: "" });
      toast.success("Asset issued and assignee recorded");
    } catch (error) {
      message(error);
    }
  };

  const changeStatus = async (request, status) => {
    const rejectionReason = rejectionReasons[request.id]?.trim();
    if (["REJECTED", "CANCELLED"].includes(status) && !rejectionReason)
      return toast.error(
        status === "CANCELLED"
          ? "Enter a cancellation reason"
          : "Enter a rejection reason",
      );
    const serializedLines = request.lines.filter(
      (line) => line.stock.item.isSerialized,
    );
    const assetSelections = serializedLines.map((line) => ({
      requestLineId: line.id,
      assetId: Number(handoverAssets[request.id]?.[line.id]),
    }));
    if (
      status === "FULFILLED" &&
      assetSelections.some((selection) => !selection.assetId)
    )
      return toast.error("Select a serial number for every serialized item");
    try {
      await updateRequest.mutateAsync({
        id: request.id,
        status,
        rejectionReason,
        ...(status === "FULFILLED" ? { assetSelections } : {}),
      });
      setRejectionReasons((current) => ({ ...current, [request.id]: "" }));
      if (status === "FULFILLED")
        setHandoverAssets((current) => ({ ...current, [request.id]: {} }));
      toast.success(
        status === "CANCELLED"
          ? "Request cancelled and reservation released"
          : status === "APPROVED"
            ? "Request approved and stock reserved"
            : status === "REJECTED"
              ? "Request rejected"
              : "Items issued successfully",
      );
    } catch (error) {
      message(error);
    }
  };

  const saveItem = async () => {
    const body = validate(inventoryItemSchema, itemForm);
    if (!body) return;
    try {
      if (editingItemId)
        await updateItem.mutateAsync({ id: editingItemId, ...body });
      else await createItem.mutateAsync(body);
      setItemForm(initialItem);
      setEditingItemId(null);
      toast.success("Item saved");
    } catch (error) {
      message(error);
    }
  };

  const saveStock = async () => {
    const body = validate(inventoryStockSchema, stockForm);
    if (!body) return;
    try {
      await createStock.mutateAsync(body);
      setStockForm({ departmentId: "", itemId: "", minStock: 0 });
      toast.success("Department stock opened");
    } catch (error) {
      message(error);
    }
  };

  const removeItem = async () => {
    try {
      await deleteItem.mutateAsync(deletingItem.id);
      if (editingItemId === deletingItem.id) {
        setEditingItemId(null);
        setItemForm(initialItem);
      }
      setDeletingItem(null);
      toast.success("Item removed from active use");
    } catch (error) {
      message(error);
    }
  };

  const adjustQuantity = async (stock, quantity, note) => {
    if (!quantity) return toast.error("Enter the quantity to add or remove");
    if (quantity < 0 && !note?.trim())
      return toast.error("Enter a note when removing damaged stock or reducing the balance");
    try {
      await adjustStock.mutateAsync({
        id: stock.id,
        quantity,
        note: note?.trim() || undefined,
      });
      setAdjustments((current) => ({ ...current, [stock.id]: "" }));
      setAdjustmentNotes((current) => ({ ...current, [stock.id]: "" }));
      toast.success("Stock balance updated");
    } catch (error) {
      message(error);
    }
  };

  const addQuantity = (stock) => {
    const adjustment = validate(inventoryAdjustmentSchema, {
      quantity: adjustments[stock.id],
      mode: adjustmentModes[stock.id] ?? "RECEIVE",
      note: adjustmentNotes[stock.id],
    });
    if (!adjustment) return;
    const signedQuantity =
      adjustment.mode === "REMOVE"
        ? -Math.abs(adjustment.quantity)
        : Math.abs(adjustment.quantity);
    return adjustQuantity(stock, signedQuantity, adjustment.note);
  };

  const addAsset = async () => {
    const body = validate(inventoryAssetSchema, assetForm);
    if (!body) return;
    try {
      await createAsset.mutateAsync(body);
      setAssetForm({ stockId: assetForm.stockId, serialNo: "", assetTag: "" });
      toast.success("Serialized asset added and stock increased by 1");
    } catch (error) {
      message(error);
    }
  };

  const receiveReturn = async (assignment) => {
    const form = returnForms[assignment.id] ?? {};
    const body = validate(inventoryReturnSchema, form);
    if (!body) return;
    try {
      await returnAssignment.mutateAsync({
        id: assignment.id,
        ...body,
      });
      setReturnForms((current) => ({ ...current, [assignment.id]: {} }));
      toast.success(
        body.outcome === "AVAILABLE"
          ? "Asset returned to available stock"
          : body.outcome === "MAINTENANCE"
            ? "Asset returned and sent for maintenance"
            : "Asset returned and retired",
      );
    } catch (error) {
      message(error);
    }
  };

  const saveAsset = async (asset) => {
    const edit = assetEdits[asset.id] ?? {};
    const nextStatus = edit.status ?? asset.status;
    if (
      asset.status === "AVAILABLE" &&
      ["MAINTENANCE", "RETIRED"].includes(nextStatus) &&
      !edit.note?.trim()
    ) {
      return toast.error("Enter a reason for removing the asset from available stock");
    }
    try {
      await updateAsset.mutateAsync({
        id: asset.id,
        serialNo: edit.serialNo ?? asset.serialNo,
        assetTag: Object.hasOwn(edit, "assetTag")
          ? edit.assetTag.trim() || null
          : asset.assetTag,
        condition: edit.condition ?? asset.condition ?? null,
        ...(edit.status ? { status: edit.status } : {}),
        note: edit.note?.trim() || undefined,
      });
      setAssetEdits((current) => ({ ...current, [asset.id]: {} }));
      toast.success("Asset details saved");
    } catch (error) {
      message(error);
    }
  };

  const saveMinimumStock = async (stock) => {
    const minStock = Number(stockMinEdits[stock.id] ?? stock.minStock);
    if (!Number.isSafeInteger(minStock) || minStock < 0)
      return toast.error("Low-stock threshold must be a whole number of 0 or more");
    try {
      await updateStock.mutateAsync({ id: stock.id, minStock });
      setStockMinEdits((current) => ({ ...current, [stock.id]: undefined }));
      toast.success("Low-stock threshold saved");
    } catch (error) {
      message(error);
    }
  };

  const printPdf = async () => {
    try {
      const blob = await downloadInventoryReport({
        ...(movementDepartment !== ALL
          ? { departmentId: movementDepartment }
          : {}),
        ...(movementType !== ALL ? { type: movementType } : {}),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "inventory-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success("PDF report downloaded");
    } catch (error) {
      message(error);
    }
  };

  const resetMovementFilters = () => {
    const resetDepartment = isSystemAdmin
      ? ALL
      : String(user?.departmentId ?? "");
    setMovementDepartment(resetDepartment);
    setMovementType(ALL);
    const scopeLabel = isSystemAdmin
      ? "all departments"
      : `department ${accountDepartment?.name ?? "your department"}`;
    toast.success(`Filters cleared. Showing ${scopeLabel} and all types.`);
  };

  if (
    stocksQuery.isLoading ||
    itemsQuery.isLoading ||
    requestsQuery.isLoading ||
    (workspaceView === "approvals" && assignmentsQuery.isLoading) ||
    (workspaceView === "history" && movementsQuery.isLoading) ||
    departmentsQuery.isLoading
  )
    return (
      <p className="text-sm text-muted-foreground">
        Loading inventory...
      </p>
    );
  if (
    stocksQuery.isError ||
    itemsQuery.isError ||
    requestsQuery.isError ||
    (workspaceView === "approvals" && assignmentsQuery.isError) ||
    (workspaceView === "history" && movementsQuery.isError) ||
    departmentsQuery.isError
  )
    return (
      <ErrorState
        error={
          stocksQuery.error ??
          itemsQuery.error ??
          requestsQuery.error ??
          assignmentsQuery.error ??
          movementsQuery.error ??
          departmentsQuery.error
        }
        onRetry={() => {
          stocksQuery.refetch();
          itemsQuery.refetch();
          requestsQuery.refetch();
          departmentsQuery.refetch();
          if (workspaceView === "approvals") assignmentsQuery.refetch();
          if (workspaceView === "history") movementsQuery.refetch();
        }}
      />
    );

  const workspaceOptions = isApprover
    ? [
        { value: "manage", label: "Manage inventory" },
        { value: "approvals", label: "Approvals and returns" },
        { value: "request", label: "Request items" },
        { value: "history", label: "Reports and history" },
      ]
    : [
        { value: "request", label: "Request items" },
        { value: "approvals", label: "Track requests and assets" },
      ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>1. Choose what you want to do</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a task below, then complete the form underneath.
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">
                {user?.firstname} {user?.lastname}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                <StatusChip kind="role" value={role} />
                {accountDepartment && (
                  <span className="text-sm text-muted-foreground">
                    Department: {accountDepartment.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {workspaceOptions.map((option) => (
              <Button
                key={option.value}
                variant={workspaceView === option.value ? "default" : "outline"}
                onClick={() => setWorkspaceView(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      {workspaceView === "request" && isApprover && !isSystemAdmin && (
        <ReplenishmentPanel isSystemAdmin={isSystemAdmin} items={items} />
      )}
      {workspaceView === "request" && (!isApprover || isSystemAdmin) && (
        <>
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Department stock</CardTitle>
              <p className="text-sm text-muted-foreground">
                Stock is tracked by department. Select a department before choosing items.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  ...new Map(
                    stocks.map((stock) => [
                      stock.department.id,
                      stock.department,
                    ]),
                  ).values(),
                ].map((department) => (
                  <Button
                    key={department.id}
                    variant={
                      activeDepartmentId === String(department.id)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => {
                      setDepartmentId(String(department.id));
                      setQuantities({});
                    }}
                  >
                    {department.name}
                  </Button>
                ))}
              </div>
              {!stocks.length && (
                <p className="text-sm text-muted-foreground">
                  No departments use inventory yet.
                </p>
              )}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Select items</h2>
              <p className="text-sm text-muted-foreground">
                Available stock decreases as soon as a request is approved.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {activeStocks.map((stock) => (
                <Card key={stock.id}>
                  <CardHeader>
                    <CardTitle>{stock.item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stock.item.sku} · {stock.item.unit}
                      {stock.item.isSerialized ? " · Serialized" : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 border-b pb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">On hand</p>
                        <p className="text-xl font-semibold">{stock.onHand}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reserved</p>
                        <p className="text-xl font-semibold">
                          {stock.reserved}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Available</p>
                        <p className="text-xl font-semibold">
                          {stock.available}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <span className="text-sm font-medium">Quantity</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setQuantities((q) => ({
                              ...q,
                              [stock.id]: Math.max(0, (q[stock.id] ?? 0) - 1),
                            }))
                          }
                        >
                          −
                        </Button>
                        <span className="w-8 text-center font-semibold">
                          {quantities[stock.id] ?? 0}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            stock.available <= (quantities[stock.id] ?? 0)
                          }
                          onClick={() =>
                            setQuantities((q) => ({
                              ...q,
                              [stock.id]: (q[stock.id] ?? 0) + 1,
                            }))
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {!activeStocks.length && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No items are available in this stock.
                </CardContent>
              </Card>
            )}
          </section>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Review and submit request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="inventory-reason">
                  Purpose (optional)
                </Label>
                <Input
                  id="inventory-reason"
                  className={fieldClass}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="For example, equipment for a new employee"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Selected:{" "}
                {selectedLines.reduce((sum, line) => sum + line.quantity, 0)}{" "}
                item(s)
              </p>
              <Button
                disabled={!selectedLines.length || createRequest.isPending}
                onClick={submitRequest}
              >
                Submit request
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {workspaceView === "approvals" && (
        <>
          {isSystemAdmin && (
            <ReplenishmentPanel
              isSystemAdmin={isSystemAdmin}
              items={items}
              section="requests"
            />
          )}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>
                {isApprover ? "Requests to review" : "My requests"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InventoryList>
                {actionableRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          Request #{request.id} · {request.requester.firstname}{" "}
                          {request.requester.lastname}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.fromDepartment.name} ·{" "}
                          {request.lines
                            .map(
                              (line) =>
                                `${line.stock.item.name} × ${line.quantity}`,
                            )
                            .join(" · ")}
                        </p>
                        {request.reason && (
                          <p className="mt-1 text-sm">
                            Reason: {request.reason}
                          </p>
                        )}
                        {request.rejectionReason && (
                          <p className="mt-1 text-sm text-destructive">
                            {request.status === "CANCELLED"
                              ? "Cancellation reason"
                              : "Rejection reason"}
                            : {request.rejectionReason}
                          </p>
                        )}
                      </div>
                      <StatusChip kind="inventory" value={request.status} />
                    </div>
                    {isApprover &&
                      (isSystemAdmin || request.requester.role === "STAFF") &&
                      request.status === "PENDING" && (
                        <div className="mt-3 space-y-2">
                          <Input
                            value={rejectionReasons[request.id] ?? ""}
                            onChange={(event) =>
                              setRejectionReasons((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="Rejection reason (required when rejecting)"
                          />
                          <div className="flex gap-2">
                            <Button
                              disabled={updateRequest.isPending}
                              onClick={() => changeStatus(request, "APPROVED")}
                            >
                              Approve request
                            </Button>
                            <Button
                              disabled={updateRequest.isPending}
                              variant="destructive"
                              onClick={() => changeStatus(request, "REJECTED")}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    {isApprover &&
                      (isSystemAdmin || request.requester.role === "STAFF") &&
                      request.status === "APPROVED" && (
                        <div className="mt-3 space-y-3 rounded-lg border bg-muted/20 p-3">
                          {request.lines
                            .filter((line) => line.stock.item.isSerialized)
                            .map((line) => {
                              const availableAssets =
                                stocks
                                  .find((stock) => stock.id === line.stockId)
                                  ?.assets.filter(
                                    (asset) =>
                                      asset.status === "AVAILABLE" &&
                                      (!Object.entries(
                                        handoverAssets[request.id] ?? {},
                                      ).some(
                                        ([lineId, assetId]) =>
                                          Number(lineId) !== line.id &&
                                          Number(assetId) === asset.id,
                                      ) ||
                                        Number(
                                          handoverAssets[request.id]?.[line.id],
                                        ) === asset.id),
                                  ) ?? [];
                              return (
                                <div key={line.id}>
                                  <Label
                                    htmlFor={`handover-asset-${request.id}-${line.id}`}
                                  >
                                    Select serial to issue:{" "}
                                    {line.stock.item.name}
                                  </Label>
                                  <InventorySelect
                                    id={`handover-asset-${request.id}-${line.id}`}
                                    value={
                                      handoverAssets[request.id]?.[line.id] ??
                                      ""
                                    }
                                    onChange={(value) =>
                                      setHandoverAssets((current) => ({
                                        ...current,
                                        [request.id]: {
                                          ...current[request.id],
                                          [line.id]: value,
                                        },
                                      }))
                                    }
                                    placeholder="Select an available asset"
                                    options={availableAssets.map((asset) => ({
                                      value: asset.id,
                                      label: `${asset.serialNo}${
                                        asset.assetTag
                                          ? ` · ${asset.assetTag}`
                                          : ""
                                      }`,
                                    }))}
                                  />
                                  {!availableAssets.length && (
                                    <p className="mt-1 text-sm text-destructive">
                                      No serial-numbered asset is available.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          <Button
                            disabled={
                              updateRequest.isPending ||
                              request.lines.some(
                                (line) =>
                                  line.stock.item.isSerialized &&
                                  !Number(
                                    handoverAssets[request.id]?.[line.id],
                                  ),
                              )
                            }
                            onClick={() => changeStatus(request, "FULFILLED")}
                          >
                            {request.lines.some(
                              (line) => line.stock.item.isSerialized,
                            )
                              ? "Confirm serial and issue"
                              : "Confirm issue"}
                          </Button>
                        </div>
                      )}
                    {["PENDING", "APPROVED"].includes(request.status) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Input
                          className="sm:max-w-sm"
                          aria-label={`Cancellation reason for request ${request.id}`}
                          placeholder="Cancellation reason"
                          value={rejectionReasons[request.id] ?? ""}
                          onChange={(event) =>
                            setRejectionReasons((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          variant="outline"
                          disabled={updateRequest.isPending}
                          onClick={() => changeStatus(request, "CANCELLED")}
                        >
                          Cancel request and release reservation
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </InventoryList>
              {!actionableRequests.length && (
                <p className="text-sm text-muted-foreground">
                  No requests require action.
                </p>
              )}
            </CardContent>
          </Card>

          {isApprover && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Request history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InventoryList>
                  {requestHistory.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"
                    >
                      <span>
                        #{request.id} · {request.requester.firstname}{" "}
                        {request.requester.lastname} ·{" "}
                        {request.lines
                          .map(
                            (line) =>
                              `${line.stock.item.name} × ${line.quantity}`,
                          )
                          .join(" · ")}
                      </span>
                      <StatusChip kind="inventory" value={request.status} />
                    </div>
                  ))}
                </InventoryList>
                {!requestHistory.length && (
                  <p className="text-sm text-muted-foreground">
                    No history yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="border-b">
              <CardTitle>
                {isApprover
                  ? "Assigned assets and returns"
                  : "My assigned assets"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Every serialized asset tracks its assignee and return condition.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <InventoryList>
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {assignment.asset.stock.item.name} ·{" "}
                          {assignment.asset.serialNo}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Assigned to: {assignment.user.firstname}{" "}
                          {assignment.user.lastname} ·{" "}
                          {assignment.asset.stock.department.name}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {assignment.returnedAt ? "Returned" : "In use"}
                      </span>
                    </div>
                    {isApprover && !assignment.returnedAt && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
                        <Input
                          placeholder="Condition on return"
                          value={returnForms[assignment.id]?.conditionIn ?? ""}
                          onChange={(event) =>
                            setReturnForms((current) => ({
                              ...current,
                              [assignment.id]: {
                                ...current[assignment.id],
                                conditionIn: event.target.value,
                              },
                            }))
                          }
                        />
                        <InventorySelect
                          className="mt-0"
                          value={returnForms[assignment.id]?.outcome ?? ""}
                          onChange={(value) =>
                            setReturnForms((current) => ({
                              ...current,
                              [assignment.id]: {
                                ...current[assignment.id],
                                outcome: value,
                              },
                            }))
                          }
                          placeholder="Select return outcome"
                          options={[
                            { value: "AVAILABLE", label: "Return to available stock" },
                            { value: "MAINTENANCE", label: "Send for maintenance" },
                            { value: "RETIRED", label: "Retire asset" },
                          ]}
                        />
                        <Button
                          disabled={
                            returnAssignment.isPending ||
                            !returnForms[assignment.id]?.conditionIn?.trim() ||
                            !returnForms[assignment.id]?.outcome
                          }
                          onClick={() => receiveReturn(assignment)}
                        >
                          Confirm return
                        </Button>
                      </div>
                    )}
                    {assignment.returnedAt && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Return condition: {assignment.conditionIn} ·{" "}
                        {new Date(assignment.returnedAt).toLocaleString(
                          "en-US",
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </InventoryList>
              {!assignments.length && (
                <p className="text-sm text-muted-foreground">
                  No assets are currently assigned.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {workspaceView === "manage" && (
        <>
          {isSystemAdmin && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>2. Choose an inventory action</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose a task to show its relevant form.
                </p>
              </CardHeader>
              <CardContent>
                <Label htmlFor="inventory-management">Choose a task</Label>
                <InventorySelect
                  id="inventory-management"
                  className="sm:max-w-md"
                  value={panel ?? ""}
                  onChange={(value) => setPanel(value || null)}
                  placeholder="Select a task"
                  options={[
                    {
                      value: "catalog",
                      label: "Manage System Admin stock and department requests",
                    },
                    { value: "stock", label: "Open department stock and adjust balances" },
                    { value: "asset", label: "Receive and manage serialized assets" },
                  ]}
                />
              </CardContent>
            </Card>
          )}

          {role === "ADMIN_DEPT" && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>2. Choose a department inventory action</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Receive stock, record damaged items, and manage your department assets.
                </p>
              </CardHeader>
              <CardContent>
                <Label htmlFor="department-inventory-management">
                  Choose a task
                </Label>
                <InventorySelect
                  id="department-inventory-management"
                  className="sm:max-w-md"
                  value={panel ?? ""}
                  onChange={(value) => setPanel(value || null)}
                  placeholder="Select a task"
                  options={[
                    {
                      value: "department-stock",
                      label: "Receive or reduce general stock",
                    },
                    { value: "asset", label: "Receive and manage serialized assets" },
                  ]}
                />
              </CardContent>
            </Card>
          )}

          {role === "ADMIN_DEPT" && panel === "department-stock" && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Receive and adjust general stock</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose receive or reduce, then enter a positive quantity.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {stocks
                  .filter(
                    (stock) =>
                      stock.departmentId === user?.departmentId &&
                      !stock.item.isSerialized,
                  )
                  .map((stock) => (
                    <div key={stock.id} className="rounded-lg border p-4">
                      <p className="font-medium">{stock.item.name}</p>
                      <p className="mb-4 text-sm text-muted-foreground">
                        On hand {stock.onHand} · Reserved {stock.reserved}
                      </p>
                      <div className="grid max-w-xl gap-3 sm:grid-cols-[180px_1fr_auto]">
                        <InventorySelect
                          aria-label={`Stock action for ${stock.item.name}`}
                          ariaLabel={`Stock action for ${stock.item.name}`}
                          className="mt-0"
                          value={adjustmentModes[stock.id] ?? "RECEIVE"}
                          onChange={(value) =>
                            setAdjustmentModes((current) => ({
                              ...current,
                              [stock.id]: value,
                            }))
                          }
                          options={[
                            { value: "RECEIVE", label: "Receive stock" },
                            { value: "REMOVE", label: "Record damage / reduce stock" },
                          ]}
                        />
                        <Input
                          aria-label={`Quantity for ${stock.item.name}`}
                          type="number"
                          min="1"
                          placeholder="Enter quantity"
                          value={adjustments[stock.id] ?? ""}
                          onChange={(e) =>
                            setAdjustments((a) => ({
                              ...a,
                              [stock.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          disabled={adjustStock.isPending}
                          onClick={() => addQuantity(stock)}
                        >
                          {adjustmentModes[stock.id] === "REMOVE"
                            ? "Confirm reduction"
                            : "Confirm receipt"}
                        </Button>
                        <Input
                          className="sm:col-span-3"
                          aria-label={`Note for ${stock.item.name}`}
                          placeholder={
                            adjustmentModes[stock.id] === "REMOVE"
                              ? "Reason for reducing stock (required)"
                              : "Receipt note (optional)"
                          }
                          value={adjustmentNotes[stock.id] ?? ""}
                          onChange={(e) =>
                            setAdjustmentNotes((current) => ({
                              ...current,
                              [stock.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {isSystemAdmin && panel === "catalog" && (
            <div className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Item catalog</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={itemForm.sku}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, sku: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Item name</Label>
                    <Input
                      value={itemForm.name}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={itemForm.unit}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, unit: e.target.value }))
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 self-end pb-2">
                    <input
                      type="checkbox"
                      checked={itemForm.isSerialized}
                      onChange={(e) =>
                        setItemForm((f) => ({
                          ...f,
                          isSerialized: e.target.checked,
                        }))
                      }
                    />{" "}
                    Track by serial number
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveItem}>
                    {editingItemId ? "Save changes" : "Add item"}
                  </Button>
                  {editingItemId && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingItemId(null);
                        setItemForm(initialItem);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <span>
                        {item.sku} · {item.name} · {item.unit}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setItemForm({
                              sku: item.sku,
                              name: item.name,
                              unit: item.unit,
                              isSerialized: item.isSerialized,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeletingItem(item)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <ReplenishmentPanel
              isSystemAdmin={isSystemAdmin}
              items={items}
              section="receive"
            />
            </div>
          )}

          {isSystemAdmin && panel === "stock" && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Open an item for a department</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Use this only when the department does not already stock the item.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InventorySelect
                      ariaLabel="Department"
                      className="mt-0"
                      value={stockForm.departmentId}
                      onChange={(value) => {
                        setStockForm((f) => ({
                          ...f,
                          departmentId: value,
                        }));
                        if (value) setStockDepartmentFilter(value);
                      }}
                      placeholder="1. Select department"
                      options={departments.map((department) => ({
                        value: department.id,
                        label: department.name,
                      }))}
                    />
                    <InventorySelect
                      ariaLabel="Catalog item"
                      className="mt-0"
                      value={stockForm.itemId}
                      onChange={(value) =>
                        setStockForm((f) => ({ ...f, itemId: value }))
                      }
                      placeholder="2. Select item"
                      options={items.map((item) => ({
                        value: item.id,
                        label: item.name,
                      }))}
                    />
                    <Input
                      aria-label="Low-stock threshold"
                      type="number"
                      min="0"
                      placeholder="3. Set low-stock threshold"
                      value={stockForm.minStock}
                      onChange={(e) =>
                        setStockForm((f) => ({
                          ...f,
                          minStock: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    disabled={!stockForm.departmentId || !stockForm.itemId}
                    onClick={saveStock}
                  >
                    Open department stock
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <CardTitle>Open department stocks</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Select a department to manage only its stock.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="stock-department-filter">
                        Show stock for
                      </Label>
                      <InventorySelect
                        id="stock-department-filter"
                        className="sm:w-56"
                        value={stockDepartmentFilter}
                        onChange={setStockDepartmentFilter}
                        options={[
                          { value: ALL, label: "All departments" },
                          ...departments.map((department) => ({
                            value: department.id,
                            label: department.name,
                          })),
                        ]}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {stocks
                      .filter(
                        (stock) =>
                          stockDepartmentFilter === ALL ||
                          String(stock.departmentId) === stockDepartmentFilter,
                      )
                      .map((stock) => (
                        <div key={stock.id} className="rounded-lg border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{stock.item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {stock.department.name} · On hand {stock.onHand}{" "}
                                · Reserved {stock.reserved}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Low-stock threshold {stock.minStock}{" "}
                                {stock.item.unit}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStock.mutate(
                                  { id: stock.id, isActive: !stock.isActive },
                                  { onError: message },
                                )
                              }
                            >
                              {stock.isActive
                                ? "Close for requests"
                                : "Reopen for requests"}
                            </Button>
                          </div>
                          {stock.item.isSerialized ? (
                            <Button
                              className="mt-3"
                              size="sm"
                              onClick={() => {
                                setAssetForm((form) => ({
                                  ...form,
                                  stockId: String(stock.id),
                                }));
                                setPanel("asset");
                              }}
                            >
                              Receive a serialized asset
                            </Button>
                          ) : (
                            <div className="mt-4 grid gap-3 sm:grid-cols-[170px_1fr_auto]">
                              <InventorySelect
                                ariaLabel={`Stock action for ${stock.item.name}, ${stock.department.name}`}
                                className="mt-0"
                                value={adjustmentModes[stock.id] ?? "RECEIVE"}
                                onChange={(value) =>
                                  setAdjustmentModes((current) => ({
                                    ...current,
                                    [stock.id]: value,
                                  }))
                                }
                                options={[
                                  {
                                    value: "RECEIVE",
                                    label: "Receive stock",
                                  },
                                  {
                                    value: "REMOVE",
                                    label: "Record damage / reduce stock",
                                  },
                                ]}
                              />
                              <Input
                                aria-label={`Quantity for ${stock.item.name}, ${stock.department.name}`}
                                type="number"
                                min="1"
                                placeholder="Enter quantity"
                                value={adjustments[stock.id] ?? ""}
                                onChange={(e) =>
                                  setAdjustments((a) => ({
                                    ...a,
                                    [stock.id]: e.target.value,
                                  }))
                                }
                              />
                              <Button
                                disabled={adjustStock.isPending}
                                onClick={() => addQuantity(stock)}
                              >
                                {adjustmentModes[stock.id] === "REMOVE"
                                  ? "Confirm reduction"
                                  : "Confirm receipt"}
                              </Button>
                              <Input
                                className="sm:col-span-3"
                                aria-label={`Note for ${stock.item.name}, ${stock.department.name}`}
                                placeholder={
                                  adjustmentModes[stock.id] === "REMOVE"
                                    ? "Reason for reducing stock (required)"
                                    : "Receipt note (optional)"
                                }
                                value={adjustmentNotes[stock.id] ?? ""}
                                onChange={(e) =>
                                  setAdjustmentNotes((current) => ({
                                    ...current,
                                    [stock.id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    {!stocks.filter(
                      (stock) =>
                        stockDepartmentFilter === ALL ||
                        String(stock.departmentId) === stockDepartmentFilter,
                    ).length && (
                      <p className="py-8 text-center text-sm text-muted-foreground lg:col-span-2">
                        This department has no inventory stock.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

      {isSystemAdmin && workspaceView === "manage" && panel === "stock" && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Low-stock thresholds</CardTitle>
            <p className="text-sm text-muted-foreground">
              Set the minimum quantity for each department stock.
            </p>
          </CardHeader>
          <CardContent className="grid max-h-96 gap-3 overflow-y-auto lg:grid-cols-2">
            {stocks
              .filter(
                (stock) =>
                  stockDepartmentFilter === ALL ||
                  String(stock.departmentId) === stockDepartmentFilter,
              )
              .map((stock) => (
                <div
                  key={stock.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {stock.item.name} · {stock.department.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current threshold: {stock.minStock}{" "}
                      {stock.item.unit}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      className="w-28"
                      aria-label={`Low-stock threshold for ${stock.item.name}, ${stock.department.name}`}
                      type="number"
                      min="0"
                      value={stockMinEdits[stock.id] ?? stock.minStock}
                      onChange={(event) =>
                        setStockMinEdits((current) => ({
                          ...current,
                          [stock.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateStock.isPending}
                      onClick={() => saveMinimumStock(stock)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
          {isApprover && panel === "asset" && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Receive a serialized asset</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select a destination stock, then scan or enter the number from the physical asset. Stock increases by 1.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <Label htmlFor="asset-stock">1. Destination stock</Label>
                    <InventorySelect
                      id="asset-stock"
                      value={assetForm.stockId}
                      onChange={(value) =>
                        setAssetForm((f) => ({ ...f, stockId: value }))
                      }
                      placeholder="Select department and asset type"
                      options={serializedStocks.map((stock) => ({
                        value: stock.id,
                        label: `${stock.department.name} · ${stock.item.name}`,
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset-serial">2. Serial Number</Label>
                    <Input
                      id="asset-serial"
                      className="mt-1"
                      placeholder="Scan barcode or enter serial number"
                      value={assetForm.serialNo}
                      onChange={(e) =>
                        setAssetForm((f) => ({
                          ...f,
                          serialNo: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset-tag">
                      3. Asset Tag{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="asset-tag"
                      className="mt-1"
                      placeholder="Organization asset ID"
                      value={assetForm.assetTag}
                      onChange={(e) =>
                        setAssetForm((f) => ({
                          ...f,
                          assetTag: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                {selectedAssetStock && assetForm.serialNo.trim() ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Receiving
                      </p>
                      <p className="font-medium">
                        {selectedAssetStock.item.name} → Stock{" "}
                        {selectedAssetStock.department.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        After confirmation, on-hand stock increases from{" "}
                        {selectedAssetStock.onHand} to{" "}
                        {selectedAssetStock.onHand + 1}{" "}
                        {selectedAssetStock.item.unit}
                      </p>
                    </div>
                    <Button
                      disabled={
                        !assetForm.serialNo.trim() || createAsset.isPending
                      }
                      onClick={addAsset}
                    >
                      Confirm receipt of 1 {selectedAssetStock.item.unit}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Select a destination stock to preview this receipt.
                  </div>
                )}
                <div className="border-t pt-5">
                  <div className="mb-3">
                    <h3 className="font-semibold">Assets in selected stock</h3>
                    <p className="text-sm text-muted-foreground">
                      Only assets from the selected stock are shown.
                    </p>
                  </div>
                  {selectedAssetStock ? (
                    <div className="space-y-2">
                      {selectedAssetStock.assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                        >
                          <span className="font-medium">{asset.serialNo}</span>
                          <span className="text-sm text-muted-foreground">
                            {asset.assetTag || "No asset tag"} ·{" "}
                            {assetStatusLabels[asset.status] ?? asset.status}
                          </span>
                        </div>
                      ))}
                      {!selectedAssetStock.assets.length && (
                        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                          This stock has no serialized assets.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Select a stock to view its assets.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isApprover && panel === "asset" && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Issue an asset directly</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Use for walk-up issue or historical import without creating a request first.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label htmlFor="direct-issue-asset">Asset to issue</Label>
                    <InventorySelect
                      id="direct-issue-asset"
                      value={issueForm.assetId}
                      onChange={(value) =>
                        setIssueForm((current) => ({
                          ...current,
                          assetId: value,
                        }))
                      }
                      placeholder="Select the physical serialized asset"
                      options={issueableAssets.map((asset) => ({
                        value: asset.id,
                        label: `${asset.stock.department.name} · ${asset.stock.item.name} · ${asset.serialNo}${asset.assetTag ? ` · ${asset.assetTag}` : ""}`,
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="direct-issue-user">Recipient</Label>
                    <InventorySelect
                      id="direct-issue-user"
                      value={issueForm.userId}
                      onChange={(value) =>
                        setIssueForm((current) => ({
                          ...current,
                          userId: value,
                        }))
                      }
                      placeholder={
                        usersQuery.isLoading
                          ? "Loading user accounts"
                          : "Select recipient"
                      }
                      options={eligibleRecipients.map((candidate) => ({
                        value: candidate.id,
                        label: `${candidate.firstname} ${candidate.lastname}${candidate.department?.name ? ` · ${candidate.department.name}` : ""}`,
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="direct-issue-condition">
                      Condition when issued (optional)
                    </Label>
                    <Input
                      id="direct-issue-condition"
                      className={fieldClass}
                      value={issueForm.conditionOut}
                      onChange={(event) =>
                        setIssueForm((current) => ({
                          ...current,
                          conditionOut: event.target.value,
                        }))
                      }
                      placeholder="For example, new with power adapter"
                    />
                  </div>
                  <div>
                    <Label htmlFor="direct-issue-note">Issue reason</Label>
                    <Input
                      id="direct-issue-note"
                      className={fieldClass}
                      value={issueForm.note}
                      onChange={(event) =>
                        setIssueForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="For example, issued to a new employee"
                    />
                  </div>
                </div>
                <Button
                  disabled={
                    issueAsset.isPending ||
                    !issueForm.assetId ||
                    !issueForm.userId ||
                    !issueForm.note.trim()
                  }
                  onClick={submitDirectIssue}
                >
                  Confirm issue
                </Button>
                {!issueableAssets.length && (
                  <p className="text-sm text-muted-foreground">
                    No serialized assets are available within your scope.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {isApprover && panel === "asset" && selectedAssetStock && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>
                  Edit assets in {selectedAssetStock.department.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Every change records the actor and changed data. A reason is required for maintenance or retirement.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedAssetStock.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="grid gap-2 rounded-lg border p-3 md:grid-cols-2 lg:grid-cols-3"
                  >
                    <Input
                      aria-label={`Serial number for ${asset.serialNo}`}
                      value={assetEdits[asset.id]?.serialNo ?? asset.serialNo}
                      onChange={(event) =>
                        setAssetEdits((current) => ({
                          ...current,
                          [asset.id]: {
                            ...current[asset.id],
                            serialNo: event.target.value,
                          },
                        }))
                      }
                    />
                    <Input
                      aria-label={`Asset tag for ${asset.serialNo}`}
                      placeholder="Asset tag (optional)"
                      value={
                        assetEdits[asset.id]?.assetTag ?? asset.assetTag ?? ""
                      }
                      onChange={(event) =>
                        setAssetEdits((current) => ({
                          ...current,
                          [asset.id]: {
                            ...current[asset.id],
                            assetTag: event.target.value,
                          },
                        }))
                      }
                    />
                    <Input
                      aria-label={`Condition for ${asset.serialNo}`}
                      placeholder="Asset condition"
                      value={
                        assetEdits[asset.id]?.condition ?? asset.condition ?? ""
                      }
                      onChange={(event) =>
                        setAssetEdits((current) => ({
                          ...current,
                          [asset.id]: {
                            ...current[asset.id],
                            condition: event.target.value,
                          },
                        }))
                      }
                    />
                    <InventorySelect
                      ariaLabel={`Status for ${asset.serialNo}`}
                      className="mt-0"
                      disabled={asset.status === "ASSIGNED"}
                      value={assetEdits[asset.id]?.status ?? asset.status}
                      onChange={(value) =>
                        setAssetEdits((current) => ({
                          ...current,
                          [asset.id]: {
                            ...current[asset.id],
                            status: value,
                          },
                        }))
                      }
                      options={[
                        { value: "AVAILABLE", label: "Available" },
                        { value: "MAINTENANCE", label: "Under maintenance" },
                        { value: "RETIRED", label: "Retired" },
                      ]}
                    />
                    <Input
                      aria-label={`Change reason for ${asset.serialNo}`}
                      placeholder="Change reason (required for maintenance or retirement)"
                      value={assetEdits[asset.id]?.note ?? ""}
                      onChange={(event) =>
                        setAssetEdits((current) => ({
                          ...current,
                          [asset.id]: {
                            ...current[asset.id],
                            note: event.target.value,
                          },
                        }))
                      }
                    />
                    <Button
                      disabled={
                        updateAsset.isPending || asset.status === "ASSIGNED"
                      }
                      onClick={() => saveAsset(asset)}
                    >
                      Save asset
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {workspaceView === "history" && isApprover && (
        <InventoryHistoryPanel
          movements={movements}
          movementType={movementType}
          movementDepartment={movementDepartment}
          isSystemAdmin={isSystemAdmin}
          accountDepartment={accountDepartment}
          onTypeChange={setMovementType}
          onDepartmentChange={setMovementDepartment}
          onReset={resetMovementFilters}
          onDownload={printPdf}
        />
      )}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
        title={`Remove ${deletingItem?.name ?? "this item"}?`}
        description="An item can be removed only when on-hand and reserved quantities are 0, with no pending requests or assigned assets. Existing history is preserved."
        confirmLabel="Remove item"
        isPending={deleteItem.isPending}
        onConfirm={removeItem}
      />
    </div>
  );
}

export default InventoryWorkspace;
