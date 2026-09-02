import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/PageHeader";
import { useDashboardStats } from "@/features/dashboard/useDashboardStats";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";

/**
 * ONE dashboard component, three shapes (WORKFLOW.md §A0).
 *
 * Do not build StaffDashboard.jsx / AdminDashboard.jsx as separate routes —
 * this file reads usePermission() and renders the panels the current role is
 * allowed to see. Same route, same file, different cards.
 *
 * The counting lives in features/dashboard/useDashboardStats.js. Two cards are
 * still placeholders because their endpoints do not exist: GET /api/bookings
 * and GET /api/departments are not mounted in backend/src/app.js. They keep
 * naming the endpoint they need rather than quietly rendering a zero, which
 * would read as "you have no bookings" instead of "this is not built".
 */

/**
 * `value === undefined` means there is no endpoint yet — that is the em dash.
 * A real 0 is a real answer and renders as 0.
 */
function StatCard({ title, description, endpoint, value, isPending, isError }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">
          {isPending ? (
            <Skeleton className="h-8 w-12" />
          ) : isError || value === undefined ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            value
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
        {isError ? (
          <p className="mt-2 text-[11px] text-destructive">
            Could not load — {endpoint}
          </p>
        ) : (
          value === undefined && (
            <code className="mt-2 block font-mono text-[11px] text-muted-foreground">
              {endpoint}
            </code>
          )
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { can } = usePermission();

  const isDeptAdmin = can("ticket:triage");
  const isSystemAdmin = can("department:manage");

  const stats = useDashboardStats({ isSystemAdmin });

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.firstname ?? ""}`.trim()}
        description={
          isSystemAdmin
            ? "Org-wide activity across every department."
            : isDeptAdmin
              ? "Your department queue and what is waiting on you."
              : "Your open requests and upcoming bookings."
        }
      >
        <Button asChild>
          <Link to="/tickets/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Everyone gets "my stuff". */}
        <StatCard
          title="My open tickets"
          description="Tickets you created that are not closed or rejected."
          endpoint="GET /api/tickets"
          value={stats.myOpenTickets}
          isPending={stats.tickets.isPending}
          isError={stats.tickets.isError}
        />
        <StatCard
          title="Assigned to me"
          description="Tickets waiting on your action."
          endpoint="GET /api/tickets"
          value={stats.assignedToMe}
          isPending={stats.tickets.isPending}
          isError={stats.tickets.isError}
        />
        <StatCard
          title="My upcoming bookings"
          description="Rooms you have reserved from today."
          endpoint="GET /api/bookings"
        />

        {isDeptAdmin && (
          <StatCard
            title="Awaiting triage"
            description="Submitted tickets in your department with no reviewer."
            endpoint="GET /api/tickets"
            value={stats.awaitingTriage}
            isPending={stats.tickets.isPending}
            isError={stats.tickets.isError}
          />
        )}

        {isSystemAdmin && (
          <>
            <StatCard
              title="Departments"
              description="Departments on the platform."
              endpoint="GET /api/departments"
            />
            <StatCard
              title="Active users"
              description="Accounts across every department."
              endpoint="GET /api/users"
              value={stats.activeUsers}
              isPending={stats.users.isPending}
              isError={stats.users.isError}
            />
          </>
        )}
      </div>
    </>
  );
}

export default DashboardPage;
