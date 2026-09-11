import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useCentralStocks, useReplenishments, useReceiveCentralStock, useCreateReplenishment,
  useUpdateReplenishment } from "./useInventory";

const selectClass = "h-10 rounded-md border bg-background px-3 text-sm w-full";
const statuses = { PENDING: "Awaiting approval", APPROVED: "Ready to dispatch", DISPATCHED: "In transit — confirm receipt", RECEIVED: "Received", REJECTED: "Rejected", CANCELLED: "Cancelled" };
const reportError = (error) => toast.error(error.message || "Unable to save changes");

function Shipment({ request, stocks, isSystemAdmin }) {
  const update = useUpdateReplenishment();
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const assets = (stocks.find((s) => s.id === request.sourceStockId)?.assets ?? [])
    .filter((asset) => asset.status === "AVAILABLE");
  const serialized = request.sourceStock.item.isSerialized;
  const act = (status) => {
    if (["REJECTED", "CANCELLED"].includes(status) && !note.trim()) return toast.error("Enter a reason first");
    update.mutate({ id: request.id, status, note: note.trim(), assetIds: status === "DISPATCHED" ? selected : undefined, confirmReceipt: confirmed }, {
      onSuccess: () => { toast.success("Replenishment updated"); setSelected([]); setConfirmed(false); }, onError: reportError,
    });
  };
  return <div className="space-y-3 rounded-lg border p-4">
    <div className="flex flex-wrap justify-between gap-2"><strong>#{request.id} · {request.department.name} · {request.sourceStock.item.name} × {request.quantity}</strong><span className="text-sm">{statuses[request.status]}</span></div>
    <p className="text-sm text-muted-foreground">Requested by {request.requester.firstname} {request.requester.lastname} · {request.reason}</p>
    {request.decisionNote && <p className="text-sm">Decision: {request.decisionNote}</p>}
    {request.assets.length > 0 && <p className="text-sm">Serials: {request.assets.map((a) => a.asset.serialNo).join(", ")}</p>}
    {isSystemAdmin && request.status === "APPROVED" && serialized && <fieldset className="max-h-48 space-y-2 overflow-y-auto rounded border p-3">
      <legend>Select {request.quantity} physical devices ({selected.length} selected)</legend>
      {assets.map((asset) => <label className="flex items-center gap-2" key={asset.id}>
        <input type="checkbox" checked={selected.includes(asset.id)} disabled={update.isPending} onChange={(e) => setSelected(e.target.checked ? [...selected, asset.id] : selected.filter((id) => id !== asset.id))} />{asset.serialNo} {asset.assetTag && `· ${asset.assetTag}`}
      </label>)}
    </fieldset>}
    {["PENDING", "APPROVED"].includes(request.status) && <Input aria-label={`Reason for request ${request.id}`} placeholder="Reason required to reject or cancel" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}
    {request.status === "DISPATCHED" && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I received all {request.quantity} items{serialized ? " and checked every serial" : ""}. Do not confirm if anything is missing; contact System Admin.</label>}
    <div className="flex flex-wrap gap-2">
      {isSystemAdmin && request.status === "PENDING" && <><Button disabled={update.isPending} onClick={() => act("APPROVED")}>Approve</Button><Button variant="outline" disabled={update.isPending} onClick={() => act("REJECTED")}>Reject</Button></>}
      {isSystemAdmin && request.status === "APPROVED" && <Button disabled={update.isPending || (serialized && selected.length !== request.quantity)} onClick={() => act("DISPATCHED")}>Confirm dispatch</Button>}
      {request.status === "DISPATCHED" && <Button disabled={update.isPending || !confirmed} onClick={() => act("RECEIVED")}>Receive into department stock</Button>}
      {["PENDING", "APPROVED"].includes(request.status) && <Button variant="outline" disabled={update.isPending} onClick={() => act("CANCELLED")}>Cancel request</Button>}
    </div>
  </div>;
}

export default function ReplenishmentPanel({ isSystemAdmin, items, section = "all" }) {
  const showReceive = isSystemAdmin && section !== "requests";
  const showRequestForm = !isSystemAdmin && section !== "requests";
  const showRequests = section !== "receive";
  const central = useCentralStocks();
  const requests = useReplenishments({ enabled: showRequests });
  const receiveCentral = useReceiveCentralStock();
  const create = useCreateReplenishment();
  const [stockId, setStockId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [receiveStockId, setReceiveStockId] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [receiveNote, setReceiveNote] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [limit, setLimit] = useState(10);
  const stocks = central.data ?? [];
  const receiving = items.find((item) => String(item.id) === receiveStockId);
  const receivingStock = stocks.find((stock) => stock.itemId === receiving?.id);
  const visible = (requests.data ?? []).filter((r) => showCompleted || ["PENDING", "APPROVED", "DISPATCHED"].includes(r.status));
  const selectedStock = stocks.find((s) => String(s.id) === String(stockId));
  const changeRequestedQuantity = (stock, delta) => {
    const current = String(stock.id) === String(stockId) ? Number(quantity || 0) : 0;
    const next = Math.max(0, Math.min(stock.available, current + delta));
    setStockId(next > 0 ? String(stock.id) : "");
    setQuantity(next > 0 ? String(next) : "");
  };
  const submit = (event) => {
    event.preventDefault();
    if (!selectedStock || Number(quantity) < 1) return toast.error("Select an item and quantity first");
    create.mutate({ sourceStockId: Number(stockId), quantity: Number(quantity), reason: reason.trim() }, {
      onSuccess: () => { toast.success("Sent to System Admin for approval"); setQuantity(""); setReason(""); }, onError: reportError,
    });
  };
  const receive = (event) => {
    event.preventDefault();
    const body = receiving?.isSerialized
      ? { itemId: receiving.id, serialNo: serialNo.trim(), note: receiveNote.trim() || undefined }
      : { itemId: receiving.id, quantity: Number(receiveQuantity), note: receiveNote.trim() };
    receiveCentral.mutate(body, { onSuccess: () => { toast.success("System Admin stock updated"); setReceiveQuantity(""); setSerialNo(""); setReceiveNote(""); }, onError: reportError });
  };
  if (central.isPending || (showRequests && requests.isPending)) return <p>Loading System Admin stock…</p>;
  if (central.isError || (showRequests && requests.isError)) return <div role="alert" className="rounded border p-4">Unable to load System Admin stock and department requests.<Button variant="outline" onClick={() => { central.refetch(); if (showRequests) requests.refetch(); }}>Retry</Button></div>;
  return <div className="space-y-5">
    {showReceive && <Card><CardHeader><CardTitle>Receive goods into System Admin stock</CardTitle></CardHeader><CardContent>
      <form className="grid gap-3" onSubmit={receive}>
        <select aria-label="Item received by System Admin" className={selectClass} required value={receiveStockId} onChange={(e) => setReceiveStockId(e.target.value)}><option value="">Select catalog item</option>{items.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {receiving && <p className="rounded-lg border p-3 text-sm">Current stock: On hand {receivingStock?.onHand ?? 0} · Reserved {receivingStock?.reserved ?? 0} · Available {receivingStock?.available ?? 0} {receiving.unit}</p>}
        {receiving?.isSerialized ? <><Input aria-label="Serial number" placeholder="Physical device serial number (one device per receipt)" required value={serialNo} onChange={(e) => setSerialNo(e.target.value)} /><Input aria-label="Receipt reference" placeholder="Receipt / delivery reference (optional)" maxLength={1000} value={receiveNote} onChange={(e) => setReceiveNote(e.target.value)} /></> : <><Input aria-label="Quantity received" type="number" min="1" max="1000000" step="1" required placeholder="Quantity received" value={receiveQuantity} onChange={(e) => setReceiveQuantity(e.target.value)} /><Input aria-label="Receipt reference" placeholder="Receipt / delivery reference" required maxLength={1000} value={receiveNote} onChange={(e) => setReceiveNote(e.target.value)} /></>}
        <Button disabled={!receiving || receiveCentral.isPending}>Confirm receipt</Button>
      </form>
    </CardContent></Card>}
    {showRequestForm && <Card><CardHeader><CardTitle>Select items from System Admin stock</CardTitle><p className="text-sm text-muted-foreground">Choose one item and quantity per request. Received goods will be added to your department stock.</p></CardHeader><CardContent>
      <form className="grid gap-3" onSubmit={submit}>
        <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
          {stocks.length === 0 && <p>No items are currently available from System Admin.</p>}
          {stocks.map((stock) => {
            const selectedQuantity = String(stock.id) === String(stockId) ? Number(quantity || 0) : 0;
            return <div key={stock.id} className={`rounded-xl border p-5 ${selectedQuantity > 0 ? "border-primary ring-1 ring-primary" : ""}`}>
              <p className="font-semibold">{stock.item.name}</p>
              <p className="text-sm text-muted-foreground">{stock.item.sku} · {stock.item.unit}{stock.item.isSerialized ? " · Serialized" : ""}</p>
              <div className="mt-5 grid grid-cols-3 gap-3 border-b pb-5">
                <div><p className="text-sm text-muted-foreground">On hand</p><p className="text-xl font-semibold">{stock.onHand}</p></div>
                <div><p className="text-sm text-muted-foreground">Reserved</p><p className="text-xl font-semibold">{stock.reserved}</p></div>
                <div><p className="text-sm text-muted-foreground">Available</p><p className="text-xl font-semibold">{stock.available}</p></div>
              </div>
              <div className="mt-4 flex items-center justify-between"><span className="font-medium">Quantity</span><div className="flex items-center gap-4">
                <Button type="button" variant="outline" size="sm" aria-label={`Decrease ${stock.item.name}`} disabled={selectedQuantity === 0} onClick={() => changeRequestedQuantity(stock, -1)}>−</Button>
                <span className="min-w-6 text-center font-semibold">{selectedQuantity}</span>
                <Button type="button" variant="outline" size="sm" aria-label={`Increase ${stock.item.name}`} disabled={stock.available === 0 || selectedQuantity >= stock.available} onClick={() => changeRequestedQuantity(stock, 1)}>+</Button>
              </div></div>
            </div>;
          })}
        </div>
        <Input aria-label="Replenishment reason" required maxLength={1000} placeholder="Why does your department need these items?" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button disabled={create.isPending || !selectedStock || Number(quantity) < 1}>Send replenishment request</Button>
      </form>
    </CardContent></Card>}
    {showRequests && <Card><CardHeader><CardTitle>Department stock requests</CardTitle><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showCompleted} onChange={(e) => { setShowCompleted(e.target.checked); setLimit(10); }} />Include completed requests</label></CardHeader><CardContent className="space-y-3">
      {visible.length === 0 && <p>No requests in this view.</p>}
      {visible.slice(0, limit).map((r) => <Shipment key={r.id} request={r} stocks={stocks} isSystemAdmin={isSystemAdmin} />)}
      {visible.length > limit && <Button variant="outline" onClick={() => setLimit(limit + 10)}>Show 10 more</Button>}
    </CardContent></Card>}
  </div>;
}
