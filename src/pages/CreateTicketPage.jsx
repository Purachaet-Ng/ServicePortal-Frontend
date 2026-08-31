import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function CreateTicketPage() {
  return (
    <>
      <PageHeader
        title="New ticket"
        description="Pick a department, then a request type. The form fields come from its form_schema."
      />
      <ComingSoon
        owner="Person B"
        docs="WORKFLOW.md A3 + PLAN.md 5"
        endpoints={["GET /api/departments",
          "GET /api/departments/:deptId/request-types",
          "POST /api/tickets"]}
      />
    </>
  );
}

export default CreateTicketPage;
