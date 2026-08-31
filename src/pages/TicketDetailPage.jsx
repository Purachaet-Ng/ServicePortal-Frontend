import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function TicketDetailPage() {
  return (
    <>
      <PageHeader
        title="Ticket"
        description="Status, priority, assignee, and the comment thread."
      />
      <ComingSoon
        owner="Person C"
        docs="WORKFLOW.md A5 and A6 + PLAN.md 6"
        endpoints={["GET /api/tickets/:id",
          "PATCH /api/tickets/:id",
          "GET /api/tickets/:id/comments",
          "POST /api/tickets/:id/comments",
          "GET /api/users/assignable"]}
      />
    </>
  );
}

export default TicketDetailPage;
