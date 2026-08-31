import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Browse company assets and stock, and request what you need."
      />
      <ComingSoon
        owner="Person E"
        docs="WORKFLOW.md A8 + PLAN.md 4 (models not written yet)"
        endpoints={["GET /api/inventory/items"]}
      />
    </>
  );
}

export default InventoryPage;
