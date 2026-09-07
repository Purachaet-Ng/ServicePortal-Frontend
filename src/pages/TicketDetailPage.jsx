import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getAssignableUsers } from "@/api/users.api";
import PageHeader from "@/components/common/PageHeader";
import ErrorState from "@/components/common/ErrorState";
import StatusActions from "@/components/ticket/StatusActions";
import { Priority, StatusPill } from "@/components/common/StatusChip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicket, useUpdateTicket } from "@/features/tickets/useTickets";
import { useAuth } from "@/hooks/useAuth";
import { PRIORITY_OPTIONS, ROLES, TICKET_STATUS } from "@/lib/constants";
import { formatDateTime, fullName } from "@/lib/format";

export function TicketDetailPage() {
  // 1. Load ticket
  const { id } = useParams();
  const { role } = useAuth();
  const { data, isPending, isError, error, refetch } = useTicket(id);
  const update = useUpdateTicket();

  // 2. Draft changes
  const [priorityDraft, setPriorityDraft] = useState(null);
  const [assigneeDraft, setAssigneeDraft] = useState(null);

  // 3. Derived values
  const isAdmin = role === ROLES.ADMIN_SYSTEM || role === ROLES.ADMIN_DEPT;
  const ticket = data?.data ?? data;
  const isClosed = ticket?.status === TICKET_STATUS.CLOSED;
  const currentAssignee = ticket?.assignedToId?.toString() ?? "unassigned";
  const priority = priorityDraft ?? ticket?.priority;
  const assignee = assigneeDraft ?? currentAssignee;
  const hasChanges = priorityDraft !== null || assigneeDraft !== null;
  const departmentId = ticket?.requestType?.departmentId;

  // 4. Load assignees
  const assignableQuery = useQuery({
    queryKey: ["users", "assignable", departmentId],
    queryFn: () => getAssignableUsers(departmentId),
    select: (response) =>
      response?.user ?? response?.users ?? response?.data ?? [],
    enabled: isAdmin && departmentId != null,
  });

  // 5. Save changes
  const saveDetails = () =>
    update.mutate(
      {
        id,
        priority,
        assignedToId: assignee === "unassigned" ? null : Number(assignee),
      },
      {
        onSuccess: () => {
          setPriorityDraft(null);
          setAssigneeDraft(null);
        },
      },
    );

  // 6. Change status
  const changeStatus = (status) => {
    if (hasChanges) {
      toast.error("Save your changes before updating status.");
      return;
    }
    update.mutate({ id, status });
  };

  if (isPending) return <Skeleton className="h-80 w-full" />;
  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const customFields = [...(ticket.requestType?.formSchema ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  return (
    <>
      <Button variant="ghost" size="md" className="mb-4" asChild>
        <Link to="/tickets">
          <ArrowLeft />
          Back
        </Link>
      </Button>

      <PageHeader
        title={`Ticket ID: ${ticket.id}`}
        description={ticket.requestType?.name ?? "Service request"}
      ></PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{ticket.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="whitespace-pre-wrap text-muted-foreground">
              {ticket.description || "No description provided."}
            </p>
            {customFields.length > 0 && (
              <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
                {customFields.map((field) => (
                  <Detail key={field.key} label={field.label ?? field.key}>
                    <FieldValue value={ticket.customFields?.[field.key]} />
                  </Detail>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Details</CardTitle>
              <div className="flex items-center">
                <StatusPill kind="ticket" value={ticket.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Detail label="Priority">
                {isAdmin ? (
                  <Select
                    value={priority}
                    disabled={isClosed || update.isPending}
                    onValueChange={(value) =>
                      setPriorityDraft(value === ticket.priority ? null : value)
                    }
                  >
                    <SelectTrigger>
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
                ) : (
                  <Priority value={ticket.priority} />
                )}
              </Detail>

              <Detail label="Assignee">
                {isAdmin ? (
                  <Select
                    value={assignee}
                    disabled={
                      isClosed || update.isPending || assignableQuery.isPending
                    }
                    onValueChange={(value) =>
                      setAssigneeDraft(value === currentAssignee ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(assignableQuery.data ?? []).map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {fullName(user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>
                    {ticket.assignedTo
                      ? fullName(ticket.assignedTo)
                      : ticket.assignedToId
                        ? `User #${ticket.assignedToId}`
                        : "Unassigned"}
                  </span>
                )}
              </Detail>

              <Detail label="Created">
                {formatDateTime(ticket.createdAt)}
              </Detail>
              <Detail label="Updated">
                {formatDateTime(ticket.updatedAt)}
              </Detail>

              {/* Status */}
              {isAdmin && (
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <StatusActions
                    ticket={ticket}
                    isPending={
                      update.isPending ? update.variables?.status : null
                    }
                    onTransition={changeStatus}
                  />

                  {!isClosed && (
                    <Button
                      className="ml-4"
                      size="icon"
                      disabled={!hasChanges || update.isPending}
                      onClick={saveDetails}
                      aria-label="Save changes"
                      title="Save changes"
                    >
                      <Save />
                    </Button>
                  )}
                </div>
              )}

              {(update.isError || assignableQuery.isError) && (
                <p className="text-sm text-destructive">
                  {(update.error ?? assignableQuery.error)?.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comments stay disabled until GET/POST /api/tickets/:id/comments are available. */}
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Comments are not available yet.
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-md text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}

function FieldValue({ value }) {
  if (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return <span className="font-medium mt-1">No data provided.</span>;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export default TicketDetailPage;
