import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function RoomsAdminPage() {
  return (
    <>
      <PageHeader
        title="Manage rooms"
        description="The master list of bookable rooms."
      />
      <ComingSoon
        owner="Person D"
        docs="API.md Rooms"
        endpoints={["POST /api/rooms", "PATCH /api/rooms/:id", "DELETE /api/rooms/:id"]}
      />
    </>
  );
}

export default RoomsAdminPage;
