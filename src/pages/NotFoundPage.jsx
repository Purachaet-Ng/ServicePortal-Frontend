import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <FileQuestion className="size-10 text-muted-foreground" strokeWidth={1.5} />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page does not exist, or it has not been built yet.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}

export default NotFoundPage;
