import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function EventDetailPage() {
  return (
    <>
      <PageHeader
        title="Event"
        description="Details, the attendee list, and your RSVP."
      />
      <ComingSoon
        owner="Person E"
        docs="WORKFLOW.md A8 (RSVP is an upsert, so the button toggles)"
        endpoints={["GET /api/events/:id", "GET /api/events/:id/attendees", "POST /api/events/:id/rsvp"]}
      />
    </>
  );
}

export default EventDetailPage;
