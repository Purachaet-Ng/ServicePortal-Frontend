import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { getDepartments } from "@/api/departments.api";
import SchemaFieldRow from "@/components/requestType/SchemaFieldRow";
import DynamicForm from "@/components/ticket/DynamicForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateRequestType,
  useRequestType,
  useUpdateRequestType,
} from "@/features/requestTypes/useRequestType";
import { useUsers } from "@/features/users/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/constants";
import { applyServerError } from "@/lib/formErrors";
import {
  blankField,
  createRequestTypeFormSchema,
  slugifyKey,
  toFormRows,
  toFormSchema,
} from "@/validators/requestType.validator";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import useConfirmSubmit from "@/hooks/useConfirmSubmit";

const EMPTY = [];

/**
 * Author a request type's form_schema (WORKFLOW.md A3). A row builder rather
 * than a raw JSON textarea: the admins who define request types are HR and
 * facilities staff, not people who will debug a trailing comma.
 *
 * The right-hand column renders the very same DynamicForm the requester will
 * see on /tickets/new, off the rows being edited — so the preview cannot drift
 * from the real thing, because it IS the real thing.
 *
 * One form, two jobs: `requestTypeId` present means edit that type, absent
 * means create a new one. The page at /request-types/new and the edit dialog on
 * the list both render this — the field builder is far too much markup to keep
 * a second copy of.
 */
export function RequestTypeForm({
  requestTypeId = null,
  initialDepartmentId = "",
  onCancel,
  onDone,
}) {
  const isEdit = requestTypeId != null;
  const { role } = useAuth();
  const isSystemAdmin = role === ROLES.ADMIN_SYSTEM;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createRequestTypeFormSchema),
    defaultValues: {
      departmentId: initialDepartmentId,
      name: "",
      description: "",
      defaultAssigneeId: "",
      formSchema: [blankField()],
    },
  });

  const existingQuery = useRequestType(requestTypeId);
  const existing = existingQuery.data;

  // Fill the form once the type arrives. Keyed on the object react-query hands
  // back, so a background refetch that changes nothing does not stamp over
  // whatever the admin has typed since.
  useEffect(() => {
    if (!existing) return;
    reset({
      departmentId: String(existing.departmentId ?? ""),
      name: existing.name ?? "",
      description: existing.description ?? "",
      defaultAssigneeId:
        existing.defaultAssigneeId != null
          ? String(existing.defaultAssigneeId)
          : "",
      formSchema: toFormRows(existing.formSchema),
    });
  }, [existing, reset]);

  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "formSchema",
  });

  // useWatch, not watch(): watch() re-renders off the form's own subscription,
  // which useFieldArray does not fire for a value edited inside a row, so the
  // preview and the per-row Options box would both go stale.
  const departmentId = useWatch({ control, name: "departmentId" });
  const defaultAssigneeId = useWatch({ control, name: "defaultAssigneeId" });
  const rows = useWatch({ control, name: "formSchema" });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => getDepartments(),
    staleTime: 10 * 60_000,
    enabled: isSystemAdmin || isEdit,
  });

  const departments = useMemo(() => {
    const raw = departmentsQuery.data;
    return raw?.departments ?? raw?.data ?? (Array.isArray(raw) ? raw : EMPTY);
  }, [departmentsQuery.data]);

  // Everyone in the department is a candidate default assignee.
  // /users/assignable is not used here, see the note in api/users.api.js.
  //
  // limit 100 = the backend's cap. WITHOUT it GET /users sends 20 rows, the
  // department's real assignee can be missing from the options, and the select
  // then shows "Nobody in particular" and saves that over them.
  const { data: users = EMPTY, isPending: usersPending } = useUsers({
    limit: 100,
  });
  const departmentUsers = useMemo(
    () =>
      users.filter(
        (user) => String(user.departmentId ?? "") === String(departmentId),
      ),
    [users, departmentId],
  );

  const createMutation = useCreateRequestType();
  const updateMutation = useUpdateRequestType();
  const mutation = isEdit ? updateMutation : createMutation;

  // The preview needs a form of its own to hold whatever gets typed into it
  // while the admin is looking. Nothing is ever read back out.
  const preview = useForm();
  const previewSchema = useMemo(() => {
    const seen = new Set();
    return toFormSchema(rows).filter((field) => {
      // A half-typed row is not a preview yet, and a duplicated key would make
      // React complain about the list long before zod reports it on submit.
      if (!field.key || !field.label || seen.has(field.key)) return false;
      seen.add(field.key);
      return true;
    });
  }, [rows]);

  // Nobody wants to type "position_title" after typing "Position title". Only
  // fills a key the admin has not written themselves.
  const fillKeyFromLabel = (index) => (event) => {
    if (getValues(`formSchema.${index}.key`)) return;
    const key = slugifyKey(event.target.value);
    if (key) setValue(`formSchema.${index}.key`, key);
  };

  const onSubmit = (values) => {
    mutation.mutate(
      {
        // PATCH /request-types/:id takes the id, not a department — the type
        // does not move between departments here.
        ...(isEdit
          ? { id: requestTypeId }
          : { departmentId: values.departmentId }),
        name: values.name,
        // null, not undefined, when editing: PATCH is partial, so an omitted
        // description would leave the old one in place after it was cleared.
        description: values.description || (isEdit ? null : undefined),
        formSchema: toFormSchema(values.formSchema),
        defaultAssigneeId: values.defaultAssigneeId
          ? Number(values.defaultAssigneeId)
          : null,
      },
      {
        onSuccess: () => {
          toast.success(`${values.name} ${isEdit ? "saved" : "created"}`);
          onDone?.();
        },
        onError: (error) =>
          applyServerError(error, {
            setError,
            // No conflict banner on this screen: request type names are not
            // unique, so a 409 is not something this endpoint sends.
            setConflict: ({ message }) =>
              setError("root", { type: "server", message }),
            fields: ["name", "description", "formSchema", "defaultAssigneeId"],
          }),
      },
    );
  };

  // Every write on this form goes through a confirm step. Above the early
  // return below — a hook cannot sit behind one.
  const { confirm, dialogProps } = useConfirmSubmit(onSubmit);

  const fieldsError = errors.formSchema?.root ?? errors.formSchema;

  // Nothing renders until BOTH the type and the users are here. A Select whose
  // current value matches none of its items yet does not just show the
  // placeholder — Radix resets the value to the placeholder's, so an edit
  // opened a beat too early would quietly clear the default assignee.
  if (usersPending || (isEdit && existingQuery.isPending)) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(confirm)} className="space-y-6" noValidate>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
                <CardDescription>
                  A request type belongs to one department, and only that
                  department can manage it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  {isSystemAdmin && !isEdit ? (
                    <Select
                      value={departmentId}
                      onValueChange={(value) =>
                        setValue("departmentId", value, {
                          shouldValidate: true,
                        })
                      }
                      disabled={departmentsQuery.isPending}
                    >
                      <SelectTrigger
                        id="department"
                        className="w-full"
                        aria-invalid={!!errors.departmentId}
                      >
                        <SelectValue
                          placeholder={
                            departmentsQuery.isPending
                              ? "Loading…"
                              : "Select a department"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem
                            key={department.id}
                            value={String(department.id)}
                          >
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p id="department" className="text-sm">
                      {isEdit
                        ? // A type does not move between departments — the
                          // tickets already filed under it would follow.
                          (departments.find(
                            (department) =>
                              String(department.id) === String(departmentId),
                          )?.name ?? "This type's department")
                        : "Your own department"}
                    </p>
                  )}
                  {errors.departmentId && (
                    <p className="text-xs text-destructive">
                      {errors.departmentId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Recruit employee"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    className="resize-none"
                    placeholder="Open a role and start the hiring process."
                    aria-invalid={!!errors.description}
                    {...register("description")}
                  />
                  {errors.description ? (
                    <p className="text-xs text-destructive">
                      {errors.description.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      One line telling requesters when to pick this type.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee">Default assignee</Label>
                  <Select
                    value={defaultAssigneeId || "none"}
                    onValueChange={(value) =>
                      setValue(
                        "defaultAssigneeId",
                        value === "none" ? "" : value,
                      )
                    }
                    disabled={departmentUsers.length === 0}
                  >
                    <SelectTrigger id="assignee" className="w-full">
                      <SelectValue
                        placeholder={
                          departmentUsers.length === 0
                            ? "No one to assign yet"
                            : "Nobody in particular"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nobody in particular</SelectItem>
                      {departmentUsers.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {[user.firstname, user.lastname]
                            .filter(Boolean)
                            .join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    New tickets of this type land on this person. They can still
                    be reassigned.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form fields</CardTitle>
                <CardDescription>
                  These appear on the ticket form, in this order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <SchemaFieldRow
                    key={field.id}
                    index={index}
                    register={register}
                    control={control}
                    type={rows?.[index]?.type}
                    error={errors.formSchema?.[index]}
                    onLabelBlur={fillKeyFromLabel(index)}
                    onMoveUp={() => swap(index, index - 1)}
                    onMoveDown={() => swap(index, index + 1)}
                    onRemove={() => remove(index)}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                    canRemove={fields.length > 1}
                  />
                ))}

                {fieldsError?.message && (
                  <p className="text-xs text-destructive">
                    {fieldsError.message}
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append(blankField())}
                >
                  <Plus className="size-4" />
                  Add field
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="lg:sticky lg:top-6">
              <CardHeader>
                <CardTitle>Live preview</CardTitle>
                <CardDescription>
                  This is what requesters will see.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {previewSchema.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Give a field a label and a key to see it here.
                  </p>
                ) : (
                  // Dimmed, inert and hidden from screen readers: this is a
                  // picture of a form, not a second copy to tab through.
                  <div
                    aria-hidden="true"
                    className="pointer-events-none select-none opacity-90"
                  >
                    <DynamicForm
                      schema={previewSchema}
                      control={preview.control}
                      users={departmentUsers}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {errors.root && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}

        <div className="flex justify-end gap-2 border-t pt-5">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {isEdit ? "Save changes" : "Create request type"}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        {...dialogProps}
        variant="default"
        title={isEdit ? "Save changes?" : "Create this request type?"}
        description={
          isEdit
            ? "New tickets use these fields. Tickets already filed keep the answers they were submitted with."
            : "Requesters can pick this type as soon as it exists."
        }
        confirmLabel={isEdit ? "Save" : "Create request type"}
        isPending={mutation.isPending}
      />
    </>
  );
}

export default RequestTypeForm;
