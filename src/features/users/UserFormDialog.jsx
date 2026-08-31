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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ROLE_OPTIONS } from "@/lib/constants";
import { createUserSchema, updateUserSchema } from "@/validators/user.validator";
import { useCreateUser, useUpdateUser } from "./useUsers";

/**
 * One dialog, two jobs: `user` present means edit, absent means create.
 *
 * They are the same form minus three fields, and splitting them in two means
 * every future field has to be added twice. What differs is declared once, at
 * the top, rather than branching all the way down.
 *
 * Edit deliberately has no email, password, or role input: the backend`s
 * updateUserSchema accepts none of them, so those inputs would collect values
 * and silently throw them away. Role has its own control in the table.
 */

/** Radix Select cannot hold null, and "" is what the schema expects for none. */
const NO_DEPARTMENT = "__none__";

export function UserFormDialog({ open, onOpenChange, user, departments = [] }) {
  const isEdit = Boolean(user);

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const mutation = isEdit ? updateMutation : createMutation;

  // Reset on every open, not just on mount: the dialog stays mounted between
  // rows, so without this, editing Ann and then Bob would show Ann`s values.
  useEffect(() => {
    if (!open) return;
    reset({
      firstname: user?.firstname ?? "",
      lastname: user?.lastname ?? "",
      phone: user?.phone ?? "",
      departmentId: user?.departmentId ?? "",
      ...(isEdit ? {} : { email: "", password: "", role: "STAFF" }),
    });
  }, [open, user, isEdit, reset]);

  const departmentValue = watch("departmentId");
  const roleValue = watch("role");

  const onSubmit = (values) => {
    // "" is the untouched-input value for both of these. The backend`s phone
    // regex would reject it and its departmentId expects a number or null, so
    // neither may travel as an empty string.
    const body = {
      ...values,
      phone: values.phone || undefined,
      departmentId: values.departmentId === "" ? null : values.departmentId,
    };

    mutation.mutate(isEdit ? { id: user.id, ...body } : body, {
      onSuccess: () => {
        toast.success(isEdit ? "Changes saved" : "Account created");
        onOpenChange(false);
      },
      onError: (error) => {
        // Server validation belongs ON the fields, never in a toast — the admin
        // needs to see which input to fix (WORKFLOW.md §A3).
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
        setError(error.status === 409 ? "email" : "root", {
          type: "server",
          message:
            error.status === 409
              ? "That email is already registered"
              : error.message,
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Name, phone, and department. Role is changed from the table."
              : "Creates the account directly — nobody is emailed, so pass the password on yourself."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="user-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstname">First name</Label>
              <Input
                id="firstname"
                aria-invalid={!!errors.firstname}
                {...field("firstname")}
              />
              {errors.firstname && (
                <p className="text-xs text-destructive">
                  {errors.firstname.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastname">Last name</Label>
              <Input
                id="lastname"
                aria-invalid={!!errors.lastname}
                {...field("lastname")}
              />
              {errors.lastname && (
                <p className="text-xs text-destructive">
                  {errors.lastname.message}
                </p>
              )}
            </div>
          </div>

          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  aria-invalid={!!errors.email}
                  {...field("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  type="password"
                  aria-invalid={!!errors.password}
                  {...field("password")}
                />
                {errors.password ? (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    At least 6 characters. There is no reset flow yet, so give it
                    to the person somewhere they can actually read it.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="08X XXX XXXX"
              aria-invalid={!!errors.phone}
              {...field("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={
                  departmentValue === "" || departmentValue == null
                    ? NO_DEPARTMENT
                    : String(departmentValue)
                }
                onValueChange={(value) =>
                  setValue("departmentId", value === NO_DEPARTMENT ? "" : value, {
                    shouldValidate: true,
                  })
                }
                disabled={departments.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT}>No department</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  GET /api/departments is not mounted yet, so there is nothing to
                  choose from.
                </p>
              )}
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={roleValue ?? "STAFF"}
                  onValueChange={(value) =>
                    setValue("role", value, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
          <Button type="submit" form="user-form" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {isEdit ? "Save changes" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserFormDialog;
