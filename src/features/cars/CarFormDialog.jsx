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
import { carSchema } from "@/validators/car.validator";
import { useCreateCar, useUpdateCar } from "./useCars";

/**
 * One dialog, two jobs: `car` present means edit, absent means create — the
 * same shape as RoomFormDialog, for the same reason. A car is four fields and
 * both modes take all four, so nothing branches below the header.
 */
export function CarFormDialog({ open, onOpenChange, car }) {
  const isEdit = Boolean(car);

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(carSchema) });

  const createMutation = useCreateCar();
  const updateMutation = useUpdateCar();
  const mutation = isEdit ? updateMutation : createMutation;

  // Reset on every open, not just on mount: the dialog stays mounted between
  // rows, so without this, editing Car A then Car B would show A's values.
  useEffect(() => {
    if (!open) return;
    reset({
      name: car?.name ?? "",
      plate: car?.plate ?? "",
      seats: car?.seats ?? "",
      location: car?.location ?? "",
    });
  }, [open, car, reset]);

  const onSubmit = (values) => {
    // "" is the untouched-input value, and an empty string is not a location.
    const body = { ...values, location: values.location || undefined };

    mutation.mutate(isEdit ? { id: car.id, ...body } : body, {
      onSuccess: () => {
        toast.success(isEdit ? "Changes saved" : `${body.name} added`);
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
        // 409 is the unique constraint on cars.plate — put it on the field that
        // caused it, not in a footer nobody connects to the input.
        //
        // ponytail: car.controller.js does NOT map Prisma's P2002 to a 409 the
        // way room.controller.js does, so today a duplicate plate arrives as a
        // 500 and falls through to `root` below. This branch is correct and
        // costs two lines; it lights up the moment the controller is fixed.
        setError(error.status === 409 ? "plate" : "root", {
          type: "server",
          message:
            error.status === 409
              ? "A car with that plate already exists"
              : error.message,
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit car" : "New car"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Renaming a car renames it on the availability grid too, including on bookings already made."
              : "The car becomes bookable by everyone as soon as it is saved."}
          </DialogDescription>
        </DialogHeader>

        <form id="car-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Toyota Hiace"
              aria-invalid={!!errors.name}
              {...field("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plate">Plate</Label>
            {/*
              tabular-nums, NOT a mono font. No monospace family carries Thai,
              so `1กท 5678` would set its digits and its Thai glyphs in two
              different faces inside one string — STITCH-PROMPTS.md says so
              explicitly, naming licence plates as the example.
            */}
            <Input
              id="plate"
              placeholder="1กท 5678"
              className="tabular-nums"
              aria-invalid={!!errors.plate}
              {...field("plate")}
            />
            {errors.plate ? (
              <p className="text-xs text-destructive">{errors.plate.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Must be unique across the fleet.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="seats">Seats</Label>
            <Input
              id="seats"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="4"
              aria-invalid={!!errors.seats}
              {...field("seats")}
            />
            {errors.seats && (
              <p className="text-xs text-destructive">{errors.seats.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Basement car park"
              aria-invalid={!!errors.location}
              {...field("location")}
            />
            {errors.location ? (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optional, and free text — there is no depot table, so the Cars
                page builds its location filter from whatever is typed here.
                Match the wording of the other cars.
              </p>
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
          <Button type="submit" form="car-form" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {isEdit ? "Save changes" : "Create car"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CarFormDialog;
