import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function DeptDashboardPage() {
  return (
    <>
      <PageHeader
        title="Department dashboard"
        description="Ticket volume, status mix, and response times for your department."
      />
      <ComingSoon
        owner="Person E"
        docs="PLAN.md 3 - Phase 3 stretch"
        endpoints={["GET /api/tickets"]}
      />
    </>
  );
}

export default DeptDashboardPage;
