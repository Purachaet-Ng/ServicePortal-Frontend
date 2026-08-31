# `features/` — where domain logic lives

Three folders can hold code for the same domain. This is the split, so it does not drift:

| Folder | Holds | Example |
| --- | --- | --- |
| `pages/` | The route entry. Layout and composition only — no fetching, no form state. | `TicketsPage.jsx` |
| `features/<domain>/` | That domain's TanStack Query hooks, mutations, and forms. | `features/tickets/useTickets.js` |
| `components/<domain>/` | Presentational pieces that take props and render. | `components/ticket/TicketCard.jsx` |

**Rule of thumb:** if it calls the API or holds form state → `features/`. If it only takes props and renders → `components/`. Domain-agnostic shared pieces → `components/common/`. Anything the shadcn CLI generated stays in `components/ui/` untouched, so the CLI can be re-run without losing edits.

## Query key convention

- lists: `["<module>", "list", params]`
- one record: `["<module>", id]`
- a sub-resource: `["<module>", id, "comments"]`

Invalidating the `["tickets"]` prefix catches every list, filter combination, and detail query at once.

```js
export const useTickets = (params = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["tickets", "list", params],
    queryFn: () => getTickets(params),
    placeholderData: keepPreviousData, // page 2 keeps page 1 visible while loading
    enabled,
  });

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
};
```

`features/auth/useAuthQueries.js` is the worked example — copy its shape.
