import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function UsersPage() {
  return (
    <>
      <PageHeader
        title="All users"
        description="Assign roles, move people between departments, deactivate accounts."
      />
      <ComingSoon
        owner="Person A"
        docs="API.md Users + PLAN.md 2"
        endpoints={["GET /api/users", "PATCH /api/users/:id/role", "DELETE /api/users/:id"]}
      />
    </>
  );
}

export default UsersPage;
