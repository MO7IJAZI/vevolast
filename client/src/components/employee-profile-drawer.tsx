import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeAvatar } from "./employee-avatar";
import {
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  DollarSign,
  Target,
  Palette,
  Code,
  FileText,
  Zap,
} from "lucide-react";
import { EmployeeWorkStats } from "@/components/work-tracking/employee-work-stats";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { useData, type Employee, jobTitleLabels } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";

interface EmployeeProfileDrawerProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

// Department label translations
const departmentLabels: Record<string, { ar: string; en: string }> = {
  sales: { ar: "المبيعات", en: "Sales" },
  delivery: { ar: "التنفيذ", en: "Delivery" },
  tech: { ar: "التطوير", en: "Tech" },
  admin: { ar: "الإدارة", en: "Admin" },
  marketing: { ar: "التسويق", en: "Marketing" },
  creative: { ar: "الإبداع", en: "Creative" },
};

// Get month options for filter
function getMonthOptions(language: string) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      month: "long",
      year: "numeric",
    });
    months.push({ value, label });
  }
  return months;
}

export function EmployeeProfileDrawer({
  employee,
  isOpen,
  onClose,
}: EmployeeProfileDrawerProps) {
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const { clients, leads } = useData();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const monthOptions = useMemo(() => getMonthOptions(language), [language]);

  if (!employee) return null;

  const name = language === "ar" ? employee.name : (employee.nameEn || employee.name);
  const role = language === "ar" ? (employee.roleAr || employee.role) : employee.role;
  const departmentLabel = employee.department && departmentLabels[employee.department]
    ? (language === "ar" ? departmentLabels[employee.department].ar : departmentLabels[employee.department].en)
    : employee.department;

  // Get job title label
  const jobTitleLabel = employee.jobTitle && jobTitleLabels[employee.jobTitle]
    ? (language === "ar" ? jobTitleLabels[employee.jobTitle].ar : jobTitleLabels[employee.jobTitle].en)
    : null;

  // Filter by selected month
  const isInSelectedMonth = (dateStr?: string) => {
    if (!dateStr || selectedMonth === "all") return true;
    const date = new Date(dateStr);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return monthKey === selectedMonth;
  };

  // Calculate stats
  const assignedClients = clients.filter(
    (c) =>
      c.salesOwners?.includes(employee.id) ||
      c.assignedStaff?.includes(employee.id) ||
      c.salesOwnerId === employee.id ||
      c.assignedManagerId === employee.id
  );

  const activeClients = assignedClients.filter((c) => c.status === "active");

  const assignedServices = clients.flatMap((c) =>
    c.services.filter(
      (s) =>
        s.serviceAssignees?.includes(employee.id) ||
        s.assignedTo === employee.name ||
        s.assignedTo === employee.nameEn
    )
  );

  // Filter services by month (using client start date as proxy)
  const filteredServices = assignedServices.filter((s) => isInSelectedMonth(s.startDate));

  const assignedLeads = leads.filter((l) => l.negotiatorId === employee.id);

  // Calculate total revenue (for sales employees)
  const totalRevenue = assignedClients.reduce((sum, client) => {
    return (
      sum +
      client.services.reduce((svcSum, svc) => {
        return svcSum + (convertAmount(svc.price || 0, svc.currency || "USD") || 0);
      }, 0)
    );
  }, 0);

  // Count completed services
  const completedServices = filteredServices.filter((s) => s.status === "completed").length;

  // Calculate conversion rate (for sales)
  const conversionRate = assignedLeads.length > 0
    ? Math.round((assignedClients.length / (assignedClients.length + assignedLeads.length)) * 100)
    : 0;

  const t = {
    ar: {
      title: "معلومات الموظف",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      role: "المسمى الوظيفي",
      specialization: "التخصص",
      department: "القسم",
      startDate: "تاريخ الانضمام",
      status: "الحالة",
      active: "نشط",
      inactive: "غير نشط",
      stats: "الإحصائيات",
      assignedClients: "العملاء المسندين",
      activeClients: "العملاء النشطين",
      assignedServices: "الخدمات المسندة",
      completedServices: "الخدمات المكتملة",
      assignedLeads: "العملاء المحتملين",
      revenueAttribued: "الإيرادات",
      conversionRate: "معدل التحويل",
      notAvailable: "غير متوفر",
      salary: "الراتب",
      salaryType: "نوع الراتب",
      monthly: "شهري",
      perProject: "لكل مشروع",
      perTask: "لكل مهمة",
      perService: "لكل خدمة",
      allTime: "كل الوقت",
      filterByMonth: "تصفية حسب الشهر",
      // Role-specific KPI titles
      salesKPI: "أداء المبيعات",
      deliveryKPI: "أداء التسليم",
      techKPI: "أداء التطوير",
      adminKPI: "الإشراف الإداري",
    },
    en: {
      title: "Employee Details",
      email: "Email",
      phone: "Phone",
      role: "Job Title",
      specialization: "Specialization",
      department: "Department",
      startDate: "Joined Date",
      status: "Status",
      active: "Active",
      inactive: "Inactive",
      stats: "Statistics",
      assignedClients: "Assigned Clients",
      activeClients: "Active Clients",
      assignedServices: "Assigned Services",
      completedServices: "Completed Services",
      assignedLeads: "Assigned Leads",
      revenueAttribued: "Revenue",
      conversionRate: "Conversion Rate",
      notAvailable: "N/A",
      salary: "Salary",
      salaryType: "Salary Type",
      monthly: "Monthly",
      perProject: "Per Project",
      perTask: "Per Task",
      perService: "Per Service",
      allTime: "All Time",
      filterByMonth: "Filter by Month",
      // Role-specific KPI titles
      salesKPI: "Sales Performance",
      deliveryKPI: "Delivery Performance",
      techKPI: "Development Performance",
      adminKPI: "Admin Oversight",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const getSalaryTypeLabel = () => {
    if (employee.salaryType === "monthly") return content.monthly;
    return content.perProject;
  };

  const getRateTypeLabel = () => {
    if (employee.rateType === "per_task") return content.perTask;
    if (employee.rateType === "per_service") return content.perService;
    return content.perProject;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={language === "ar" ? "left" : "right"}
        className="w-full sm:max-w-md overflow-y-auto"
        data-testid="drawer-employee-profile"
      >
        <SheetHeader className="text-start">
          <div className="flex items-center gap-4 mb-4">
            <EmployeeAvatar 
              name={employee.name}
              nameEn={employee.nameEn}
              profileImage={employee.profileImage}
              size="xl"
            />
            <div>
              <SheetTitle className="text-xl">{name}</SheetTitle>
              <SheetDescription className="text-base">{role}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Salary Type Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {employee.isActive ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle2 className="h-3 w-3 me-1" />
                {content.active}
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <XCircle className="h-3 w-3 me-1" />
                {content.inactive}
              </Badge>
            )}
            <Badge className={cn(
              employee.salaryType === "monthly" 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
            )}>
              <DollarSign className="h-3 w-3 me-1" />
              {getSalaryTypeLabel()}
            </Badge>
          </div>

          {/* Contact Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span dir="ltr">{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-col">
                  <span>{role}</span>
                  {jobTitleLabel && jobTitleLabel !== role && (
                    <span className="text-xs text-muted-foreground">{content.specialization}: {jobTitleLabel}</span>
                  )}
                </div>
              </div>
              {employee.department && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{departmentLabel}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{employee.startDate}</span>
              </div>
            </CardContent>
          </Card>

          {/* Salary Details */}
          {(isAdmin || (user?.id === employee.id)) && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-medium">{content.salary}</span>
                </div>
                {employee.salaryType === "monthly" ? (
                  <div>
                    <span className="text-2xl font-bold">
                      {formatCurrency(
                        convertAmount(employee.salaryAmount || 0, (employee.salaryCurrency || "USD") as Currency, displayCurrency),
                        displayCurrency
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground ms-2">/ {content.monthly.toLowerCase()}</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-2xl font-bold">
                      {formatCurrency(
                        convertAmount(employee.rate || 0, (employee.salaryCurrency || "USD") as Currency, displayCurrency),
                        displayCurrency
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground ms-2">
                      / {getRateTypeLabel()}
                    </span>
                  </div>
                )}
                {employee.salaryNotes && (
                  <p className="text-sm text-muted-foreground mt-2">{employee.salaryNotes}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{content.filterByMonth}:</span>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]" data-testid="select-month-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{content.allTime}</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role-Based KPIs */}
          {employee.department === "sales" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold">{content.salesKPI}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {assignedClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedClients}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {assignedLeads.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedLeads}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {conversionRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.conversionRate}
                    </div>
                  </CardContent>
                </Card>
                {isAdmin && (
                  <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
                    <CardContent className="p-3 text-center">
                      <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                        {formatCurrency(totalRevenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {content.revenueAttribued}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Delivery/Creative KPIs */}
          {employee.department === "delivery" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">{content.deliveryKPI}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredServices.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedServices}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {completedServices}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.completedServices}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {assignedClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedClients}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {activeClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.activeClients}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tech/Development KPIs */}
          {employee.department === "tech" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Code className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold">{content.techKPI}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {filteredServices.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedServices}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {completedServices}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.completedServices}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {assignedClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedClients}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {activeClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.activeClients}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Admin KPIs */}
          {employee.department === "admin" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">{content.adminKPI}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {assignedClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedClients}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {activeClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.activeClients}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Fallback for other departments */}
          {!["sales", "delivery", "tech", "admin"].includes(employee.department || "") && (
            <div>
              <h3 className="font-semibold mb-3">{content.stats}</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {assignedClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedClients}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {activeClients.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.activeClients}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredServices.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedServices}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {assignedLeads.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {content.assignedLeads}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Work Tracking Stats from Database */}
          <EmployeeWorkStats employeeId={employee.id} department={employee.department} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
