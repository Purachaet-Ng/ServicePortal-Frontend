import { Navigate } from "react-router-dom";

export function InventoryRequestsPage() {
  return <Navigate to="/inventory?view=approvals" replace />;
}

export default InventoryRequestsPage;
