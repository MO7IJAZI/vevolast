import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface MonthYearSelectorProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export function MonthYearSelector({
  month,
  year,
  onMonthChange,
  onYearChange,
}: MonthYearSelectorProps) {
  const { t, direction } = useLanguage();
  const [isYearOpen, setIsYearOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: t(`month.${i + 1}`),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <DropdownMenu open={isYearOpen} onOpenChange={setIsYearOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[120px] justify-between gap-2"
              data-testid="button-year-selector"
            >
              <span className="font-semibold">{year}</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isYearOpen && "rotate-180"
              )} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align={direction === "rtl" ? "end" : "start"}
            className="max-h-[280px] overflow-y-auto"
          >
            {years.map((y) => (
              <DropdownMenuItem
                key={y}
                onClick={() => onYearChange(y)}
                className="flex items-center gap-3"
                data-testid={`option-year-${y}`}
              >
                <span className={cn(
                  "w-5 flex items-center justify-center shrink-0",
                  direction === "rtl" ? "order-first" : "order-last"
                )}>
                  {year === y && <Check className="h-4 w-4 text-primary" />}
                </span>
                <span className="flex-1">{y}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {months.map((m) => (
          <Button
            key={m.value}
            variant={month === m.value ? "default" : "outline"}
            size="sm"
            onClick={() => onMonthChange(m.value)}
            className={cn(
              "h-10 text-sm font-medium transition-all",
              month === m.value && "shadow-md"
            )}
            data-testid={`button-month-${m.value}`}
          >
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
