import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type Employee } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";
import { EmployeeAvatar } from "./employee-avatar";

interface EmployeeChipProps {
  employeeId: string;
  onClick?: (employee: Employee) => void;
  variant?: "sales" | "assigned" | "service";
  showRole?: boolean;
  size?: "sm" | "default";
}

export function EmployeeChip({
  employeeId,
  onClick,
  variant = "assigned",
  showRole = true,
  size = "default",
}: EmployeeChipProps) {
  const { language } = useLanguage();
  const { employees } = useData();

  const employee = employees.find((e) => e.id === employeeId);
  if (!employee) return null;

  const name = language === "ar" ? employee.name : (employee.nameEn || employee.name);
  const role = language === "ar" ? (employee.roleAr || employee.role) : employee.role;

  // Use semantic colors without custom hover states - Badge handles hover interactions
  const variantStyles = {
    sales: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    assigned: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    service: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  };

  const handleClick = () => {
    if (onClick && employee) {
      onClick(employee);
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer border-0 font-normal gap-1.5 pe-2",
        variantStyles[variant],
        size === "sm" ? "text-xs ps-0.5" : "text-sm ps-1"
      )}
      onClick={handleClick}
      data-testid={`chip-employee-${employeeId}`}
    >
      <EmployeeAvatar 
        name={employee.name}
        nameEn={employee.nameEn}
        profileImage={employee.profileImage}
        size="xs"
      />
      {showRole ? `${name} (${role})` : name}
    </Badge>
  );
}

interface EmployeeChipsProps {
  employeeIds: string[];
  onClick?: (employee: Employee) => void;
  variant?: "sales" | "assigned" | "service";
  showRole?: boolean;
  maxVisible?: number;
  size?: "sm" | "default";
  className?: string;
}

export function EmployeeChips({
  employeeIds,
  onClick,
  variant = "assigned",
  showRole = true,
  maxVisible,
  size = "default",
  className,
}: EmployeeChipsProps) {
  const { language } = useLanguage();
  const safeIds = Array.isArray(employeeIds) ? employeeIds : [];
  const visibleIds = maxVisible ? safeIds.slice(0, maxVisible) : safeIds;
  const hiddenCount = maxVisible ? Math.max(0, safeIds.length - maxVisible) : 0;

  if (safeIds.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleIds.map((id) => (
        <EmployeeChip
          key={id}
          employeeId={id}
          onClick={onClick}
          variant={variant}
          showRole={showRole}
          size={size}
        />
      ))}
      {hiddenCount > 0 && (
        <Badge
          variant="outline"
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"
          )}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}
