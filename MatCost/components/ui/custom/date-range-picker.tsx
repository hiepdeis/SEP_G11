"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex items-center gap-2 w-full", className)}>
      <Popover>
        <PopoverTrigger className="w-full" asChild>
          <Button
            variant="outline"
            className={cn(
              "flex-1 justify-start text-left font-normal h-9 bg-white shadow-sm",
              !dateRange.from && "text-slate-500",
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {dateRange.from
                ? format(dateRange.from, "dd/MM/yyyy")
                : t("From")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange.from}
            onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <span className="text-slate-300">-</span>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex-1 justify-start text-left font-normal h-9 bg-white shadow-sm",
              !dateRange.to && "text-slate-500",
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : t("To")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange.to}
            onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
            disabled={(date) =>
              dateRange.from ? date < dateRange.from : false
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
