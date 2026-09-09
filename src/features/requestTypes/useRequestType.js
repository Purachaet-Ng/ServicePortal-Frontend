import { createRequestType, getRequestTypes } from "@/api/requestTypes.api.js";
import {
  useMutation,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
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

/**
 * Create one (CreateRequestTypePage). The department is part of the URL rather
 * than the body, so it is pulled off the payload here and the page can hand
 * this one flat object.
 *
 * Invalidates the "request-types" PREFIX, not one list key: the list page fans
 * out one query PER department for its "All departments" view, so the new type
 * has to land in whichever of those is cached.
 */
export const useCreateRequestType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, ...body }) =>
      createRequestType(departmentId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["request-types"] }),
  });
};
