import { formatCurrency } from "@/lib/format-currency";
import React from "react";

interface CurrencyLimitDisplayProps {
  amount: number;
  className?: string;
}

const MAX_AMOUNT = 100_000_000_000;
const MAX_AMOUNT_TEXT = ">100.000.000.000đ";

export const CurrencyLimitDisplay: React.FC<CurrencyLimitDisplayProps> = ({
  amount,
  className,
}) => {
  const displayString =
    amount > MAX_AMOUNT ? MAX_AMOUNT_TEXT : formatCurrency(amount);

  return <span className={className}>{displayString}</span>;
};
