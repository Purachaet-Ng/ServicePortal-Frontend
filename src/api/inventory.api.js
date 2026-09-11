import api from "./client";

// Central warehouse replenishment
export const getCentralStocks = () => api.get("/inventory/central-stocks").then((r) => r.data);
export const receiveCentralStock = (body) => api.post("/inventory/central-stocks", body).then((r) => r.data);
export const getReplenishments = () => api.get("/inventory/replenishments").then((r) => r.data);
export const createReplenishment = (body) => api.post("/inventory/replenishments", body).then((r) => r.data);
export const updateReplenishment = (id, body) => api.patch(`/inventory/replenishments/${id}`, body).then((r) => r.data);

// Catalog
export const getInventoryItems = () =>
  api.get("/inventory/items").then((response) => response.data);

export const createInventoryItem = (body) =>
  api.post("/inventory/items", body).then((response) => response.data);

export const updateInventoryItem = (id, body) =>
  api.patch(`/inventory/items/${id}`, body).then((response) => response.data);

export const deleteInventoryItem = (id) =>
  api.delete(`/inventory/items/${id}`).then((response) => response.data);

// Department stock
export const getInventoryStocks = () =>
  api.get("/inventory/stocks").then((response) => response.data);

export const createInventoryStock = (body) =>
  api.post("/inventory/stocks", body).then((response) => response.data);

export const updateInventoryStock = (id, body) =>
  api.patch(`/inventory/stocks/${id}`, body).then((response) => response.data);

export const adjustInventoryStock = (id, body) =>
  api
    .post(`/inventory/stocks/${id}/adjustments`, body)
    .then((response) => response.data);

// Serialized assets
export const createInventoryAsset = (body) =>
  api.post("/inventory/assets", body).then((response) => response.data);

export const updateInventoryAsset = (id, body) =>
  api.patch(`/inventory/assets/${id}`, body).then((response) => response.data);

// Requests and approvals
export const getInventoryRequests = () =>
  api.get("/inventory/requests").then((response) => response.data);

export const createInventoryRequest = (body) =>
  api.post("/inventory/requests", body).then((response) => response.data);

export const updateInventoryRequest = (id, body) =>
  api
    .patch(`/inventory/requests/${id}/status`, body)
    .then((response) => response.data);

// Audit history and PDF report
export const getInventoryMovements = () =>
  api.get("/inventory/movements").then((response) => response.data);

export const downloadInventoryReport = (params) =>
  api
    .get("/inventory/report.pdf", { params, responseType: "blob" })
    .then((response) => response.data);

// Asset assignments and returns
export const getInventoryAssignments = () =>
  api.get("/inventory/assignments").then((response) => response.data);

export const issueInventoryAsset = (body) =>
  api.post("/inventory/assignments", body).then((response) => response.data);

export const returnInventoryAssignment = (id, body) =>
  api
    .post(`/inventory/assignments/${id}/return`, body)
    .then((response) => response.data);
