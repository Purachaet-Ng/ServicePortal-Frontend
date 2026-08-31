import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMe, login, register } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";

/**
 * Session bootstrap (WORKFLOW.md §A1).
 *
 * The persisted user renders immediately so there is no loading flash, then
 * /auth/me corrects it. Why bother when the user is already in localStorage: if
 * an ADMIN_SYSTEM demotes someone to STAFF, their localStorage still says
 * ADMIN_DEPT until it is refreshed — the UI would show admin buttons that all
 * 403, which looks broken.
 *
 * GET /auth/me is NOT BUILT on the backend yet, so this 404s today. That is
 * survivable by design: client.js only logs out on 401, and the persisted user
 * keeps rendering. Delete the `retry: false` comment below once the endpoint
 * lands; nothing else here changes.
 */
export function useMe() {
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    enabled: !!token,
    staleTime: 5 * 60_000,
    // 404 = the endpoint does not exist yet; 401 = client.js already logged us
    // out. Neither is worth retrying.
    retry: false,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  return query;
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => setAuth({ token: data.token, user: data.user }),
  });
}

/**
 * Register returns { message, user } — no token (see auth.controller.js), so
 * the user still has to log in afterwards. RegisterPage sends them to /login
 * with a success toast rather than pretending they are signed in.
 */
export function useRegister() {
  return useMutation({ mutationFn: register });
}
