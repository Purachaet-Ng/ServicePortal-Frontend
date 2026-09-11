import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import DatePicker from "react-datepicker";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEvent, useEventDepartments, useEventInvitees } from "@/features/events/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { applyServerError } from "@/lib/formErrors";
import { fullName } from "@/lib/format";
import { createEventSchema } from "@/validators/event.validator";

export function CreateEventPage() {
  const navigate = useNavigate();
  const { role, departmentId } = useAuth();
  const isDepartmentAdmin = role === "ADMIN_DEPT";
  const [selectedInvitees, setSelectedInvitees] = useState([]);
  const [inviteeTab, setInviteeTab] = useState("choose");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      startTime: "",
      endTime: "",
      departmentId:
        isDepartmentAdmin && departmentId ? String(departmentId) : "",
      userIds: [],
    },
  });

  const selectedDepartmentId = watch("departmentId");
  const selectedUserIds = watch("userIds");

  const departmentsQuery = useEventDepartments();
  const inviteesQuery = useEventInvitees(selectedDepartmentId);

  const createEvent = useCreateEvent();
  const isPending = createEvent.isPending;

  const departments = departmentsQuery.data ?? [];
  const invitees = inviteesQuery.data ?? [];
  const departmentName = (id) =>
    departments.find((department) => department.id === id)?.name ?? "—";
  const currentInviteeIds = invitees.map(({ id }) => id);
  const allCurrentSelected =
    invitees.length > 0 &&
    currentInviteeIds.every((id) => selectedUserIds.includes(id));

  const changeDepartment = (value) => {
    setValue("departmentId", value);
    setInviteeTab("choose");
  };

  const toggleInvitee = (user, checked) => {
    const userIds = checked
      ? [...selectedUserIds, user.id]
      : selectedUserIds.filter((id) => id !== user.id);

    setValue("userIds", userIds);

    setSelectedInvitees((selected) =>
      checked
        ? [...selected, user]
        : selected.filter(({ id }) => id !== user.id),
    );
  };

  const selectDepartmentInvitees = () => {
    const selectedIds = new Set(selectedUserIds);
    const userIds = [
      ...selectedUserIds,
      ...currentInviteeIds.filter((id) => !selectedIds.has(id)),
    ];

    setValue("userIds", userIds);
    setSelectedInvitees((selected) => {
      const selectedIds = new Set(selected.map(({ id }) => id));
      return [
        ...selected,
        ...invitees.filter(({ id }) => !selectedIds.has(id)),
      ];
    });
  };

  const resetInvitees = () => {
    setValue("userIds", []);
    setSelectedInvitees([]);
  };

  const onSubmit = async (values) => {
    try {
      const created = await createEvent.mutateAsync({
        title: values.title,
        description: values.description.trim() || null,
        location: values.location.trim() || null,
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
        userIds: values.userIds,
      });

      toast.success("Event created and attendees invited");
      navigate(`/events/${created.event.id}`);
    } catch (error) {
      applyServerError(error, {
        setError,
        fields: [
          "title",
          "description",
          "location",
          "startTime",
          "endTime",
          "departmentId",
          "userIds",
        ],
      });
    }
  };

  return (
    <>
      <PageHeader
        title="New event"
        className="mx-auto max-w-3xl"
        description="Schedule an event and invite staff."
      />

      <Card className="mx-auto max-w-3xl border-t-[3px] border-t-primary">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register("title")}
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="resize-none"
                {...register("description")}
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Meeting Room A"
                {...register("location")}
                aria-invalid={Boolean(errors.location)}
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start time</Label>
                <Controller
                  name="startTime"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value ? new Date(field.value) : null}
                      onChange={(date) =>
                        field.onChange(
                          date ? format(date, "yyyy-MM-dd'T'HH:mm") : "",
                        )
                      }
                      onBlur={field.onBlur}
                      showTimeSelect
                      timeIntervals={5}
                      timeFormat="HH:mm"
                      dateFormat="dd/MM/yyyy HH:mm"
                      wrapperClassName="w-full"
                      customInput={
                        <Input
                          id="startTime"
                          aria-invalid={Boolean(errors.startTime)}
                        />
                      }
                    />
                  )}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End time</Label>
                <Controller
                  name="endTime"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value ? new Date(field.value) : null}
                      onChange={(date) =>
                        field.onChange(
                          date ? format(date, "yyyy-MM-dd'T'HH:mm") : "",
                        )
                      }
                      onBlur={field.onBlur}
                      showTimeSelect
                      timeIntervals={5}
                      timeFormat="HH:mm"
                      dateFormat="dd/MM/yyyy HH:mm"
                      wrapperClassName="w-full"
                      customInput={
                        <Input
                          id="endTime"
                          aria-invalid={Boolean(errors.endTime)}
                        />
                      }
                    />
                  )}
                />
                {errors.endTime && (
                  <p className="text-sm text-destructive">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>

            <Tabs
              value={inviteeTab}
              onValueChange={setInviteeTab}
              className="gap-5"
            >
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <p className="text-sm text-muted-foreground">
                  Choose a department to view its staff. Selected people stay
                  saved when you switch departments.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={selectedDepartmentId}
                    onValueChange={changeDepartment}
                    disabled={
                      departmentsQuery.isPending ||
                      departmentsQuery.isError
                    }
                  >
                    <SelectTrigger
                      id="department"
                      className="w-90"
                      aria-invalid={Boolean(errors.departmentId)}
                    >
                      <SelectValue
                        placeholder={
                          departmentsQuery.isPending
                            ? "Loading…"
                            : "Select department"
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

                <input type="hidden" {...register("departmentId")} />

                {errors.departmentId && (
                  <p className="text-sm text-destructive">
                    {errors.departmentId.message}
                  </p>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Invitees</legend>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TabsList>
                    <TabsTrigger value="selected">
                      Selected ({selectedInvitees.length})
                    </TabsTrigger>
                  </TabsList>

                  {selectedDepartmentId && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!invitees.length || allCurrentSelected}
                        onClick={selectDepartmentInvitees}
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!selectedInvitees.length}
                        onClick={resetInvitees}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>

                <TabsContent value="choose" className="mt-3">
                  {!selectedDepartmentId ? (
                    <p className="text-sm text-muted-foreground">
                      Select a department first.
                    </p>
                  ) : inviteesQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">
                      Loading invitees…
                    </p>
                  ) : inviteesQuery.isError ? (
                    <p className="text-sm text-destructive">
                      {inviteesQuery.error.message}
                    </p>
                  ) : invitees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No eligible users found in this department.
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-3">
                      {invitees.map((user) => (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                        >
                          <Checkbox
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={(checked) =>
                              toggleInvitee(user, checked === true)
                            }
                          />
                          <span className="grid min-w-0 flex-1 gap-1 text-sm sm:grid-cols-3">
                            <span className="truncate font-medium">
                              {fullName(user)}
                            </span>
                            <span className="truncate text-muted-foreground">
                              {user.email}
                            </span>
                            <span className="truncate text-muted-foreground">
                              {departmentName(user.departmentId)}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="selected" className="mt-3">
                  {selectedInvitees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No people selected yet.
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-3">
                      {selectedInvitees.map((user) => (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                        >
                          <Checkbox
                            checked
                            onCheckedChange={() =>
                              toggleInvitee(user, false)
                            }
                          />
                          <span className="grid min-w-0 flex-1 gap-1 text-sm sm:grid-cols-3">
                            <span className="truncate font-medium">
                              {fullName(user)}
                            </span>
                            <span className="truncate text-muted-foreground">
                              {user.email}
                            </span>
                            <span className="truncate text-muted-foreground">
                              {departmentName(user.departmentId)}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </TabsContent>
                {errors.userIds && (
                  <p className="text-sm text-destructive">
                    {errors.userIds.message}
                  </p>
                )}
              </fieldset>
            </Tabs>

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link to="/events">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

export default CreateEventPage;
