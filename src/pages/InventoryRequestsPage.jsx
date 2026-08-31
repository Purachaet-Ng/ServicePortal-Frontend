import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function InventoryRequestsPage() {
  return (
    <>
      <PageHeader
        title="Approval queue"
        description="Approve, reject, or fulfil the requests waiting on you."
      />
      <ComingSoon
        owner="Person E"
        docs="WORKFLOW.md A8 (invalidate items AND requests on approve)"
        endpoints={["GET /api/inventory/requests", "PATCH /api/inventory/requests/:id"]}
      />
    </>
  );
}

export default InventoryRequestsPage;
