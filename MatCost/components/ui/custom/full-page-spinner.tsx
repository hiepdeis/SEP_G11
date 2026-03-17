import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface FullPageSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export function FullPageSpinner({
  className,
  text = "Loading...",
  ...props
}: FullPageSpinnerProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex h-screen w-screen items-center justify-center bg-white fixed inset-0 z-50",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">{t(text)}</p>
      </div>
    </div>
  );
}
