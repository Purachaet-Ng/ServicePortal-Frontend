import { Layers } from "lucide-react";
import { Outlet } from "react-router-dom";

/**
 * Login and register shell: one centered card. No split-screen hero, no
 * marketing copy — this is an internal tool and nobody needs convincing.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-muted/30 p-6">
      <div className="flex items-center gap-2 font-semibold">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Layers className="size-4" />
        </div>
        Service Portal
      </div>

      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
