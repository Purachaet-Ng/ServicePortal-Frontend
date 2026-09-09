import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getDepartments } from "@/api/departments.api";
import PageHeader from "@/components/common/PageHeader";
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
import { useCreateRequestType } from "@/features/requestTypes/useRequestType";
import { useUsers } from "@/features/users/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/constants";
import { applyServerError } from "@/lib/formErrors";
import {
  blankField,
  createRequestTypeFormSchema,
  slugifyKey,
  toFormSchema,
} from "@/validators/requestType.validator";

const LIST_PATH = "/admin/department/request-types";
const EMPTY = [];

/**
 * Author a request type's form_schema (WORKFLOW.md A3). A row builder rather
 * than a raw JSON textarea: the admins who define request types are HR and
 * facilities staff, not people who will debug a trailing comma.
 *
 * The right-hand column renders the very same DynamicForm the requester will
 * see on /tickets/new, off the rows being edited — so the preview cannot drift
 * from the real thing, because it IS the real thing.
 */
export function CreateRequestTypePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { departmentId: myDepartmentId, role } = useAuth();
  const isSystemAdmin = role === ROLES.ADMIN_SYSTEM;

  // The list page passes the department it was filtered to. A system admin
  // viewing "All departments" arrives without one and picks it here.
  const initialDepartmentId =
    searchParams.get("department") ??
    (myDepartmentId != null ? String(myDepartmentId) : "");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
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
    enabled: isSystemAdmin,
  });

  const departments = useMemo(() => {
    const raw = departmentsQuery.data;
    return raw?.departments ?? raw?.data ?? (Array.isArray(raw) ? raw : EMPTY);
  }, [departmentsQuery.data]);

  // Everyone in the department is a candidate default assignee. GET /users
  // returns the whole table in one response and useUsers already unwraps it —
  // /users/assignable is not used here, see the note in api/users.api.js.
  const { data: users = EMPTY } = useUsers();
  const departmentUsers = useMemo(
    () =>
      users.filter(
        (user) => String(user.departmentId ?? "") === String(departmentId),
      ),
    [users, departmentId],
  );

  const createMutation = useCreateRequestType();

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
    createMutation.mutate(
      {
        departmentId: values.departmentId,
        name: values.name,
        description: values.description || undefined,
        formSchema: toFormSchema(values.formSchema),
        defaultAssigneeId: values.defaultAssigneeId
          ? Number(values.defaultAssigneeId)
          : null,
      },
      {
        onSuccess: () => {
          toast.success(`${values.name} created`);
          navigate(LIST_PATH);
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

  const fieldsError = errors.formSchema?.root ?? errors.formSchema;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="New request type"
        description="Requesters pick a request type, then fill in the fields you define here."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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
                  {isSystemAdmin ? (
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
                      Your own department
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
          <Button type="button" variant="outline" asChild>
            <Link to={LIST_PATH}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Spinner />}
            Create request type
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateRequestTypePage;
