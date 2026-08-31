import { useAuthStore } from "@/store/auth.store";

/**
 * Read-only view of the session, for components. Subscribes field by field so a
 * component that only needs the role does not re-render when the token changes.
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    token,
    role: user?.role ?? null,
    departmentId: user?.departmentId ?? null,
    isAuthenticated: !!token,
    setAuth,
    logout,
  };
}
