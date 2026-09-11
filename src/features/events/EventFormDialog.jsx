import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateEvent } from "@/features/events/useEvents";
import { applyServerError } from "@/lib/formErrors";
import { eventSchema } from "@/validators/event.validator";

export default function EventFormDialog({ open, onOpenChange, event }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(eventSchema) });
  const updateEvent = useUpdateEvent();

  useEffect(() => {
    if (!open || !event) return;
    reset({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      startTime: format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"),
    });
  }, [open, event, reset]);

  const onSubmit = (values) =>
    updateEvent.mutate(
      {
        id: event.id,
        body: {
          title: values.title,
          description: values.description.trim() || null,
          location: values.location.trim() || null,
          startTime: new Date(values.startTime).toISOString(),
          endTime: new Date(values.endTime).toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Changes saved");
          onOpenChange(false);
        },
        onError: (error) =>
          applyServerError(error, {
            setError,
            fields: ["title", "description", "location", "startTime", "endTime"],
          }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>Update the event details.</DialogDescription>
        </DialogHeader>

        <form id="event-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" {...register("title")} aria-invalid={!!errors.title} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              className="resize-none"
              {...register("description")}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              {...register("location")}
              aria-invalid={!!errors.location}
            />
            {errors.location && (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-start">Start time</Label>
              <Input
                id="event-start"
                type="datetime-local"
                step={300}
                {...register("startTime")}
                aria-invalid={!!errors.startTime}
              />
              {errors.startTime && (
                <p className="text-xs text-destructive">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">End time</Label>
              <Input
                id="event-end"
                type="datetime-local"
                step={300}
                {...register("endTime")}
                aria-invalid={!!errors.endTime}
              />
              {errors.endTime && (
                <p className="text-xs text-destructive">{errors.endTime.message}</p>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateEvent.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="event-form" disabled={updateEvent.isPending}>
            {updateEvent.isPending && <Spinner />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
