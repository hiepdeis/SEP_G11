"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface QuantityInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  precision?: number;
  maxLength?: number;
}

export function QuantityInput({
  value,
  onValueChange,
  precision = 3,
  maxLength = 15,
  ...props
}: QuantityInputProps) {
  const [localValue, setLocalValue] = React.useState<string>(
    value !== null && value !== undefined ? String(value) : "",
  );

  // Sync internal state with external value changes
  React.useEffect(() => {
    if (value === null || value === undefined) {
      setLocalValue("");
    } else {
      const numValue = parseFloat(localValue);
      if (numValue !== value) {
        setLocalValue(String(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(",", ".");
    
    // Only allow numbers and one decimal point
    const parts = raw.split(".");
    if (parts.length > 2) return; // Ignore if more than one dot
    
    // Pattern to filter numeric chars + dot
    let sanitized = raw.replace(/[^\d.]/g, "");

    // Enforce precision
    if (precision === 0) {
      sanitized = sanitized.replace(".", "");
    } else if (sanitized.includes(".")) {
      const [int, dec] = sanitized.split(".");
      sanitized = `${int}.${dec.slice(0, precision)}`;
    }
    
    // Enforce maxLength
    sanitized = sanitized.slice(0, maxLength);

    setLocalValue(sanitized);

    if (sanitized === "" || sanitized === ".") {
      onValueChange(null);
    } else {
      const parsed = parseFloat(sanitized);
      if (!isNaN(parsed)) {
        onValueChange(parsed);
      }
    }
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
    />
  );
}
