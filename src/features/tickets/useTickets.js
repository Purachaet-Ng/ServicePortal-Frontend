import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addTicketComment,
  createTicket,
  getTicket,
  getTicketComments,
  getTickets,
  updateTicket,
} from "@/api/tickets.api";

/**
 * The tickets module's query layer (WORKFLOW.md §B4 step 3).
 *
 * Keys follow the house convention so that invalidating the "tickets" PREFIX
 * catches every list, every filter combination, and every detail query at once:
 *
 *   ["tickets", "list", params]     a list
 *   ["tickets", id]                 one ticket
 *   ["tickets", id, "comments"]     its thread
 *
 * NOTE: none of these routes are mounted on the backend yet (app.js has only
 * /api/auth and /api/users), so every call 404s today. That is survivable —
 * client.js logs out on 401 only, so a 404 renders <ErrorState /> and the
 * session lives. queryClient already declines to retry 4xx.
 */

/**
 * The list. `params` comes straight from useListQuery().query, so it is already
 * page/limit/sort plus whichever filters are not set to ALL.
 *
 * Never pass a role-derived filter in here. GET /api/tickets is scoped by the
 * backend from req.user — STAFF and ADMIN_SYSTEM call the identical URL and get
 * different rows. Filtering by role client-side would mean rows the browser
 * should never have received had already been sent (WORKFLOW.md §A4).
 */
export const useTickets = (params = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["tickets", "list", params],
    queryFn: () => getTickets(params),
    // Page 2 keeps page 1's rows on screen while it loads, so the table does
    // not collapse to skeletons every time someone pages or types.
    placeholderData: keepPreviousData,
    enabled,
  });

export const useTicket = (id, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["tickets", id],
    queryFn: () => getTicket(id),
    enabled: enabled && id != null,
  });

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
};

/**
 * Status, priority, and assignee changes all come through here — PATCH takes
 * one concern at a time (API.md → PATCH /api/tickets/:id).
 *
 * Which transitions are offered is TICKET_TRANSITIONS in lib/constants.js, not
 * this hook: it depends on the row and the caller's role. The backend still
 * rejects an illegal move with 422 INVALID_TRANSITION, which is the real
 * boundary — StatusActions only hides buttons as a courtesy.
 */
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => updateTicket(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
};

export const useTicketComments = (id, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["tickets", id, "comments"],
    queryFn: () => getTicketComments(id),
    enabled: enabled && id != null,
  });

/** body: { text }. entity_type and entity_id are the backend's business. */
export const useAddComment = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => addTicketComment(id, body),
    // Only the thread changes, so leave the lists alone rather than refetching
    // every open query for a comment.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tickets", id, "comments"] }),
  });
};
