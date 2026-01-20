import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  noPadding?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, noPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-xl border border-slate-200/80 shadow-md transition-all duration-300",

          noPadding ? "p-0" : "p-6",

          interactive &&
            "hover:shadow-xl hover:-translate-y-1 hover:border-slate-300",

          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

export { Card };
