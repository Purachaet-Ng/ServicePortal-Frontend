import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function TeamPage() {
  return (
    <>
      <PageHeader
        title="My team"
        description="People in your department, and who can be assigned tickets."
      />
      <ComingSoon
        owner="Person A"
        docs="API.md Users - scoped to your own department"
        endpoints={["GET /api/users", "GET /api/users/assignable"]}
      />
    </>
  );
}

export default TeamPage;
