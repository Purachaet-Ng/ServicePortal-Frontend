import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function EventsPage() {
  return (
    <>
      <PageHeader
        title="Events"
        description="Company events you can attend."
      />
      <ComingSoon
        owner="Person E"
        docs="WORKFLOW.md A8"
        endpoints={["GET /api/events"]}
      />
    </>
  );
}

export default EventsPage;
