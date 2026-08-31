import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/api/notifications.api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The unread badge polls once a minute; the full list loads only when the
 * dropdown opens (WORKFLOW.md §A9).
 *
 * Polling is the right call for a class project. socket.io is in the backend
 * dependencies, but real-time is a Phase 3 nice-to-have.
 *
 * GET /notifications/unread-count is NOT BUILT yet, so this quietly shows no
 * badge — `retry: false` keeps it from hammering a 404 every minute.
 */
export function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
    retry: false,
  });

  const count = data?.count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium tabular-nums text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          Phase 2 — needs GET /api/notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
