import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function CreateEventPage() {
  return (
    <>
      <PageHeader
        title="New event"
        description="Schedule an event and invite attendees."
      />
      <ComingSoon
        owner="Person E"
        docs="WORKFLOW.md A8"
        endpoints={["POST /api/events", "POST /api/events/:id/attendees"]}
      />
    </>
  );
}

export default CreateEventPage;
