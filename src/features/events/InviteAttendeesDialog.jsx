import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEventDepartments,
  useEventInvitees,
  useInviteAttendees,
} from "@/features/events/useEvents";
import { fullName } from "@/lib/format";

export default function InviteAttendeesDialog({ event, open, onOpenChange }) {
  const [departmentId, setDepartmentId] = useState("");
  const [userIds, setUserIds] = useState([]);
  const departmentsQuery = useEventDepartments();
  const inviteesQuery = useEventInvitees(departmentId);
  const inviteAttendees = useInviteAttendees();
  const invitedIds = useMemo(
    () => new Set(event.attendees.map(({ user }) => user.id)),
    [event.attendees],
  );
  const invitees = (inviteesQuery.data ?? []).filter(
    ({ id }) => !invitedIds.has(id),
  );

  const changeDepartment = (value) => {
    setDepartmentId(value);
    setUserIds([]);
  };

  const close = () => {
    setDepartmentId("");
    setUserIds([]);
    onOpenChange(false);
  };

  const submit = () =>
    inviteAttendees.mutate(
      { id: event.id, userIds },
      {
        onSuccess: () => {
          toast.success("Invitations sent.");
          close();
        },
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite employees</DialogTitle>
          <DialogDescription>
            Select employees to add to this event.
          </DialogDescription>
        </DialogHeader>

        <Select value={departmentId} onValueChange={changeDepartment}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {(departmentsQuery.data ?? []).map((department) => (
              <SelectItem key={department.id} value={String(department.id)}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {departmentId && (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {inviteesQuery.isPending ? (
              <p className="p-2 text-muted-foreground">Loading employees…</p>
            ) : inviteesQuery.isError ? (
              <p className="p-2 text-destructive">
                {inviteesQuery.error.message}
              </p>
            ) : invitees.length ? (
              invitees.map((user) => (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted"
                >
                  <Checkbox
                    checked={userIds.includes(user.id)}
                    onCheckedChange={(checked) =>
                      setUserIds((selected) =>
                        checked
                          ? [...selected, user.id]
                          : selected.filter((id) => id !== user.id),
                      )
                    }
                  />
                  <span>{fullName(user)}</span>
                </label>
              ))
            ) : (
              <p className="p-2 text-muted-foreground">
                Everyone in this department is already invited.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!userIds.length || inviteAttendees.isPending}
            onClick={submit}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
