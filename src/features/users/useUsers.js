import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
  updateUserRole,
} from "@/api/users.api";

/**
 * The users module's query layer (WORKFLOW.md §B4 step 3).
 *
 * Unlike every other module, GET /users takes no params — the backend returns
 * the whole table in one response. So there is only ever ONE list query, and
 * its key carries no params object:
 *
 *   ["users", "list"]   every user
 *   ["users", id]       one user
 *
 * Invalidating the "users" prefix still catches both at once.
 */

/**
 * The list. `select` unwraps the backend's { users: [...] } envelope here, once,
 * so no component has to know the response is not the { data, meta } shape
 * API.md promises for lists. If the backend is later fixed to match the doc,
 * this line is the only thing that changes.
 */
export const useUsers = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["users", "list"],
    queryFn: getUsers,
    select: (response) => response?.users ?? response?.data ?? [],
    // The whole table arrives at once and changes rarely — no reason to refetch
    // it every thirty seconds like a ticket queue.
    staleTime: 2 * 60_000,
    enabled,
  });

export const useUser = (id, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["users", id],
    queryFn: () => getUser(id),
    select: (response) => response?.user ?? response,
    enabled: enabled && id != null,
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};

/** Name, phone, and department. NOT role — that is its own endpoint. */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => updateUser(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};

/**
 * PATCH /users/:id/role. Separate from useUpdateUser because the backend keeps
 * them separate: role changes are ADMIN_SYSTEM only, while an ADMIN_DEPT may
 * edit a profile.
 */
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }) => updateUserRole(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};

/**
 * A HARD delete — the row goes, there is no isActive column to flip. Prisma
 * refuses when the user still owns a ticket, a booking, or a comment, which is
 * the database protecting history rather than a bug. The page turns that
 * failure into a sentence the admin can act on.
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};
