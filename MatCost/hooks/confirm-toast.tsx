import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface ConfirmToastProps {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

// Component riêng để xử lý logic click outside và giao diện
const ConfirmToast = ({
  id,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmToastProps & { id: string | number }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Nếu click ra ngoài ref của toast thì đóng toast
      if (ref.current && !ref.current.contains(event.target as Node)) {
        toast.dismiss(id);
        if (onCancel) onCancel();
      }
    };

    // Thêm delay nhỏ để tránh sự kiện click mở toast kích hoạt luôn việc đóng
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [id, onCancel]);

  const handleConfirm = async () => {
    await onConfirm();
    toast.dismiss(id);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    toast.dismiss(id);
  };

  return (
    <div
      ref={ref}
      className="flex flex-col gap-3 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg shadow-lg"
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <button
          onClick={handleCancel}
          className="text-xs font-medium px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-300 cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          onClick={handleConfirm}
          className="text-xs font-medium px-3 py-2 rounded-md bg-primary text-white hover:bg-indigo-500 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};

export const showConfirmToast = ({
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmToastProps) => {
  // Sử dụng toast.custom thay vì toast thường
  toast.custom((id) => (
    <ConfirmToast
      id={id}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  ), {
    duration: Infinity, // Giữ vô hạn cho đến khi click (hoặc click ra ngoài)
  });
};