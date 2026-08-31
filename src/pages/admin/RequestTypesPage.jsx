import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function RequestTypesPage() {
  return (
    <>
      <PageHeader
        title="Request types"
        description="Define the request types your department offers, and the form each one shows."
      />
      <ComingSoon
        owner="Person B"
        docs="PLAN.md 9 - a JSON textarea with a live DynamicForm preview is the intended shortcut"
        endpoints={["GET /api/departments/:deptId/request-types",
          "POST /api/departments/:deptId/request-types",
          "PATCH /api/request-types/:id",
          "DELETE /api/request-types/:id"]}
      />
    </>
  );
}

export default RequestTypesPage;
