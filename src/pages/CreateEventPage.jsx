import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEvent, useEventDepartments, useEventInvitees, useInviteAttendees } from "@/features/events/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { applyServerError } from "@/lib/formErrors";
import { fullName } from "@/lib/format";
import { createEventSchema } from "@/validators/event.validator";

export function CreateEventPage() {
  const navigate = useNavigate();
  const { role, departmentId } = useAuth();
  const isDepartmentAdmin = role === "ADMIN_DEPT";

  const {
    register,
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
  const inviteesQuery = useEventInvitees(
    selectedDepartmentId,
    role === "ADMIN_SYSTEM",
  );

  const createEvent = useCreateEvent();
  const inviteAttendees = useInviteAttendees();
  const isPending = createEvent.isPending || inviteAttendees.isPending;

  const departments = departmentsQuery.data ?? [];
  const invitees = inviteesQuery.data ?? [];

  const changeDepartment = (value) => {
    setValue("departmentId", value, {
      shouldValidate: true,
    });
    setValue("userIds", [], { shouldValidate: true });
  };

  const toggleStaff = (userId, checked) => {
    const userIds = checked
      ? [...selectedUserIds, userId]
      : selectedUserIds.filter((id) => id !== userId);

    setValue("userIds", userIds, { shouldValidate: true });
  };

  const onSubmit = async (values) => {
    let created;

    try {
      created = await createEvent.mutateAsync({
        title: values.title,
        description: values.description.trim() || null,
        location: values.location.trim() || null,
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
      });

      await inviteAttendees.mutateAsync({
        id: created.event.id,
        userIds: values.userIds,
      });

      toast.success("Event created and staff invited");
      navigate(`/events/${created.event.id}`);
    } catch (error) {
      if (created?.event?.id) {
        toast.error(
          "Event created, but invitations failed. Add attendees from the event page.",
        );
        navigate(`/events/${created.event.id}`);
        return;
      }

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
                <Input
                  id="startTime"
                  type="datetime-local"
                  {...register("startTime")}
                  aria-invalid={Boolean(errors.startTime)}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  {...register("endTime")}
                  aria-invalid={Boolean(errors.endTime)}
                />
                {errors.endTime && (
                  <p className="text-sm text-destructive">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>

              <Select
                value={selectedDepartmentId}
                onValueChange={changeDepartment}
                disabled={
                  isDepartmentAdmin ||
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

              <input type="hidden" {...register("departmentId")} />

              {errors.departmentId && (
                <p className="text-sm text-destructive">
                  {errors.departmentId.message}
                </p>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Invitees</legend>

              {!selectedDepartmentId ? (
                <p className="text-sm text-muted-foreground">
                  Select a department first.
                </p>
              ) : inviteesQuery.isPending ? (
                <p className="text-sm text-muted-foreground">Loading invitees…</p>
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
                          toggleStaff(user.id, checked === true)
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {fullName(user)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {errors.userIds && (
                <p className="text-sm text-destructive">
                  {errors.userIds.message}
                </p>
              )}
            </fieldset>

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
