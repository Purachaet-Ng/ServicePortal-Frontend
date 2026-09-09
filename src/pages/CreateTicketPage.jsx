import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDepartments } from "@/api/departments.api";
import { uploadTicketAttachments } from "@/api/tickets.api";
import { getRequestTypes } from "@/api/requestTypes.api";
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
  // 1. Selection state
  const [selectedRequestTypeId, setSelectedRequestTypeId] = useState("");
  const [files, setFiles] = useState([]);

  // 2. API queries
  // Department
  const departmentsQuery = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => getDepartments(),
    staleTime: 10 * 60_000,
  });

  // Request type
  const requestTypesQuery = useQuery({
    queryKey: ["departments", departmentId, "request-types"],
    queryFn: () => getRequestTypes(departmentId),
    enabled: !!departmentId,
  });

  const { mutateAsync: createTicket, isPending: isSubmitting } =
    useCreateTicket();

  // 3. Derived values
  const departments = departmentsQuery.data?.departments ?? EMPTY;
  const requestTypes = requestTypesQuery.data?.data ?? EMPTY;
  const optionsError = departmentsQuery.error ?? requestTypesQuery.error;

  const requestType = requestTypes.find(
    ({ id }) => String(id) === selectedRequestTypeId,
  );
  const formSchema = requestType?.formSchema ?? EMPTY;
  const schema = useMemo( () => createTicketSchema.extend({
        custom_fields: zodFromFormSchema(formSchema),
      }),
    [formSchema],
  );

  // 4. Form setup
  const { register, control, handleSubmit, resetField, setError, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      requestTypeId: "",
      title: "",
      description: "",
      priority: "MEDIUM",
      custom_fields: {},
    },
  });

  useEffect(() => {
    setValue("custom_fields", defaultsFromFormSchema(formSchema));
  }, [formSchema, setValue]);

  const noRequestTypes = requestTypesQuery.data?.data?.length === 0;

  // 5. Selection changes
  const selectDepartment = (id) => {
    setDepartmentId(id);
    setSelectedRequestTypeId("");
    resetField("requestTypeId");
  };

  const selectRequestType = (id) => {
    setSelectedRequestTypeId(id);
    setValue("requestTypeId", id, { shouldValidate: true });
  };

  // 6. Submit ticket
  const onSubmit = async (values) => {
    try {
      const ticket = await createTicket({
        requestTypeId: values.requestTypeId,
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        customFields: values.custom_fields,
      });

      // The ticket already exists at this point. An upload failure must not
      // read as "your ticket was not submitted" — it was.
      if (files.length) {
        try {
          await uploadTicketAttachments(ticket.id, files);
        } catch (error) {
          toast.error(`Ticket submitted, but the files failed: ${error.message}`);
          navigate(`/tickets/${ticket.id}`);
          return;
        }
      }

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
                <Label htmlFor="department">Department</Label>
                <Select
                  value={departmentId}
                  onValueChange={selectDepartment}
                  disabled={
                    departmentsQuery.isPending || departmentsQuery.isError
                  }
                >
                  <SelectTrigger id="department" className="w-full">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-type">Request type</Label>
                <Select
                  value={selectedRequestTypeId}
                  onValueChange={selectRequestType}
                  disabled={
                    !departmentId ||
                    requestTypesQuery.isPending ||
                    requestTypesQuery.isError ||
                    noRequestTypes
                  }
                >
                  <SelectTrigger
                    id="request-type"
                    className="w-full"
                    aria-invalid={!!errors.requestTypeId}
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
                {errors.requestTypeId && (
                  <p className="text-xs text-destructive">
                    {errors.requestTypeId.message}
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
              <Label htmlFor="title">Title</Label>
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

            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments</Label>
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={(event) => setFiles([...event.target.files])}
              />
              <p className="text-xs text-muted-foreground">
                Up to 5 files, 5MB each. PDF, images, text, Word, or Excel.
              </p>
            </div>

            <div className="space-y-2 sm:max-w-xs">
              <Label htmlFor="priority">Priority</Label>
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
                <DynamicForm schema={formSchema} control={control} />
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-5">
              <Button type="button" variant="outline" asChild>
                <Link to="/tickets">Cancel</Link>
              </Button>
              <Button type="submit" disabled={!requestType || isSubmitting}>
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
