import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import DataTable from "@/components/common/DataTable";
import { ListEmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import PageHeader from "@/components/common/PageHeader";
import { StatusChip } from "@/components/common/StatusChip";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/features/events/useEvents";
import { usePermission } from "@/hooks/usePermission";
import { EVENT_STATUS_META } from "@/lib/constants";
import { formatTimeRange, fullName } from "@/lib/format";
import { Plus } from "lucide-react";


const RSVP_LABEL = {
  INVITED: "Waiting for response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  ATTENDED: "Attended",
  ABSENT: "Absent",
};

export function EventsPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canManage = can("event:manage");
  const eventsQuery = useEvents();
  const events = eventsQuery.data ?? [];

  const columns = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Event",
        cell: ({ row }) => (
          <div className="min-w-52">
            <p className="font-medium">{row.original.title}</p>
            {row.original.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "schedule",
        header: "Schedule",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatTimeRange(
              row.original.startTime,
              row.original.endTime,
            )}
          </span>
        ),
      },
      {
        id: "organizer",
        header: "Organizer",
        cell: ({ row }) => fullName(row.original.organizer),
      },
      {
        accessorKey: "status",
        header: "Event status",
        cell: ({ row }) => (
          <StatusChip kind="event" value={row.original.status} />
        ),
      },
      ...(!canManage
        ? [
            {
              accessorKey: "rsvpStatus",
              header: "My status",
              cell: ({ row }) =>
                row.original.status === "CANCEL"
                  ? "Cancelled"
                  : RSVP_LABEL[row.original.rsvpStatus] ??
                    row.original.rsvpStatus ??
                    "—",
            },
          ]
        : []),
    ],
    [canManage],
  );

  return (
    <>
      <PageHeader
        title={canManage ? "Events" : "My events"}
        description={
          canManage
            ? "Create and manage company events."
            : "Your invitations and attendance."
        }
      >
        {canManage && (
          <Button asChild>
            <Link to="/events/new">
            <Plus className="size-4" />
            New event
            </Link>
          </Button>
        )}
      </PageHeader>

      {eventsQuery.isError ? (
        <ErrorState
          error={eventsQuery.error}
          onRetry={eventsQuery.refetch}
        />
      ) : eventsQuery.isPending ? (
        <LoadingRows rows={5} columns={canManage ? 4 : 5} />
      ) : events.length === 0 ? (
        <ListEmptyState
          title={canManage ? "No events yet" : "No invitations yet"}
          description={
            canManage
              ? "Create an event to invite employees."
              : "Events you are invited to will appear here."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={events}
          rowAccent={(event) => EVENT_STATUS_META[event.status]?.bar}
          onRowClick={(event) => navigate(`/events/${event.id}`)}
        />
      )}
    </>
  );
}

export default EventsPage;
