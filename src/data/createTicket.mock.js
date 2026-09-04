export const MOCK_DEPARTMENTS = [
  { id: 1, name: "Human Resources" },
  { id: 2, name: "IT" },
  { id: 3, name: "Facilities" },
];

export const MOCK_REQUEST_TYPES = [
  {
    id: 1,
    departmentId: 1,
    name: "Training request",
    description: "Request training or professional development.",
    formSchema: [
      { key: "course_name", label: "Course name", type: "text", required: true, order: 1 },
      { key: "preferred_date", label: "Preferred date", type: "date", required: true, order: 2 },
      {
        key: "delivery_method",
        label: "Delivery method",
        type: "select",
        options: ["On-site", "Online", "Off-site"],
        required: true,
        order: 3,
      },
    ],
  },
  {
    id: 2,
    departmentId: 2,
    name: "Hardware issue",
    description: "Report broken or faulty equipment.",
    formSchema: [
      {
        key: "device_type",
        label: "Device type",
        type: "select",
        options: ["Laptop", "Desktop", "Monitor", "Printer", "Other"],
        required: true,
        order: 1,
      },
      { key: "asset_tag", label: "Asset tag", type: "text", required: false, order: 2 },
      { key: "issue", label: "What is wrong?", type: "textarea", required: true, order: 3 },
      { key: "blocking", label: "This is blocking my work", type: "checkbox", order: 4 },
    ],
  },
  {
    id: 3,
    departmentId: 3,
    name: "Maintenance request",
    description: "Report a building or facilities problem.",
    formSchema: [
      { key: "location", label: "Location", type: "text", required: true, order: 1 },
      {
        key: "category",
        label: "Category",
        type: "select",
        options: ["Electrical", "Plumbing", "Furniture", "Air conditioning"],
        required: true,
        order: 2,
      },
      { key: "details", label: "Problem details", type: "textarea", required: true, order: 3 },
    ],
  },
];

// TODO: Replace these mocks with backend APIs when the backend branch is merged.
export const getMockDepartments = async () => ({
  departments: MOCK_DEPARTMENTS,
});

export const getMockRequestTypes = async (departmentId) => ({
  requestTypes: MOCK_REQUEST_TYPES.filter(
    (requestType) => requestType.departmentId === Number(departmentId),
  ),
});
