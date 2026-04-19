"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
> {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  maxLength?: number;
}

export function CurrencyInput({
  value,
  onValueChange,
  onKeyDown,
  maxLength = 15,
  ...props
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (!rawValue) {
      onValueChange(null);
      return;
    }

    // Strip non-numeric chars, remove leading zeros, and slice to maxLength
    const sanitized = rawValue
      .replace(/[^\d]/g, "")
      .replace(/^0+/, "")
      .slice(0, maxLength);

    if (sanitized === "") {
      onValueChange(null);
    } else {
      onValueChange(parseInt(sanitized, 10));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent decimal point and comma
    if (e.key === "." || e.key === ",") {
      e.preventDefault();
    }
    onKeyDown?.(e);
  };

  return (
    <Input
      {...props}
      type="number"
      min="0"
      value={value ?? ""}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}
