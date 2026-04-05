"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder?: string;
  disablePastDates?: boolean;
  minDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disablePastDates = false,
  minDate,
}: DateTimePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  // Lưu state giờ riêng để khi đổi ngày không bị mất giờ đã chọn
  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(value, "HH:mm") : "12:00",
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Gắn giờ hiện tại vào ngày vừa chọn
      const [hours, minutes] = timeValue.split(":");
      selectedDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      onChange(selectedDate);
    } else {
      onChange(undefined);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    if (value && newTime) {
      const [hours, minutes] = newTime.split(":");
      const newDate = new Date(value);
      newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      onChange(newDate);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "group w-full justify-start text-left font-normal bg-white",
            !value && "text-slate-500",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-indigo-600 group-hover:text-white" />
          {value ? (
            format(value, "dd/MM/yyyy HH:mm")
          ) : (
            <span>{placeholder || t("Pick a date and time")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 shadow-lg border-slate-200"
        align="start"
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          initialFocus
          className="p-3"
          disabled={(date) => {
            if (
              disablePastDates &&
              date < new Date(new Date().setHours(0, 0, 0, 0))
            )
              return true;
            if (
              minDate &&
              date < new Date(new Date(minDate).setHours(0, 0, 0, 0))
            )
              return true;
            return false;
          }}
        />
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              {t("Time")}
            </span>
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="ml-auto w-32 h-8 text-sm focus-visible:ring-indigo-600 bg-white"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
