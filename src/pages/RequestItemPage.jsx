import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function RequestItemPage() {
  return (
    <>
      <PageHeader
        title="Request an item"
        description="Ask for a quantity. Stock is checked by the backend, not by this form."
      />
      <ComingSoon
        owner="Person E"
        docs="WORKFLOW.md A8"
        endpoints={["GET /api/inventory/items/:id", "POST /api/inventory/items/:id/requests"]}
      />
    </>
  );
}

export default RequestItemPage;
