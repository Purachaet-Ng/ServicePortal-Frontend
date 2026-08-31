import PageHeader from "@/components/common/PageHeader";
import ComingSoon from "@/components/common/ComingSoon";

export function DepartmentsPage() {
  return (
    <>
      <PageHeader
        title="Departments"
        description="Create, rename, and remove departments."
      />
      <ComingSoon
        owner="Person B"
        docs="API.md Departments"
        endpoints={["GET /api/departments",
          "POST /api/departments",
          "PATCH /api/departments/:id",
          "DELETE /api/departments/:id"]}
      />
    </>
  );
}

export default DepartmentsPage;
