import { useState, useRef, useEffect } from "react";
import { Check, X, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type Employee } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";

interface EmployeeMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  label?: string;
  filterDepartment?: string;
  maxDisplay?: number;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function EmployeeMultiSelect({
  selectedIds,
  onChange,
  placeholder,
  label,
  filterDepartment,
  maxDisplay = 3,
  disabled = false,
  className,
  "data-testid": testId,
}: EmployeeMultiSelectProps) {
  const { language } = useLanguage();
  const { employees } = useData();
  const [open, setOpen] = useState(false);

  const t = {
    ar: {
      placeholder: "اختر الموظفين...",
      search: "بحث...",
      noResults: "لا توجد نتائج",
      addMore: "إضافة المزيد",
    },
    en: {
      placeholder: "Select employees...",
      search: "Search...",
      noResults: "No results found",
      addMore: "Add more",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  // Filter employees by department if specified
  const filteredEmployees = filterDepartment
    ? (Array.isArray(employees) ? employees : []).filter((e) => e.department === filterDepartment && e.isActive)
    : (Array.isArray(employees) ? employees : []).filter((e) => e.isActive);

  const selectedEmployees = (Array.isArray(selectedIds) ? selectedIds : [])
    .map((id) => (Array.isArray(employees) ? employees : []).find((e) => e.id === id))
    .filter(Boolean) as Employee[];

  const toggleEmployee = (employeeId: string) => {
    const currentIds = Array.isArray(selectedIds) ? selectedIds : [];
    if (currentIds.includes(employeeId)) {
      onChange(currentIds.filter((id) => id !== employeeId));
    } else {
      onChange([...currentIds, employeeId]);
    }
  };

  const removeEmployee = (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIds = Array.isArray(selectedIds) ? selectedIds : [];
    onChange(currentIds.filter((id) => id !== employeeId));
  };

  const getEmployeeName = (emp: Employee) =>
    language === "ar" ? emp.name : (emp.nameEn || emp.name);

  const getEmployeeRole = (emp: Employee) =>
    language === "ar" ? (emp.roleAr || emp.role) : emp.role;

  const visibleEmployees = selectedEmployees.slice(0, maxDisplay);
  const hiddenCount = Math.max(0, selectedEmployees.length - maxDisplay);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !selectedIds.length && "text-muted-foreground"
            )}
            data-testid={testId}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedEmployees.length === 0 ? (
                <span>{placeholder || content.placeholder}</span>
              ) : (
                <>
                  {visibleEmployees.map((emp) => (
                    <Badge
                      key={emp.id}
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5 flex items-center gap-1"
                    >
                      {getEmployeeName(emp)}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={(e) => removeEmployee(emp.id, e)}
                      />
                    </Badge>
                  ))}
                  {hiddenCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0.5"
                    >
                      +{hiddenCount}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={content.search} />
            <CommandList>
              <CommandEmpty>{content.noResults}</CommandEmpty>
              <CommandGroup>
                {Array.isArray(filteredEmployees) && filteredEmployees.map((emp) => {
                  const currentIds = Array.isArray(selectedIds) ? selectedIds : [];
                  const isSelected = currentIds.includes(emp.id);
                  return (
                    <CommandItem
                      key={emp.id}
                      value={`${emp.name} ${emp.nameEn || ""} ${emp.role}`}
                      onSelect={() => toggleEmployee(emp.id)}
                      data-testid={`option-employee-${emp.id}`}
                    >
                      <div
                        className={cn(
                          "me-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex flex-col">
                        <span>{getEmployeeName(emp)}</span>
                        <span className="text-xs text-muted-foreground">
                          {getEmployeeRole(emp)}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
