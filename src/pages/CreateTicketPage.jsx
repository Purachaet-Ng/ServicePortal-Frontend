import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDepartments } from "@/api/departments.api";
import { getRequestTypes } from "@/api/requestTypes.api";
import { getAssignableUsers } from "@/api/users.api";
import PageHeader from "@/components/common/PageHeader";
import DynamicForm from "@/components/ticket/DynamicForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTicket } from "@/features/tickets/useTickets";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { defaultsFromFormSchema, zodFromFormSchema } from "@/lib/formSchema";
import { createTicketSchema } from "@/validators/ticket.validator";

const EMPTY = [];

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [departmentId, setDepartmentId] = useState("");
  const [requestTypeId, setRequestTypeId] = useState("");

  // Queries
  const {
    data: departmentsData,
    isPending: departmentsPending,
    isError: departmentsFailed,
    error: departmentsError,
  } = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => getDepartments(),
    staleTime: 10 * 60_000,
  });

  const {
    data: requestTypesData,
    isPending: requestTypesPending,
    isError: requestTypesFailed,
    error: requestTypesError,
    isSuccess: requestTypesLoaded,
  } = useQuery({
    queryKey: ["departments", departmentId, "request-types"],
    queryFn: () => getRequestTypes(departmentId),
    enabled: !!departmentId,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", "assignable", departmentId],
    queryFn: () => getAssignableUsers(departmentId),
    enabled: !!departmentId,
  });

  const { mutateAsync: createTicket, isPending: isSubmitting } =
    useCreateTicket();

  // Data
  const departments = departmentsData?.departments ?? EMPTY;
  const requestTypes = requestTypesData?.data ?? EMPTY;
  const users = usersData?.user ?? EMPTY;
  const optionsError = departmentsError ?? requestTypesError;

  // Schema
  const requestType = requestTypes.find(
    ({ id }) => String(id) === requestTypeId,
  );
  const formSchema = requestType?.formSchema ?? EMPTY;
  const schema = useMemo(
    () =>
      createTicketSchema.extend({
        custom_fields: zodFromFormSchema(formSchema),
      }),
    [formSchema],
  );

  // Form
  const {
    register,
    control,
    handleSubmit,
    resetField,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      request_type_id: "",
      title: "",
      description: "",
      priority: "MEDIUM",
      custom_fields: {},
    },
  });

  useEffect(() => {
    setValue("custom_fields", defaultsFromFormSchema(formSchema));
  }, [formSchema, setValue]);

  const noRequestTypes =
    !!departmentId && requestTypesLoaded && requestTypes.length === 0;

  // Selection
  const selectDepartment = (id) => {
    setDepartmentId(id);
    setRequestTypeId("");
    resetField("request_type_id");
    setValue("custom_fields", {});
  };

  const selectRequestType = (id) => {
    setRequestTypeId(id);
    setValue("request_type_id", id, { shouldValidate: true });
  };

  // Submit
  const onSubmit = async (values) => {
    try {
      const ticket = await createTicket({
        requestTypeId: values.request_type_id,
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        customFields: values.custom_fields,
      });

      toast.success("Ticket submitted");
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      if (!error.errors?.length) {
        toast.error(error.message);
        return;
      }

      error.errors.forEach(({ field, message }) => {
        setError(field, { message });
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New ticket"
        description="Choose a department and request type, then describe what you need."
      />

      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
          <CardDescription>
            Fields marked with an asterisk are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={departmentId}
                  onValueChange={selectDepartment}
                  disabled={departmentsPending || departmentsFailed}
                >
                  <SelectTrigger id="department" className="w-full">
                    <SelectValue
                      placeholder={
                        departmentsPending
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-type">Request type *</Label>
                <Select
                  value={requestTypeId}
                  onValueChange={selectRequestType}
                  disabled={
                    !departmentId ||
                    requestTypesPending ||
                    requestTypesFailed ||
                    noRequestTypes
                  }
                >
                  <SelectTrigger
                    id="request-type"
                    className="w-full"
                    aria-invalid={!!errors.request_type_id}
                  >
                    <SelectValue
                      placeholder={
                        !departmentId
                          ? "Select a department first"
                          : noRequestTypes
                            ? "No request types"
                            : "Select a request type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {requestTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.request_type_id && (
                  <p className="text-xs text-destructive">
                    {errors.request_type_id.message}
                  </p>
                )}
              </div>
            </div>

            {optionsError && (
              <Alert variant="destructive">
                <AlertTitle>Could not load ticket options</AlertTitle>
                <AlertDescription>{optionsError.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="resize-none"
                rows={5}
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:max-w-xs">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) =>
                  setValue("priority", value, { shouldValidate: true })
                }
              >
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requestType && (
              <div className="space-y-5 border-t pt-6">
                <div>
                  <h2 className="font-medium">{requestType.name}</h2>
                  {requestType.description && (
                    <p className="text-sm text-muted-foreground">
                      {requestType.description}
                    </p>
                  )}
                </div>
                <DynamicForm
                  schema={formSchema}
                  control={control}
                  users={users}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-5">
              <Button type="button" variant="outline" asChild>
                <Link to="/tickets">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={!requestType || isSubmitting}
              >
                {isSubmitting && <Spinner />}
                Submit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateTicketPage;
