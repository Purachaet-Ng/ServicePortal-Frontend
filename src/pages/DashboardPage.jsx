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
import PageHeader from "@/components/common/PageHeader";
import { fullName } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";

/**
 * ONE dashboard component, three shapes (WORKFLOW.md §A0).
 *
 * Do not build StaffDashboard.jsx / AdminDashboard.jsx as separate routes —
 * this file reads usePermission() and renders the panels the current role is
 * allowed to see. Same route, same file, different cards.
 *
 * The counts are placeholders. Each panel names the endpoint that will fill it.
 */
function StatCard({ title, description, endpoint }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums text-muted-foreground">
          —
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
        <code className="mt-2 block font-mono text-[11px] text-muted-foreground">
          {endpoint}
        </code>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { can } = usePermission();

  const isDeptAdmin = can("ticket:triage");
  const isSystemAdmin = can("department:manage");

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
          description="Tickets you created that are not yet closed."
          endpoint="GET /api/tickets"
        />
        <StatCard
          title="Assigned to me"
          description="Tickets waiting on your action."
          endpoint="GET /api/tickets"
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
            endpoint="GET /api/tickets?status=SUBMITTED"
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
            />
          </>
        )}
      </div>

      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Wiring this up</CardTitle>
          <CardDescription>
            Signed in as {fullName(user)}. The panels above are chosen by role
            already — they need their query hooks in{" "}
            <code className="font-mono text-xs">features/</code> and real counts
            from the endpoints named on each card. Owner: Person E (PLAN.md §10).
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}

export default DashboardPage;
