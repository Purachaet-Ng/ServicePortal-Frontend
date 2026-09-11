import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

/**
 * The "are you sure" for anything destructive — delete a department, cancel a
 * booking, reject a ticket.
 *
 * Say what will happen in the description, not "This action cannot be undone"
 * on its own: "Delete the HR department? Its 4 request types must be moved
 * first." is a sentence someone can actually act on.
 *
 * `children` render between the description and the buttons, for the case where
 * confirming needs one thing typed — a rejection reason, say. It is deliberately
 * not a form: anything more than a field or two is its own dialog, not this one.
 * `confirmDisabled` is how the caller says that field is not filled in yet.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "destructive",
  isPending,
  confirmDisabled,
  onConfirm,
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isPending || confirmDisabled}
          >
            {isPending && <Spinner />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;
