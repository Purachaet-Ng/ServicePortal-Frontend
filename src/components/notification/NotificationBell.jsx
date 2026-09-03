import { useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/features/notifications/useNotifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The bell (WORKFLOW.md §A9). The badge polls once a minute; the list is
 * fetched only when the menu opens, so a signed-in user sitting on a page
 * costs one small request per minute and nothing else.
 *
 * All four states from §A10 are here, sized for a 320px menu rather than a
 * page — <ErrorState /> and <ListEmptyState /> are py-16 and would make the
 * dropdown taller than the viewport.
 *
 * Clicking an unread row marks it read and keeps the menu open, so several
 * can be cleared in a row. It does not navigate anywhere: `notifications`
 * stores only a message string, with no entity reference to link to
 * (API.md §Notifications, "As built").
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: count = 0 } = useUnreadCount();
  const {
    data: notifications = [],
    isPending,
    isError,
    error,
    refetch,
  } = useNotifications({ limit: 10 }, { enabled: open });

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const handleMarkRead = (notification) => {
    if (notification.readAt) return;
    markRead.mutate(notification.id, {
      onError: (mutationError) => toast.error(mutationError.message),
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: (data) =>
        toast.success(
          data?.count
            ? `Marked ${data.count} as read`
            : "Nothing left to mark",
        ),
      onError: (mutationError) => toast.error(mutationError.message),
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            count > 0 ? `Notifications, ${count} unread` : "Notifications"
          }
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium tabular-nums text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs font-normal"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="mr-1 size-3.5" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {isPending ? (
          <div className="space-y-3 p-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-1.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              {error?.message ?? "Could not load notifications."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            You are all caught up.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleMarkRead(notification)}
                  disabled={Boolean(notification.readAt)}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left transition-colors",
                    notification.readAt
                      ? "cursor-default"
                      : "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      notification.readAt ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span
                      className={cn(
                        "block text-sm leading-snug",
                        notification.readAt
                          ? "text-muted-foreground"
                          : "font-medium",
                      )}
                    >
                      {notification.message}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatRelative(notification.createdAt)}
                    </span>
                  </span>
                  {!notification.readAt && (
                    <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
