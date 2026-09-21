import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RequestTypeForm from "./RequestTypeForm";

/**
 * Edit a request type without leaving the list. Wider than the usual dialog and
 * scrollable inside: the form it holds is a field builder with a live preview
 * beside it, which the grid drops to one column when there is no room.
 *
 * The form is keyed on the id so opening a second row remounts it — otherwise
 * the previous type's rows would sit there until its fetch resolved.
 */
export function RequestTypeFormDialog({ open, onOpenChange, requestTypeId }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Edit request type</DialogTitle>
          <DialogDescription>
            Changes apply to new tickets. Tickets already filed keep the answers
            they were submitted with.
          </DialogDescription>
        </DialogHeader>
        {requestTypeId != null && (
          <RequestTypeForm
            key={requestTypeId}
            requestTypeId={requestTypeId}
            onCancel={() => onOpenChange(false)}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RequestTypeFormDialog;
