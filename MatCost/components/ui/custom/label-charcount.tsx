import * as React from "react";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  currentLength?: number;
  maxLength?: number;
}

const LabelCharCount = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", children, currentLength, maxLength, ...props }, ref) => {
    
    const showCounter = maxLength !== undefined && currentLength !== undefined;
    const isOverLimit = showCounter && (currentLength! > maxLength!);

    return (
      <label
        ref={ref}
        className={`flex w-full items-center justify-between text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 ${className}`}
        {...props}
      >
        <span>{children}</span>

        {showCounter && (
          <span 
            className={`text-xs ml-2 transition-colors ${
              isOverLimit ? "text-red-500 font-bold" : "text-slate-400 font-normal"
            }`}
          >
            {currentLength} / {maxLength}
          </span>
        )}
      </label>
    );
  }
);

LabelCharCount.displayName = "Label";

export { LabelCharCount };