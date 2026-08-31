import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function InventoryItemsPage() {
  return (
    <>
      <PageHeader
        title="Inventory catalog"
        description="The master list of stock items and their quantities."
      />
      <ComingSoon
        owner="Person E"
        docs="API.md Inventory"
        endpoints={["POST /api/inventory/items",
          "PATCH /api/inventory/items/:id",
          "DELETE /api/inventory/items/:id"]}
      />
    </>
  );
}

export default InventoryItemsPage;
