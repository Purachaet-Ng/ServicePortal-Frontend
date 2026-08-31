import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function RoomsPage() {
  return (
    <>
      <PageHeader
        title="Rooms"
        description="Find a meeting room by capacity and location, then check its day view."
      />
      <ComingSoon
        owner="Person D"
        docs="WORKFLOW.md A7"
        endpoints={["GET /api/rooms", "GET /api/rooms/:id/availability"]}
      />
    </>
  );
}

export default RoomsPage;
