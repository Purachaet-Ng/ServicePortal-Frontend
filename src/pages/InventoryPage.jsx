import PageHeader from "@/components/common/PageHeader";
import InventoryWorkspace from "@/features/inventory/InventoryWorkspace";

export function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Request equipment and supplies"
        description="Select the stock-owning department, add multiple items to one request, and track its status here."
      />
      <InventoryWorkspace />
    </>
  );
}

export default InventoryPage;
