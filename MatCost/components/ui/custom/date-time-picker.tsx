"use client";

import * as React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
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
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disablePastDates = false,
  minDate,
  disabled = false,
}: DateTimePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(value, "HH:mm") : "12:00",
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes] = timeValue.split(":");
      selectedDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      onChange(selectedDate);
    } else {
      onChange(undefined);
    }
  };

  // Hàm mới: Xử lý khi nhập trực tiếp vào input date
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value;
    if (!newDateStr) {
      onChange(undefined);
      return;
    }

    const [year, month, day] = newDateStr.split("-").map(Number);
    const newDate = value ? new Date(value) : new Date();
    newDate.setFullYear(year, month - 1, day);

    const [hours, minutes] = timeValue.split(":");
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    onChange(newDate);
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

  // Tính toán chuỗi minDate cho input type="date"
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const customMinStr = minDate ? format(minDate, "yyyy-MM-dd") : undefined;
  const minInputDate = disablePastDates
    ? customMinStr && customMinStr > todayStr
      ? customMinStr
      : todayStr
    : customMinStr;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "group w-full justify-start text-left font-normal bg-white",
            !value && "text-slate-500",
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-indigo-600 group-hover:text-white" />
          {value ? (
            format(value, "dd/MM/yyyy HH:mm", { locale: vi })
          ) : (
            <span>
              {disabled ? "-" : placeholder || t("Pick a date and time")}
            </span>
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
          locale={vi}
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
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-3">
          {/* Input nhập Ngày */}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              {t("Date")}
            </span>
            <Input
              type="date"
              value={value ? format(value, "yyyy-MM-dd") : ""}
              onChange={handleDateInputChange}
              min={minInputDate}
              className="w-auto h-8 text-sm focus-visible:ring-indigo-600 bg-white"
            />
          </div>

          {/* Input nhập Giờ */}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock className="w-4 h-4 text-indigo-600" />
              {t("Time")}
            </span>
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="w-auto h-8 text-sm focus-visible:ring-indigo-600 bg-white"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
