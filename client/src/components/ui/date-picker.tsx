import { useState, useRef } from "react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  "data-testid": testId,
}: DatePickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const date = value ? new Date(value) : undefined;
  const locale = language === "ar" ? ar : enUS;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && onChange) {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      onChange(formattedDate);
    }
    setOpen(false);
  };

  const displayValue = date
    ? format(date, "dd/MM/yyyy", { locale })
    : placeholder || (language === "ar" ? "اختر تاريخ" : "Pick a date");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-start font-normal",
            !date && "text-muted-foreground",
            className
          )}
          data-testid={testId}
        >
          <span className="truncate">{displayValue}</span>
          <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={locale}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  "data-testid": testId,
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.showPicker?.();
      inputRef.current.focus();
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className={cn(
        "relative flex items-center w-full cursor-pointer",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input
        ref={inputRef}
        type="date"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background ps-3 pe-10 py-1 text-sm shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        )}
        data-testid={testId}
      />
      <CalendarIcon className="absolute end-3 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}
