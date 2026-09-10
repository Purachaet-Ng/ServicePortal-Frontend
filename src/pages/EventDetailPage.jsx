import { useState } from "react";
import { useParams } from "react-router-dom";
import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorState from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import PageHeader from "@/components/common/PageHeader";
import { StatusPill } from "@/components/common/StatusChip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCancelEvent, useCheckInEvent, useEvent, useEventQr, useRsvpEvent, useUpdateEvent } from "@/features/events/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime, formatTimeRange, fullName } from "@/lib/format";

const ATTENDANCE_LABEL = {
  INVITED: "Waiting for response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  ATTENDED: "Attended",
  ABSENT: "Absent",
};

export function EventDetailPage() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const [confirmAction, setConfirmAction] = useState(null);
  const [qrToken, setQrToken] = useState("");

  const eventQuery = useEvent(id);
  const event = eventQuery.data;
  const attendee = event?.attendees?.find(({ user: person }) => person.id === user?.id);
  const canManage = event?.organizerId === user?.id || role === "ADMIN_SYSTEM";
  const canViewAttendees = canManage || role === "ADMIN_DEPT";
  const canShowQr = attendee?.rsvpStatus === "ACCEPTED" && ["PENDING", "LIVE"].includes(event?.status);
  const qrQuery = useEventQr(id, canShowQr);
  const updateEvent = useUpdateEvent();
  const cancelEvent = useCancelEvent();
  const rsvpEvent = useRsvpEvent();
  const checkInEvent = useCheckInEvent();

  if (eventQuery.isPending) return <LoadingRows rows={5} columns={2} />;
  if (eventQuery.isError) {
    return <ErrorState error={eventQuery.error} onRetry={eventQuery.refetch} />;
  }

  const runRsvp = (rsvpStatus) =>
    rsvpEvent.mutate(
      { id, rsvpStatus },
      {
        onSuccess: () => toast.success(rsvpStatus === "ACCEPTED" ? "Invitation accepted." : "Invitation declined."),
        onError: (error) => toast.error(error.message),
      },
    );

  const changeStatus = (status) =>
    updateEvent.mutate(
      { id, body: { status } },
      {
        onSuccess: () => {
          setConfirmAction(null);
          toast.success(status === "LIVE" ? "Event is live." : "Event closed.");
        },
        onError: (error) => toast.error(error.message),
      },
    );

  const cancel = () =>
    cancelEvent.mutate(id, {
      onSuccess: () => {
        setConfirmAction(null);
        toast.success("Event cancelled.");
      },
      onError: (error) => toast.error(error.message),
    });

  const checkIn = (body) =>
    checkInEvent.mutate(
      { id, ...body },
      {
        onSuccess: () => {
          setQrToken("");
          toast.success("Check-in successful.");
        },
        onError: (error) => toast.error(error.message),
      },
    );

  const submitQr = (event) => {
    event.preventDefault();
    if (qrToken.trim()) checkIn({ token: qrToken.trim() });
  };

  return (
    <>
      <PageHeader
        className="mx-auto mt-6 max-w-3xl"
        title={event.title}
        description={formatTimeRange(event.startTime, event.endTime)}
      >
      </PageHeader>

      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Event details</CardTitle>
            <StatusPill kind="event" value={event.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            {event.status === "CANCEL" && (
              <p
                className="rounded-lg bg-muted p-3 text-sm text-muted-foreground"
                role="status"
              >
                This event was cancelled by an administrator.
              </p>
            )}
            <Detail label="Organizer">{fullName(event.organizer)}</Detail>
            <Detail label="Starts">{formatDateTime(event.startTime)}</Detail>
            <Detail label="Ends">{formatDateTime(event.endTime)}</Detail>
            {event.description && (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {canManage && event.status === "PENDING" && (
              <div className="flex gap-2 border-t pt-4">
                <Button
                  disabled={updateEvent.isPending || cancelEvent.isPending}
                  onClick={() => changeStatus("LIVE")}
                >
                  Start event
                </Button>
                <Button
                  variant="destructive"
                  disabled={updateEvent.isPending || cancelEvent.isPending}
                  onClick={() => setConfirmAction("cancel")}
                >
                  Cancel event
                </Button>
              </div>
            )}

            {canManage && event.status === "LIVE" && (
              <Button
                variant="destructive"
                disabled={updateEvent.isPending}
                onClick={() => setConfirmAction("close")}
              >
                Close event
              </Button>
            )}
          </CardContent>
        </Card>

        {attendee && (
          <Card>
            <CardHeader>
              <CardTitle>My invitation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Detail label="Status">
                {event.status === "CANCEL"
                  ? "Cancelled"
                  : ATTENDANCE_LABEL[attendee.rsvpStatus] ?? attendee.rsvpStatus}
              </Detail>

              {event.status === "PENDING" && attendee.rsvpStatus === "INVITED" && (
                <div className="flex gap-2">
                  <Button
                    disabled={rsvpEvent.isPending}
                    onClick={() => runRsvp("ACCEPTED")}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    disabled={rsvpEvent.isPending}
                    onClick={() => runRsvp("DECLINED")}
                  >
                    Decline
                  </Button>
                </div>
              )}

              {canShowQr && (
                <div className="space-y-3 border-t pt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Show this personal code to the event staff.
                  </p>
                  {qrQuery.isPending ? (
                    <LoadingRows rows={3} columns={1} />
                  ) : qrQuery.isError ? (
                    <ErrorState error={qrQuery.error} onRetry={qrQuery.refetch} className="py-8" />
                  ) : (
                    <div className="relative inline-block rounded-lg bg-white p-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-10 right-0"
                        aria-label="Copy QR token"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(qrQuery.data)
                            .then(() => toast.success("Token copied."))
                        }
                      >
                        <Copy className="size-4" />
                      </Button>
                      <QRCodeSVG
                        value={qrQuery.data}
                        size={220}
                        title="Personal event check-in QR code"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {canViewAttendees && (
        <Card className="mx-auto mt-6 max-w-3xl">
          <CardHeader>
            <CardTitle>Attendees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {canManage && event.status === "LIVE" && (
              <form className="flex max-w-xl items-end gap-2" onSubmit={submitQr}>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="qr-token">Scan or paste QR token</Label>
                  <Input
                    id="qr-token"
                    value={qrToken}
                    onChange={(event) => setQrToken(event.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={!qrToken.trim() || checkInEvent.isPending}>
                  Check in
                </Button>
              </form>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Checked in</TableHead>
                  {canManage && event.status === "LIVE" && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.attendees.map((item) => (
                  <TableRow key={item.user.id}>
                    <TableCell>
                      <p className="font-medium">{fullName(item.user)}</p>
                      <p className="text-xs text-muted-foreground">{item.user.email}</p>
                    </TableCell>
                    <TableCell>
                      {event.status === "CANCEL"
                        ? "Cancelled"
                        : ATTENDANCE_LABEL[item.rsvpStatus] ?? item.rsvpStatus}
                    </TableCell>
                    <TableCell>{formatDateTime(item.checkedInAt)}</TableCell>
                    {canManage && event.status === "LIVE" && (
                      <TableCell className="text-right">
                        {item.rsvpStatus === "ACCEPTED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={checkInEvent.isPending}
                            onClick={() => checkIn({ userId: item.user.id })}
                          >
                            Manual check-in
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmAction === "close"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Close this event?"
        description="Accepted attendees who were not checked in will be marked absent."
        confirmLabel="Close event"
        isPending={updateEvent.isPending}
        onConfirm={() => changeStatus("CLOSED")}
      />
      <ConfirmDialog
        open={confirmAction === "cancel"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Cancel this event?"
        description="The event will be cancelled and cannot be started."
        confirmLabel="Cancel event"
        isPending={cancelEvent.isPending}
        onConfirm={cancel}
      />
    </>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}

export default EventDetailPage;
