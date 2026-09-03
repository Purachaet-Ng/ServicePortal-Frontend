import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
} from "@/api/notifications.api";

/**
 * The notification bell's query layer (WORKFLOW.md §A9).
 *
 * Keys follow the house convention, so invalidating the "notifications"
 * PREFIX catches the badge and the list together — which is what every
 * mutation below wants, since marking one read changes both:
 *
 *   ["notifications", "unread-count"]   the badge
 *   ["notifications", "list", params]   the dropdown
 *
 * The backend scopes every one of these to the token's user. There is no
 * userId to pass and no client-side filtering to do (API.md §Notifications).
 */

/**
 * The badge. Polls once a minute — real-time is a Phase 3 nice-to-have and
 * `socket.io` sitting in the backend dependencies is not a reason to build it.
 *
 * `staleTime: 0` overrides the client's 30s default: a 60s poll that serves a
 * cached answer for the first half of every interval is really a 90s poll.
 */
export const useUnreadCount = () =>
  useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    select: (data) => data?.count ?? 0,
    refetchInterval: 60_000,
    staleTime: 0,
  });

/**
 * The dropdown list. `enabled` is how the bell keeps this from running on
 * every page load — it fires when the menu opens, not before.
 */
export const useNotifications = (params = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["notifications", "list", params],
    queryFn: () => getNotifications(params),
    select: (data) => data?.notifications ?? [],
    enabled,
  });

/**
 * Marking one read moves the badge, so invalidate the prefix rather than just
 * the list. PATCH /:id/read is idempotent on the server — a second click
 * answers 200 and leaves the original read_at alone.
 */
export const useMarkRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
};
