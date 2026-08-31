import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function TicketsPage() {
  return (
    <>
      <PageHeader
        title="Tickets"
        description="Your requests, or your department queue. The backend decides which rows you see."
      />
      <ComingSoon
        owner="Person C"
        docs="WORKFLOW.md A4 + API.md Tickets"
        endpoints={["GET /api/tickets"]}
      />
    </>
  );
}

export default TicketsPage;
