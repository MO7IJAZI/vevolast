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

  // Use semantic colors without custom hover states - Badge handles hover interactions
  const variantStyles = {
    sales: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    assigned: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    service: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  };

  const employee = employees.find((e) => 
    e.id === employeeId || 
    e.email === employeeId || 
    e.name === employeeId
  );
  
  if (!employee) {
    // Robust fallback for missing employee
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId);
    const displayName = isUuid ? (language === "ar" ? "موظف مجهول" : "Unknown Staff") : employeeId;
    
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-0 font-normal gap-1.5 pe-2",
          variantStyles[variant],
          size === "sm" ? "text-xs ps-0.5" : "text-sm ps-1"
        )}
      >
        {displayName}
      </Badge>
    );
  }

  const name = language === "ar" ? employee.name : (employee.nameEn || employee.name);
  // Robust role fallback
  const role = language === "ar" 
    ? (employee.roleAr || employee.role || employee.department || "N/A") 
    : (employee.role || employee.department || "N/A");

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
  const { employees } = useData();
  
  // Deduplicate and filter IDs to avoid showing "Unknown Staff" alongside resolved names
  const safeIds = Array.isArray(employeeIds) ? employeeIds : [];
  
  // Resolve all IDs to their display names/employees
  const resolved = safeIds.map(id => {
    const emp = employees.find(e => e.id === id || e.email === id || e.name === id);
    return { id, employee: emp };
  });

  // Filter out IDs that resolve to "Unknown Staff" if we have at least one valid employee
  // OR just deduplicate based on employee ID if multiple IDs point to same employee
  const uniqueEmployees = new Map();
  const unknownIds = new Set();

  resolved.forEach(item => {
    if (item.employee) {
      uniqueEmployees.set(item.employee.id, item.id);
    } else {
      unknownIds.add(item.id);
    }
  });

  let finalIds = Array.from(uniqueEmployees.values());
  
  // Only add unknown IDs if we have NO valid employees, or if it's explicitly needed
  // For now, let's just show unknown IDs only if they are the ONLY ones
  if (finalIds.length === 0) {
    finalIds = Array.from(unknownIds);
  }

  const visibleIds = maxVisible ? finalIds.slice(0, maxVisible) : finalIds;
  const hiddenCount = maxVisible ? Math.max(0, finalIds.length - maxVisible) : 0;

  if (finalIds.length === 0) return null;

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
