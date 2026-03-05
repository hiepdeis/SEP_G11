import { toast } from "sonner";

interface ConfirmToastProps {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const showConfirmToast = ({
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmToastProps) => {
  toast(title, {
    description: description,
    duration: 5000,
    action: {
      label: confirmLabel,
      onClick: async () => {
        await onConfirm();
      },
    },
    cancel: {
      label: cancelLabel,
      onClick: () => {
        if (onCancel) onCancel();
      },
    },
  });
};
