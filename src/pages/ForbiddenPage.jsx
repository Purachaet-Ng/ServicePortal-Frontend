import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROLE_META } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

/**
 * 403. Rendered in place by ProtectedRoute rather than redirected to, so the
 * user can see WHY they are blocked instead of being silently bounced.
 */
export function ForbiddenPage() {
  const { role } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ShieldOff className="size-10 text-muted-foreground" strokeWidth={1.5} />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Not allowed</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your account is signed in as{" "}
          <span className="font-medium text-foreground">
            {ROLE_META[role]?.label ?? "an unknown role"}
          </span>
          , which does not have access to this page. Ask a system administrator
          if you think this is wrong.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}

export default ForbiddenPage;
