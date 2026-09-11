import { useState } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * "Why are you rejecting this?" — the box the reservation queue mock always
 * asked for and the API refused to accept until room_bookings and car_bookings
 * grew a rejection_reason column.
 *
 * ONE component for both screens that can reject: the queue and the booking
 * detail page. They are the only two, and a textarea plus its own state copied
 * into each is exactly the drift STITCH-PROMPTS §07 warns about.
 *
 * The reason is REQUIRED, and that is the whole point. bookingStatusSchema on
 * the server rejects a REJECTED write without one, so an optional box here
 * would only turn a decision the admin already made into a 400 they have to
 * read. Confirm stays disabled until something is typed.
 *
 * Approving deliberately does NOT open this. There is nothing to explain about
 * a yes, and a dialog in front of it would slow down the common case to serve
 * the rare one — the queue exists to make the decision fast.
 */
export function RejectDialog({ open, onOpenChange, booking, isPending, onConfirm }) {
  const [reason, setReason] = useState("");

  // Cleared each time the dialog OPENS, and on a booking-by-booking basis — not
  // when it closes, which would empty the box mid-fade-out in full view of
  // whoever just typed in it.
  //
  // Adjusted during render rather than in an effect. React re-runs this
  // component immediately with the new state and commits nothing in between, so
  // the box is never painted holding the previous booking's sentence; an effect
  // would paint it once and then clear it, and would be a second render either
  // way.
  const opened = open ? `${booking?.type}:${booking?.id}` : null;
  const [lastOpened, setLastOpened] = useState(null);
  if (opened !== lastOpened) {
    setLastOpened(opened);
    setReason("");
  }

  const name = booking?.resource?.name ?? booking?.room?.name ?? booking?.car?.name;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reject this booking?"
      description={`${name ?? "The booking"} stays free and the requester is told why — they see this sentence in their notification, so write it to them.`}
      confirmLabel="Reject booking"
      isPending={isPending}
      confirmDisabled={!reason.trim()}
      onConfirm={() => onConfirm(reason.trim())}
    >
      <div className="space-y-2">
        <Label htmlFor="rejectionReason">Reason</Label>
        <Textarea
          id="rejectionReason"
          className="resize-none"
          rows={3}
          maxLength={500}
          autoFocus
          placeholder="The board room is held for the audit that week — try Thursday."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}

export default RejectDialog;
