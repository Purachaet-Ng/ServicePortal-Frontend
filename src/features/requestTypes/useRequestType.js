import {
  getRequestTypes,
  getRequestType,
  createRequestType,
  updateRequestType,
  deleteRequestType,
} from "@/api/requestTypes.api.js";
import { useQueries } from "@tanstack/react-query";
import { ALL } from "@/lib/constants";

export const useRequestTypes = (
  departmentId,
  { enabled = true, departments = [] } = {},
) => {
  const wantsAll =
    departmentId == null || departmentId === "" || departmentId === ALL;

  const departmentIds = wantsAll
    ? departments.map((department) => department.id)
    : [departmentId];

  return useQueries({
    queries: departmentIds.map((deptId) => ({
      queryKey: ["request-types", "list", deptId],
      queryFn: () => getRequestTypes(deptId),
      select: (res) => res?.data ?? res?.requestTypes ?? [],
      staleTime: 5 * 60_000,
      enabled: enabled && deptId != null && deptId !== "",
    })),
    combine: (results) => ({
      data: results.flatMap((result) => result.data ?? []),
      isPending:
        results.length === 0
          ? enabled && wantsAll
          : results.some((result) => result.isPending),
      isError: results.some((result) => result.isError),
      error: results.find((result) => result.error)?.error ?? null,
      refetch: () => Promise.all(results.map((result) => result.refetch())),
    }),
  });
};
