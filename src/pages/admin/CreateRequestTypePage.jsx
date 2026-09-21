import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import RequestTypeForm from "@/features/requestTypes/RequestTypeForm";
import { useAuth } from "@/hooks/useAuth";

const LIST_PATH = "/admin/department/request-types";

/**
 * Creating a request type gets a page of its own — the field builder and its
 * live preview want the width. Editing an existing one happens in a dialog on
 * the list page; both render the same RequestTypeForm.
 */
export function CreateRequestTypePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { departmentId: myDepartmentId } = useAuth();

  // The list page passes the department it was filtered to. A system admin
  // viewing "All departments" arrives without one and picks it in the form.
  const initialDepartmentId =
    searchParams.get("department") ??
    (myDepartmentId != null ? String(myDepartmentId) : "");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="New request type"
        description="Requesters pick a request type, then fill in the fields you define here."
      />
      <RequestTypeForm
        initialDepartmentId={initialDepartmentId}
        onCancel={() => navigate(LIST_PATH)}
        onDone={() => navigate(LIST_PATH)}
      />
    </div>
  );
}

export default CreateRequestTypePage;
