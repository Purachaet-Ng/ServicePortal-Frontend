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
  const { id } = useParams();
  const { role } = useAuth();
  const isAdmin = role === ROLES.ADMIN_SYSTEM || role === ROLES.ADMIN_DEPT;

  // 1. Draft state
  const [priorityDraft, setPriorityDraft] = useState(null);
  const [assigneeDraft, setAssigneeDraft] = useState(null);

  // 2. API queries
  const ticketQuery = useTicket(id);
  const ticket = ticketQuery.data?.data ?? ticketQuery.data;
  const departmentId = ticket?.requestType?.departmentId;

  const assignableQuery = useQuery({
    queryKey: ["users", "assignable", departmentId],
    queryFn: () => getAssignableUsers(departmentId),
    select: (response) =>
      response?.user ?? response?.users ?? response?.data ?? [],
    enabled: isAdmin && departmentId != null,
  });
  const updateTicket = useUpdateTicket();

  // 3. Derived values
  const isClosed = ticket?.status === TICKET_STATUS.CLOSED;
  const currentAssignee = ticket?.assignedToId?.toString();
  const priority = priorityDraft ?? ticket?.priority;
  const assignee = assigneeDraft ?? currentAssignee;
  const hasChanges = priorityDraft !== null || assigneeDraft !== null;

  // Fields lock when status changed
  const fieldsLocked = isClosed || ticket?.status === TICKET_STATUS.RESOLVED;
  const assigneeLocked = fieldsLocked || ticket?.status === TICKET_STATUS.IN_PROGRESS;

  // 4. Selection changes
  const selectPriority = (value) => {
    setPriorityDraft(value === ticket.priority ? null : value);
  };

  const selectAssignee = (value) => {
    setAssigneeDraft(value === currentAssignee ? null : value);
  };

  // 5. Save changes
  const saveDetails = () => {
    updateTicket.mutate(
      {
        id,
        priority,
        assignedToId: assignee ? Number(assignee) : null,
      },
      {
        onSuccess: () => {
          setPriorityDraft(null);
          setAssigneeDraft(null);
          toast.success("Changes saved.");
        },
      },
    );
  };

  // 6. Change status
  const changeStatus = (status) => {
    if (hasChanges) {
      toast.error("Please save your changes first.");
      return;
    }
    if (!ticket.priority || !ticket.assignedToId) {
      toast.error("Select all fields and save before updating status.");
      return;
    }
    updateTicket.mutate({ id, status });
  };

  if (ticketQuery.isPending) {
    return <Skeleton className="h-80 w-full" />;
  }
  if (ticketQuery.isError) {
    return (
      <ErrorState error={ticketQuery.error} onRetry={ticketQuery.refetch} />
    );
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
                    disabled={fieldsLocked || updateTicket.isPending}
                    onValueChange={selectPriority}
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
                      assigneeLocked ||
                      updateTicket.isPending ||
                      assignableQuery.isPending
                    }
                    onValueChange={selectAssignee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    
                    <SelectContent>
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
                    isPending={ updateTicket.isPending ? updateTicket.variables?.status : null }
                    onTransition={changeStatus}
                  />

                  {!isClosed && (
                    <Button
                      className="ml-4"
                      size="icon"
                      disabled={!hasChanges || updateTicket.isPending}
                      onClick={saveDetails}
                      aria-label="Save changes"
                      title="Save changes"
                    >
                      <Save />
                    </Button>
                  )}
                </div>
              )}

              {(updateTicket.isError || assignableQuery.isError) && (
                <p className="text-sm text-destructive">
                  {(updateTicket.error ?? assignableQuery.error)?.message}
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
