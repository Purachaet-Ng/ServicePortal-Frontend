import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function MyBookingsPage() {
  return (
    <>
      <PageHeader
        title="My bookings"
        description="Rooms you have reserved, and the ones you can still cancel."
      />
      <ComingSoon
        owner="Person D"
        docs="WORKFLOW.md A7"
        endpoints={["GET /api/bookings", "DELETE /api/bookings/:id"]}
      />
    </>
  );
}

export default MyBookingsPage;
