import { Children, useState } from "react";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

export function InventoryList({ children }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const rows = Children.toArray(children);

  return (
    <div className="space-y-3">
      <div className="max-h-[32rem] space-y-3 overflow-y-auto">
        {rows.slice(0, limit)}
      </div>
      {rows.length > limit && (
        <Button
          variant="outline"
          onClick={() => setLimit((current) => current + PAGE_SIZE)}
        >
          Show {PAGE_SIZE} more ({limit} / {rows.length})
        </Button>
      )}
    </div>
  );
}

export default InventoryList;
