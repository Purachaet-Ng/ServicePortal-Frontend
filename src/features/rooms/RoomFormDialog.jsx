import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { roomSchema } from "@/validators/room.validator";
import { useCreateRoom, useUpdateRoom } from "./useRooms";

/**
 * One dialog, two jobs: `room` present means edit, absent means create — the
 * same shape as UserFormDialog, for the same reason. A room is three fields and
 * both modes take all three, so nothing branches below the header.
 *
 * roomSchema is reused as-is for edit. The backend's updateRoomSchema is
 * roomSchema.partial(), but this form always submits every field, so a partial
 * client schema would only weaken the check without changing what is sent.
 */
export function RoomFormDialog({ open, onOpenChange, room }) {
  const isEdit = Boolean(room);

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(roomSchema) });

  const createMutation = useCreateRoom();
  const updateMutation = useUpdateRoom();
  const mutation = isEdit ? updateMutation : createMutation;

  // Reset on every open, not just on mount: the dialog stays mounted between
  // rows, so without this, editing Room A then Room B would show A's values.
  useEffect(() => {
    if (!open) return;
    reset({
      name: room?.name ?? "",
      location: room?.location ?? "",
      capacity: room?.capacity ?? "",
    });
  }, [open, room, reset]);

  const onSubmit = (values) => {
    // "" is the untouched-input value, and an empty string is not a location.
    const body = { ...values, location: values.location || undefined };

    mutation.mutate(isEdit ? { id: room.id, ...body } : body, {
      onSuccess: () => {
        toast.success(isEdit ? "Changes saved" : `${body.name} created`);
        onOpenChange(false);
      },
      onError: (error) => {
        // Server validation belongs ON the fields, never in a toast — the admin
        // needs to see which input to fix (WORKFLOW.md §A3).
        if (error.errors?.length) {
          for (const detail of error.errors) {
            if (detail.field) {
              setError(detail.field, { type: "server", message: detail.message });
            }
          }
          return;
        }
        // 409 is the unique constraint on rooms.name — put it on the field
        // that caused it, not in a footer nobody connects to the input.
        setError(error.status === 409 ? "name" : "root", {
          type: "server",
          message:
            error.status === 409
              ? "A room with that name already exists"
              : error.message,
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit room" : "New room"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Renaming a room renames it on the availability grid too, including on bookings already made."
              : "The room becomes bookable by everyone as soon as it is saved."}
          </DialogDescription>
        </DialogHeader>

        <form id="room-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Meeting Room 1"
              aria-invalid={!!errors.name}
              {...field("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Floor 2"
              aria-invalid={!!errors.location}
              {...field("location")}
            />
            {errors.location ? (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optional, and free text — there is no floor table, so the Rooms
                page builds its floor filter from whatever is typed here. Match
                the wording of the other rooms.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="8"
              aria-invalid={!!errors.capacity}
              {...field("capacity")}
            />
            {errors.capacity && (
              <p className="text-xs text-destructive">{errors.capacity.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="room-form" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {isEdit ? "Save changes" : "Create room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RoomFormDialog;
