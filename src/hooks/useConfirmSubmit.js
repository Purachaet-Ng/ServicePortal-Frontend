import { useState } from "react";

/**
 * A confirm step between a valid form and the write it performs.
 *
 * Pass `confirm` to handleSubmit instead of the submit handler, and spread
 * `dialogProps` onto a ConfirmDialog. The form validates as it always did —
 * nothing is confirmed until the values are good — and the handler runs only
 * when the dialog is accepted.
 *
 *   const { confirm, dialogProps } = useConfirmSubmit(onSubmit);
 *   <form onSubmit={handleSubmit(confirm)}>
 *   <ConfirmDialog {...dialogProps} title="Save changes?" variant="default" />
 *
 * Holding the values in state is what makes this work without touching the
 * form: they are already parsed by the time the dialog opens, so accepting it
 * is just calling the handler that would have run.
 */
export function useConfirmSubmit(onSubmit) {
  const [pending, setPending] = useState(null);

  return {
    confirm: (values) => setPending({ values }),
    dialogProps: {
      open: pending != null,
      onOpenChange: (open) => {
        if (!open) setPending(null);
      },
      onConfirm: () => {
        const held = pending;
        setPending(null);
        // Null only if the dialog was dismissed in the same tick — the form's
        // own pending state takes over from here.
        if (held) onSubmit(held.values);
      },
    },
  };
}

export default useConfirmSubmit;
