"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

export interface YearRange {
  from: number | undefined;
  to: number | undefined;
}

interface YearRangePickerProps {
  yearRange: YearRange;
  onYearRangeChange: (range: YearRange) => void;
  className?: string;
}

function SingleYearPicker({
  selectedYear,
  onYearSelect,
  placeholder,
  disabledLabel,
}: {
  selectedYear?: number;
  onYearSelect: (year: number) => void;
  placeholder: string;
  disabledLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [currentDecade, setCurrentDecade] = React.useState(
    selectedYear
      ? Math.floor(selectedYear / 10) * 10
      : Math.floor(new Date().getFullYear() / 10) * 10,
  );

  const years = Array.from({ length: 12 }, (_, i) => currentDecade - 1 + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex-1 justify-start text-left font-normal h-9 bg-white shadow-sm",
            !selectedYear && "text-slate-500",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">
            {selectedYear ? selectedYear.toString() : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-white" align="start">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            onClick={() => setCurrentDecade((prev) => prev - 10)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-slate-700">
            {years[1]} - {years[10]}
          </div>
          <Button
            variant="outline"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            onClick={() => setCurrentDecade((prev) => prev + 10)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {years.map((year, i) => {
            return (
              <Button
                key={year}
                variant={year === selectedYear ? "default" : "ghost"}
                className={cn(
                  "h-9 w-full font-normal",
                  (i === 0 || i === 11) && "text-muted-foreground opacity-50",
                  year === selectedYear &&
                    "bg-indigo-600 text-white hover:bg-indigo-700 font-semibold",
                  year !== selectedYear &&
                    "hover:bg-indigo-500 text-slate-700 hover:text-white",
                )}
                onClick={() => {
                  onYearSelect(year);
                  setOpen(false);
                }}
              >
                {year}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function YearRangePicker({
  yearRange,
  onYearRangeChange,
  className,
}: YearRangePickerProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex items-center gap-2 w-full", className)}>
      <SingleYearPicker
        selectedYear={yearRange.from}
        onYearSelect={(year) => onYearRangeChange({ ...yearRange, from: year })}
        placeholder={t("From Year")}
      />
      <span className="text-slate-300">-</span>
      <SingleYearPicker
        selectedYear={yearRange.to}
        onYearSelect={(year) => onYearRangeChange({ ...yearRange, to: year })}
        placeholder={t("To Year")}
      />
    </div>
  );
}
