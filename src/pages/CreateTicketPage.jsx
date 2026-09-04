import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import DynamicForm from "@/components/ticket/DynamicForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import {
  getMockDepartments,
  getMockRequestTypes,
} from "@/data/createTicket.mock";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { defaultsFromFormSchema, zodFromFormSchema } from "@/lib/formSchema";
import { createTicketSchema } from "@/validators/ticket.validator";

const EMPTY = [];

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [departmentId, setDepartmentId] = useState("");
  const [requestTypeId, setRequestTypeId] = useState("");

  const departmentsQuery = useQuery({
    queryKey: ["departments", "list"],
    queryFn: getMockDepartments,
    staleTime: 10 * 60_000,
  });
  const requestTypesQuery = useQuery({
    queryKey: ["departments", departmentId, "request-types"],
    queryFn: () => getMockRequestTypes(departmentId),
    enabled: Boolean(departmentId),
  });

  const departments = departmentsQuery.data?.departments ?? EMPTY;
  const requestTypes = requestTypesQuery.data?.requestTypes ?? EMPTY;
  const selectedRequestType = useMemo(
    () => requestTypes.find((type) => String(type.id) === requestTypeId),
    [requestTypes, requestTypeId],
  );
  const formSchema = selectedRequestType?.formSchema ?? EMPTY;
  const validationSchema = useMemo(
    () =>
      createTicketSchema.extend({
        custom_fields: zodFromFormSchema(formSchema),
      }),
    [formSchema],
  );

  const {
    register,
    control,
    handleSubmit,
    resetField,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(validationSchema),
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
    Boolean(departmentId) &&
    requestTypesQuery.isSuccess &&
    requestTypes.length === 0;
  const optionsError = departmentsQuery.error ?? requestTypesQuery.error;

  const onDepartmentChange = (value) => {
    setDepartmentId(value);
    setRequestTypeId("");
    resetField("request_type_id", { defaultValue: "" });
    setValue("custom_fields", {});
  };

  const onRequestTypeChange = (value) => {
    setRequestTypeId(value);
    setValue("request_type_id", value, { shouldValidate: true });
  };

  const onSubmit = () => {
    // TODO: Replace this mock success with useCreateTicket().mutate({
    //   requestTypeId: values.request_type_id,
    //   title: values.title,
    //   description: values.description || undefined,
    //   priority: values.priority,
    //   customFields: values.custom_fields,
    // }) when POST /api/tickets is ready.
    toast.success("Mock ticket submitted");
    navigate("/tickets");
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
                  onValueChange={onDepartmentChange}
                  disabled={
                    departmentsQuery.isPending || departmentsQuery.isError
                  }
                >
                  <SelectTrigger id="department" className="w-full">
                    <SelectValue
                      placeholder={
                        departmentsQuery.isPending
                          ? "Loading…"
                          : "Choose a department"
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
                  onValueChange={onRequestTypeChange}
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
                    aria-invalid={!!errors.request_type_id}
                  >
                    <SelectValue
                      placeholder={
                        requestTypesQuery.isPending
                          ? "Loading…"
                          : noRequestTypes
                            ? "No request types"
                            : "Choose a request type"
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

            {selectedRequestType && (
              <div className="space-y-5 border-t pt-6">
                <div>
                  <h2 className="font-medium">{selectedRequestType.name}</h2>
                  {selectedRequestType.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedRequestType.description}
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
              <Button type="submit" disabled={!selectedRequestType}>
                Submit ticket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateTicketPage;
