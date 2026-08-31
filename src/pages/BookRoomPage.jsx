import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function BookRoomPage() {
  return (
    <>
      <PageHeader
        title="Book a room"
        description="Pick a start and end time. A clash returns 409 with the booking that blocks it."
      />
      <ComingSoon
        owner="Person D"
        docs="WORKFLOW.md A7"
        endpoints={["GET /api/rooms/:id/availability", "POST /api/rooms/:id/bookings"]}
      />
    </>
  );
}

export default BookRoomPage;
