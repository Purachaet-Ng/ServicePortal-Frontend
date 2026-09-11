import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/inventory.api";

const selectData = (response) => response?.data ?? [];
export const useCentralStocks = (options = {}) => useQuery({
  queryKey: ["inventory", "central"],
  queryFn: api.getCentralStocks,
  select: selectData,
  refetchInterval: 15000,
  ...options,
});
export const useReplenishments = (options = {}) => useQuery({ queryKey: ["inventory", "replenishments"], queryFn: api.getReplenishments, select: selectData, refetchInterval: 15000, ...options });
export const useReceiveCentralStock = () => useInventoryMutation(api.receiveCentralStock);
export const useCreateReplenishment = () => useInventoryMutation(api.createReplenishment);
export const useUpdateReplenishment = () => useInventoryMutation(({ id, ...body }) => api.updateReplenishment(id, body));
const useInventoryMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]),
  });
};

export const useInventoryItems = (options = {}) =>
  useQuery({
    queryKey: ["inventory", "items"],
    queryFn: api.getInventoryItems,
    select: selectData,
    ...options,
  });
export const useInventoryStocks = (options = {}) =>
  useQuery({
    queryKey: ["inventory", "stocks"],
    queryFn: api.getInventoryStocks,
    select: selectData,
    ...options,
  });
export const useInventoryRequests = (options = {}) =>
  useQuery({
    queryKey: ["inventory", "requests"],
    queryFn: api.getInventoryRequests,
    select: selectData,
    ...options,
  });
export const useInventoryMovements = (options = {}) =>
  useQuery({
    queryKey: ["inventory", "movements"],
    queryFn: api.getInventoryMovements,
    select: selectData,
    ...options,
  });
export const useInventoryAssignments = (options = {}) =>
  useQuery({
    queryKey: ["inventory", "assignments"],
    queryFn: api.getInventoryAssignments,
    select: selectData,
    ...options,
  });
export const useCreateInventoryItem = () =>
  useInventoryMutation(api.createInventoryItem);
export const useUpdateInventoryItem = () =>
  useInventoryMutation(({ id, ...body }) => api.updateInventoryItem(id, body));
export const useDeleteInventoryItem = () =>
  useInventoryMutation(api.deleteInventoryItem);
export const useCreateInventoryStock = () =>
  useInventoryMutation(api.createInventoryStock);
export const useUpdateInventoryStock = () =>
  useInventoryMutation(({ id, ...body }) => api.updateInventoryStock(id, body));
export const useAdjustInventoryStock = () =>
  useInventoryMutation(({ id, ...body }) => api.adjustInventoryStock(id, body));
export const useCreateInventoryAsset = () =>
  useInventoryMutation(api.createInventoryAsset);
export const useUpdateInventoryAsset = () =>
  useInventoryMutation(({ id, ...body }) => api.updateInventoryAsset(id, body));
export const useCreateInventoryRequest = () =>
  useInventoryMutation(api.createInventoryRequest);
export const useUpdateInventoryRequest = () =>
  useInventoryMutation(({ id, ...body }) =>
    api.updateInventoryRequest(id, body),
  );
export const useReturnInventoryAssignment = () =>
  useInventoryMutation(({ id, ...body }) =>
    api.returnInventoryAssignment(id, body),
  );
export const useIssueInventoryAsset = () =>
  useInventoryMutation(api.issueInventoryAsset);
