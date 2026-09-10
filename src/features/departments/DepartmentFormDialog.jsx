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

import { departmentSchema } from "@/validators/department.validator";

import {
  useCreateDepartment,
  useUpdateDepartment,
} from "./useDepartments";

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
}) {
  const isEdit = Boolean(department);

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(departmentSchema),
  });

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();

  const mutation = isEdit
    ? updateMutation
    : createMutation;

  /**
   * Reset form whenever dialog opens
   */
  useEffect(() => {
    if (!open) return;

    reset({
      name: department?.name ?? "",
    });
  }, [open, department, reset]);

  /**
   * Submit form
   */
  const onSubmit = (values) => {
    const body = {
      name: values.name,
    };

    mutation.mutate(
      isEdit
        ? {
            id: department.id,
            ...body,
          }
        : body,
      {
        onSuccess: () => {
          toast.success(
            isEdit
              ? "Changes saved"
              : `${body.name} created`
          );

          onOpenChange(false);
        },

        onError: (error) => {
          /**
           * Server validation errors
           */
          if (error.errors?.length) {
            for (const detail of error.errors) {
              if (detail.field) {
                setError(detail.field, {
                  type: "server",
                  message: detail.message,
                });
              }
            }

            return;
          }

          /**
           * Duplicate department name
           */
          setError(
            error.status === 409
              ? "name"
              : "root",
            {
              type: "server",
              message:
                error.status === 409
                  ? "A department with that name already exists"
                  : error.message,
            }
          );
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">

        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Edit department"
              : "New department"}
          </DialogTitle>

          <DialogDescription>
            {isEdit
              ? "Update the department information."
              : "Create a new department."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="department-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >

          <div className="space-y-2">
            <Label htmlFor="name">
              Department name
            </Label>

            <Input
              id="name"
              placeholder="Human Resources"
              aria-invalid={!!errors.name}
              {...field("name")}
            />

            {errors.name && (
              <p className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">
              {errors.root.message}
            </p>
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

          <Button
            type="submit"
            form="department-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner />}

            {isEdit
              ? "Save changes"
              : "Create department"}
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

export default DepartmentFormDialog;