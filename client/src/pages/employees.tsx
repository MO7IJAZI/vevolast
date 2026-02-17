import { useState, useMemo } from "react";
import {
  Plus,
  UserCircle,
  Mail,
  Phone,
  Pencil,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  Users,
  Briefcase,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Target,
  Building2,
  ExternalLink,
  Send,
  Loader2,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { AvatarUpload } from "@/components/avatar-upload";
import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { useData, type Employee, type JobTitle, jobTitleLabels, jobTitlesByDepartment } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";

// Department definitions
const departments = {
  sales: {
    labelAr: "المبيعات",
    labelEn: "Sales",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  delivery: {
    labelAr: "التنفيذ",
    labelEn: "Delivery",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  tech: {
    labelAr: "التطوير",
    labelEn: "Tech",
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  admin: {
    labelAr: "الإدارة",
    labelEn: "Admin",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
};

type Department = keyof typeof departments;

export default function EmployeesPage() {
  const { language } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { employees, clients, leads, invoices, addEmployee, updateEmployee, deleteEmployee } = useData();
  const [, navigate] = useLocation();
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">("all");
  
  // Profile drawer state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Invite Link Modal State
  const [inviteLinkData, setInviteLinkData] = useState<string | null>(null);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    email: "",
    phone: "",
    role: "",
    roleAr: "",
    department: "delivery" as Department,
    jobTitle: undefined as JobTitle | undefined,
    profileImage: undefined as string | undefined,
    salaryType: "monthly" as "monthly" | "per_project",
    salaryAmount: "",
    rate: "",
    rateType: "per_project" as "per_project" | "per_task" | "per_service",
    salaryCurrency: "TRY" as "TRY" | "USD" | "EUR" | "SAR",
    salaryNotes: "",
    isActive: true,
    systemRole: "viewer" as "admin" | "sales" | "execution" | "finance" | "viewer",
    permissions: [] as string[],
    sendInvitation: false,
  });

  // System roles with permissions
  const systemRoles = {
    admin: {
      labelAr: "مدير النظام",
      labelEn: "Admin",
      description: language === "ar" ? "صلاحيات كاملة" : "Full access",
    },
    sales: {
      labelAr: "مبيعات",
      labelEn: "Sales",
      description: language === "ar" ? "إدارة العملاء والفواتير" : "Manage clients and invoices",
    },
    execution: {
      labelAr: "تنفيذ",
      labelEn: "Execution",
      description: language === "ar" ? "تنفيذ المهام" : "Execute tasks",
    },
    finance: {
      labelAr: "مالية",
      labelEn: "Finance",
      description: language === "ar" ? "إدارة الفواتير والمالية" : "Manage invoices and finance",
    },
    viewer: {
      labelAr: "مشاهد",
      labelEn: "Viewer",
      description: language === "ar" ? "عرض فقط" : "View only",
    },
  };

  // Available permissions - aligned with PermissionEnum in shared/schema.ts
  const permissionsList = [
    { key: "view_clients", labelAr: "عرض العملاء", labelEn: "View Clients" },
    { key: "edit_clients", labelAr: "تعديل العملاء", labelEn: "Edit Clients" },
    { key: "view_leads", labelAr: "عرض العملاء المحتملين", labelEn: "View Leads" },
    { key: "edit_leads", labelAr: "تعديل العملاء المحتملين", labelEn: "Edit Leads" },
    { key: "create_packages", labelAr: "إنشاء الباقات", labelEn: "Create Packages" },
    { key: "edit_packages", labelAr: "تعديل الباقات", labelEn: "Edit Packages" },
    { key: "view_invoices", labelAr: "عرض الفواتير", labelEn: "View Invoices" },
    { key: "create_invoices", labelAr: "إنشاء الفواتير", labelEn: "Create Invoices" },
    { key: "edit_invoices", labelAr: "تعديل الفواتير", labelEn: "Edit Invoices" },
    { key: "view_goals", labelAr: "عرض الأهداف", labelEn: "View Goals" },
    { key: "edit_goals", labelAr: "تعديل الأهداف", labelEn: "Edit Goals" },
    { key: "view_finance", labelAr: "عرض المالية", labelEn: "View Finance" },
    { key: "edit_finance", labelAr: "تعديل المالية", labelEn: "Edit Finance" },
    { key: "assign_employees", labelAr: "تعيين الموظفين", labelEn: "Assign Employees" },
    { key: "edit_work_tracking", labelAr: "تعديل متابعة العمل", labelEn: "Edit Work Tracking" },
    { key: "archive_clients", labelAr: "أرشفة العملاء", labelEn: "Archive Clients" },
    { key: "view_employees", labelAr: "عرض الموظفين", labelEn: "View Employees" },
    { key: "edit_employees", labelAr: "تعديل الموظفين", labelEn: "Edit Employees" },
  ];

  // Role default permissions - aligned with server/auth.ts roleDefaultPermissions
  const roleDefaultPerms: Record<string, string[]> = {
    admin: permissionsList.map(p => p.key),
    sales: ["view_clients", "edit_clients", "view_leads", "edit_leads", "view_goals", "assign_employees"],
    execution: ["view_clients", "view_goals", "edit_work_tracking"],
    finance: ["view_clients", "view_goals"],
    viewer: ["view_clients", "view_leads", "view_goals"],
  };

  const t = useMemo(() => ({
    title: language === "ar" ? "الموظفين" : "Employees",
    subtitle: language === "ar" ? "إدارة فريق العمل ومتابعة المهام" : "Manage team members and track assignments",
    emptyTitle: language === "ar" ? "لا يوجد موظفين بعد" : "No employees yet",
    emptySubtitle: language === "ar" ? "أضف فريق العمل لتتبع المهام والأداء" : "Add your team to track tasks and performance",
    addEmployee: language === "ar" ? "إضافة موظف" : "Add Employee",
    editEmployee: language === "ar" ? "تعديل الموظف" : "Edit Employee",
    basicInfo: language === "ar" ? "المعلومات الأساسية" : "Basic Info",
    nameAr: language === "ar" ? "الاسم (عربي)" : "Name (Arabic)",
    nameEn: language === "ar" ? "الاسم (إنجليزي)" : "Name (English)",
    email: language === "ar" ? "البريد الإلكتروني" : "Email",
    phone: language === "ar" ? "الهاتف" : "Phone",
    role: language === "ar" ? "المسمى الوظيفي (إنجليزي)" : "Job Title (English)",
    roleAr: language === "ar" ? "المسمى الوظيفي (عربي)" : "Job Title (Arabic)",
    department: language === "ar" ? "القسم" : "Department",
    selectDepartment: language === "ar" ? "اختر القسم" : "Select Department",
    jobTitle: language === "ar" ? "التخصص" : "Specialization",
    selectJobTitle: language === "ar" ? "اختر التخصص" : "Select Specialization",
    salary: language === "ar" ? "الراتب" : "Salary",
    salaryType: language === "ar" ? "نوع الراتب" : "Salary Type",
    monthly: language === "ar" ? "شهري" : "Monthly",
    perProject: language === "ar" ? "لكل مشروع" : "Per Project",
    salaryAmount: language === "ar" ? "مبلغ الراتب" : "Salary Amount",
    rate: language === "ar" ? "المعدل" : "Rate",
    rateType: language === "ar" ? "نوع المعدل" : "Rate Type",
    perTask: language === "ar" ? "لكل مهمة" : "Per Task",
    perService: language === "ar" ? "لكل خدمة" : "Per Service",
    salaryNotes: language === "ar" ? "ملاحظات الراتب" : "Salary Notes",
    isActive: language === "ar" ? "نشط" : "Active",
    save: language === "ar" ? "حفظ" : "Save",
    cancel: language === "ar" ? "إلغاء" : "Cancel",
    edit: language === "ar" ? "تعديل" : "Edit",
    delete: language === "ar" ? "حذف" : "Delete",
    viewProfile: language === "ar" ? "عرض الملف" : "View Profile",
    search: language === "ar" ? "بحث..." : "Search...",
    allDepartments: language === "ar" ? "جميع الأقسام" : "All Departments",
    active: language === "ar" ? "نشط" : "Active",
    inactive: language === "ar" ? "غير نشط" : "Inactive",
    startDate: language === "ar" ? "تاريخ البدء" : "Start Date",
    
    // Profile drawer
    employeeProfile: language === "ar" ? "ملف الموظف" : "Employee Profile",
    summary: language === "ar" ? "ملخص" : "Summary",
    currentlyWorkingOn: language === "ar" ? "المهام الحالية" : "Currently Working On",
    salesPerformance: language === "ar" ? "أداء المبيعات" : "Sales Performance",
    assignedClients: language === "ar" ? "العملاء المعينين" : "Assigned Clients",
    activeServices: language === "ar" ? "الخدمات النشطة" : "Active Services",
    overdueServices: language === "ar" ? "خدمات متأخرة" : "Overdue Services",
    leadsAssigned: language === "ar" ? "العملاء المحتملين" : "Leads Assigned",
    confirmedThisMonth: language === "ar" ? "عملاء مؤكدين هذا الشهر" : "Confirmed This Month",
    revenueThisMonth: language === "ar" ? "إيرادات هذا الشهر" : "Revenue This Month",
    openSalesModule: language === "ar" ? "فتح صفحة المبيعات" : "Open Sales Module",
    noActiveAssignments: language === "ar" ? "لا توجد مهام نشطة" : "No active assignments",
    client: language === "ar" ? "العميل" : "Client",
    service: language === "ar" ? "الخدمة" : "Service",
    status: language === "ar" ? "الحالة" : "Status",
    dueDate: language === "ar" ? "تاريخ الاستحقاق" : "Due Date",
    
    // Invitation
    sendInvitation: language === "ar" ? "إرسال دعوة للدخول" : "Send Login Invitation",
    sendInvitationDesc: language === "ar" ? "إرسال بريد إلكتروني للموظف لتعيين كلمة المرور والدخول للنظام" : "Send email to employee to set password and access the system",
    invitationSent: language === "ar" ? "تم إرسال الدعوة" : "Invitation Sent",
    invitationSentDesc: language === "ar" ? "تم إرسال رابط تعيين كلمة المرور إلى البريد الإلكتروني" : "Password setup link has been sent to the email",
    invitationFailed: language === "ar" ? "فشل إرسال الدعوة" : "Invitation Failed",
    emailRequired: language === "ar" ? "البريد الإلكتروني مطلوب لإرسال الدعوة" : "Email is required to send invitation",
    resendInvitation: language === "ar" ? "إعادة إرسال الدعوة" : "Resend Invitation",
  }), [language]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = searchQuery === "" || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.nameEn && emp.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchQuery, departmentFilter]);

  // Calculate employee stats
  const getEmployeeStats = (employee: Employee) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Clients where this employee is assigned (as sales owner or assigned staff)
    const assignedClients = clients.filter((c) => 
      c.salesOwners?.includes(employee.id) ||
      c.assignedStaff?.includes(employee.id) ||
      c.salesOwnerId === employee.id ||
      c.assignedManagerId === employee.id
    );

    // Services assigned to this employee
    const assignedServices: { client: typeof clients[0]; service: typeof clients[0]['services'][0] }[] = [];
    clients.forEach((client) => {
      client.services.forEach((service) => {
        if (service.serviceAssignees?.includes(employee.id) || 
            service.assignedTo === employee.id?.toString() ||
            client.assignedStaff?.includes(employee.id) ||
            client.assignedManagerId === employee.id) {
          assignedServices.push({ client, service });
        }
      });
    });

    // Active (not completed) services
    const activeServices = assignedServices.filter((s) => s.service.status !== "completed");

    // Overdue services
    const overdueServices = activeServices.filter((s) => {
      const dueDate = new Date(s.service.dueDate);
      return dueDate < today;
    });

    // Completed services (for per-project workers)
    const completedServices = assignedServices.filter((s) => s.service.status === "completed");

    // Sales specific stats - leads assigned to this sales employee (via negotiatorId)
    const assignedLeads = leads.filter((l) =>
      l.negotiatorId === employee.id
    );

    // Clients confirmed this month by this employee
    const confirmedThisMonth = clients.filter((c) => {
      if (!c.createdAt) return false;
      const createdDate = new Date(c.createdAt);
      return createdDate.getMonth() + 1 === currentMonth &&
        createdDate.getFullYear() === currentYear &&
        (c.salesOwners?.includes(employee.id) || c.salesOwnerId === employee.id);
    });

    // Revenue from invoices this month
    const revenueThisMonth = invoices
      .filter((inv) => {
        if (!inv.issueDate) return false;
        const invDate = new Date(inv.issueDate);
        const client = clients.find((c) => c.id === inv.clientId);
        return invDate.getMonth() + 1 === currentMonth &&
          invDate.getFullYear() === currentYear &&
          (client?.salesOwners?.includes(employee.id) || client?.salesOwnerId === employee.id);
      })
      .reduce((sum, inv) => sum + convertAmount(inv.amount || 0, inv.currency as any, displayCurrency), 0);

    return {
      assignedClients: assignedClients.length,
      activeServices: activeServices.length,
      overdueServices: overdueServices.length,
      completedServices: completedServices.length,
      assignedLeads: assignedLeads.length,
      confirmedThisMonth: confirmedThisMonth.length,
      revenueThisMonth,
      currentAssignments: activeServices.slice(0, 5), // Top 5 assignments
    };
  };

  const updateFormField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      email: "",
      phone: "",
      role: "",
      roleAr: "",
      department: "delivery",
      jobTitle: undefined,
      profileImage: undefined,
      salaryType: "monthly",
      salaryAmount: "",
      rate: "",
      rateType: "per_project",
      salaryCurrency: "TRY",
      salaryNotes: "",
      isActive: true,
      systemRole: "viewer",
      permissions: roleDefaultPerms["viewer"],
      sendInvitation: false,
    });
    setActiveTab("info");
    setEditingEmployee(null);
  };

  const openModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      const empSystemRole = (employee as any).systemRole || "viewer";
      setFormData({
        name: employee.name,
        nameEn: employee.nameEn || "",
        email: employee.email,
        phone: employee.phone || "",
        role: employee.role,
        roleAr: employee.roleAr || "",
        department: (employee.department as Department) || "delivery",
        jobTitle: employee.jobTitle,
        profileImage: employee.profileImage,
        salaryType: employee.salaryType || "monthly",
        salaryAmount: employee.salaryAmount?.toString() || "",
        rate: employee.rate?.toString() || "",
        rateType: employee.rateType || "per_project",
        salaryCurrency: (employee.salaryCurrency as any) || "TRY",
        salaryNotes: employee.salaryNotes || "",
        isActive: employee.isActive,
        systemRole: empSystemRole,
        permissions: (employee as any).permissions || roleDefaultPerms[empSystemRole] || [],
        sendInvitation: false,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const sendInvitationToEmployee = async (email: string, name: string, nameEn?: string, role?: string, department?: string, employeeId?: string) => {
    try {
      setIsSendingInvite(true);
      const response = await apiRequest("POST", "/api/auth/invite", {
        email,
        name,
        nameEn,
        role: formData.systemRole,
        permissions: formData.permissions,
        department,
        employeeId,
      });
      
      const data = await response.json();
      
      if (!data.emailSent && data.inviteLink) {
        setInviteLinkData(`${window.location.origin}${data.inviteLink}`);
        setShowInviteLinkModal(true);
      }

      toast({
        title: t.invitationSent,
        description: data.emailSent 
          ? t.invitationSentDesc 
          : (language === "ar" ? "تم إنشاء الرابط ولكن فشل إرسال البريد" : "Link created but email failed to send"),
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: t.invitationFailed,
        description: error.message || (language === "ar" ? "حدث خطأ" : "An error occurred"),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.role) return;

    if (isAdmin && !editingEmployee && !formData.email) {
      toast({
        title: t.invitationFailed,
        description: t.emailRequired,
        variant: "destructive",
      });
      return;
    }

    const employeeData = {
      name: formData.name,
      nameEn: formData.nameEn || undefined,
      email: formData.email,
      phone: formData.phone || undefined,
      role: formData.role,
      roleAr: formData.roleAr || undefined,
      department: formData.department,
      jobTitle: formData.jobTitle,
      profileImage: formData.profileImage,
      salaryType: formData.salaryType,
      salaryAmount: formData.salaryAmount ? Number(formData.salaryAmount) : undefined,
      rate: formData.rate ? Number(formData.rate) : undefined,
      rateType: formData.rateType,
      salaryCurrency: formData.salaryCurrency,
      salaryNotes: formData.salaryNotes || undefined,
      isActive: formData.isActive,
      startDate: editingEmployee?.startDate || new Date().toISOString().split("T")[0],
    };

    let newEmployeeId: string | undefined;
    
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, employeeData);
      newEmployeeId = editingEmployee.id;
    } else {
      // For new employees, we need to get the ID after adding
      addEmployee(employeeData);
      // The ID is generated by DataContext, we'll send invite without it
      newEmployeeId = undefined;
    }

    if (isAdmin && !editingEmployee && formData.email) {
      await sendInvitationToEmployee(
        formData.email,
        formData.name,
        formData.nameEn,
        formData.role,
        formData.department,
        newEmployeeId
      );
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteEmployee(id);
  };

  const openProfile = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsProfileOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDepartmentInfo = (dept: string) => {
    return departments[dept as Department] || departments.delivery;
  };

  // Render employee profile drawer
  const renderProfileDrawer = () => {
    if (!selectedEmployee) return null;
    
    const stats = getEmployeeStats(selectedEmployee);
    const deptInfo = getDepartmentInfo(selectedEmployee.department || "delivery");
    const isSales = selectedEmployee.department === "sales";
    const name = language === "ar" ? selectedEmployee.name : (selectedEmployee.nameEn || selectedEmployee.name);
    const role = language === "ar" ? (selectedEmployee.roleAr || selectedEmployee.role) : selectedEmployee.role;

    return (
      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent side={language === "ar" ? "left" : "right"} className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t.employeeProfile}</SheetTitle>
            <SheetDescription>{name}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Employee header */}
            <div className="flex items-start gap-4">
              <EmployeeAvatar 
                name={selectedEmployee.name}
                nameEn={selectedEmployee.nameEn}
                profileImage={selectedEmployee.profileImage}
                size="lg"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{name}</h3>
                <p className="text-muted-foreground">{role}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={cn(deptInfo.bgColor, deptInfo.color)}>
                    {language === "ar" ? deptInfo.labelAr : deptInfo.labelEn}
                  </Badge>
                  <Badge variant={selectedEmployee.isActive ? "default" : "secondary"}>
                    {selectedEmployee.isActive ? t.active : t.inactive}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2 text-sm">
              {selectedEmployee.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{selectedEmployee.email}</span>
                </div>
              )}
              {selectedEmployee.phone && (
                <div className="flex items-center gap-2 text-muted-foreground" dir="ltr">
                  <Phone className="h-4 w-4" />
                  <span>{selectedEmployee.phone}</span>
                </div>
              )}
              {selectedEmployee.startDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t.startDate}: {selectedEmployee.startDate}</span>
                </div>
              )}
            </div>

            {/* Summary cards */}
            <div>
              <h4 className="font-medium mb-3">{t.summary}</h4>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">{t.assignedClients}</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.assignedClients}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-muted-foreground">{t.activeServices}</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.activeServices}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">{t.overdueServices}</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-red-600">{stats.overdueServices}</p>
                  </CardContent>
                </Card>
            {(isAdmin || (user?.id === selectedEmployee.id)) && (
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">{t.salaryType}</span>
                    </div>
                    <div className="mt-1">
                      <Badge className={cn(
                        "text-sm",
                        selectedEmployee?.salaryType === "monthly" 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                      )}>
                        {selectedEmployee?.salaryType === "monthly" ? t.monthly : t.perProject}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                )}
              </div>
            </div>

            {/* Salary Details Section */}
            {(isAdmin || (user?.id === selectedEmployee.id)) && (
              <div className="mt-4">
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                      <DollarSign className="h-5 w-5" />
                      <span className="font-medium">{t.salary}</span>
                    </div>
                    {selectedEmployee?.salaryType === "monthly" ? (
                      <div>
                        <span className="text-2xl font-bold">
                          {formatCurrency(
                            convertAmount(selectedEmployee?.salaryAmount || 0, (selectedEmployee?.salaryCurrency || "USD") as Currency, displayCurrency),
                            displayCurrency
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground ms-2">/ {t.monthly.toLowerCase()}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-2xl font-bold">
                          {formatCurrency(
                            convertAmount(selectedEmployee?.rate || 0, (selectedEmployee?.salaryCurrency || "USD") as Currency, displayCurrency),
                            displayCurrency
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground ms-2">
                          / {selectedEmployee?.rateType === "per_task" ? t.perTask : 
                             selectedEmployee?.rateType === "per_service" ? t.perService : t.perProject}
                        </span>
                      </div>
                    )}
                    {selectedEmployee?.salaryNotes && (
                      <p className="text-sm text-muted-foreground mt-2">{selectedEmployee.salaryNotes}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Sales specific section */}
            {isSales && (
              <div>
                <h4 className="font-medium mb-3">{t.salesPerformance}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm text-muted-foreground">{t.leadsAssigned}</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.assignedLeads}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">{t.confirmedThisMonth}</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.confirmedThisMonth}</p>
                    </CardContent>
                  </Card>
                </div>
                {isAdmin && (
                  <Card className="mt-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-muted-foreground">{t.revenueThisMonth}</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(stats.revenueThisMonth, displayCurrency)}</p>
                    </CardContent>
                  </Card>
                )}
                <Button 
                  variant="outline" 
                  className="w-full mt-3"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate("/sales");
                  }}
                >
                  <TrendingUp className="h-4 w-4 me-2" />
                  {t.openSalesModule}
                  <ExternalLink className="h-3 w-3 ms-2" />
                </Button>
              </div>
            )}

            {/* Currently working on (for non-sales) */}
            {!isSales && (
              <div>
                <h4 className="font-medium mb-3">{t.currentlyWorkingOn}</h4>
                {stats.currentAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noActiveAssignments}</p>
                ) : (
                  <div className="space-y-2">
                    {stats.currentAssignments.map(({ client, service }) => {
                      const dueDate = new Date(service.dueDate);
                      const isOverdue = dueDate < new Date();
                      return (
                        <Card key={service.id} className={cn(isOverdue && "border-red-200 dark:border-red-800")}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-medium">{client.name}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{service.serviceName}</p>
                              </div>
                              <Badge 
                                variant={isOverdue ? "destructive" : "outline"}
                                className="text-xs"
                              >
                                {service.dueDate}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // Render modal
  const renderModal = () => (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEmployee ? t.editEmployee : t.addEmployee}
          </DialogTitle>
          <DialogDescription>
            {language === "ar"
              ? "أضف معلومات الموظف"
              : "Add employee information"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" data-testid="tab-info">
              {t.basicInfo}
            </TabsTrigger>
            <TabsTrigger value="permissions" data-testid="tab-permissions">
              {language === "ar" ? "الصلاحيات" : "Permissions"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 py-4">
            {/* Profile Picture Upload */}
            <div className="flex justify-center pb-2">
              <AvatarUpload
                currentImage={formData.profileImage}
                name={formData.name || (language === "ar" ? "موظف جديد" : "New Employee")}
                nameEn={formData.nameEn}
                onImageChange={(url) => updateFormField("profileImage", url)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t.nameAr} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateFormField("name", e.target.value)}
                  placeholder={t.nameAr}
                  data-testid="input-employee-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.nameEn}</Label>
                <Input
                  value={formData.nameEn}
                  onChange={(e) => updateFormField("nameEn", e.target.value)}
                  placeholder={t.nameEn}
                  data-testid="input-employee-name-en"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.email}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormField("email", e.target.value)}
                placeholder={t.email}
                data-testid="input-email"
              />
            </div>

            {/* Send Invitation - only show for admin, when email is present, and for new employees */}
            {isAdmin && formData.email && !editingEmployee && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    <Label className="font-medium">{t.sendInvitation}</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.sendInvitationDesc}</p>
                </div>
                <Switch
                  checked
                  disabled
                  data-testid="switch-send-invitation"
                />
              </div>
            )}

            {/* Resend Invitation Button - only for admin, for existing employees with email */}
            {isAdmin && editingEmployee && formData.email && (
              <Button
                type="button"
                variant="outline"
                onClick={() => sendInvitationToEmployee(
                  formData.email,
                  formData.name,
                  formData.nameEn,
                  formData.role,
                  formData.department,
                  editingEmployee.id
                )}
                disabled={isSendingInvite}
                className="w-full"
                data-testid="button-resend-invitation"
              >
                {isSendingInvite ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 me-2" />
                )}
                {t.resendInvitation}
              </Button>
            )}

            <div className="space-y-2">
              <Label>{t.phone}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => updateFormField("phone", e.target.value)}
                placeholder={t.phone}
                data-testid="input-phone"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t.role} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.role}
                  onChange={(e) => updateFormField("role", e.target.value)}
                  placeholder="e.g., Sales Manager"
                  data-testid="input-role"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.roleAr}</Label>
                <Input
                  value={formData.roleAr}
                  onChange={(e) => updateFormField("roleAr", e.target.value)}
                  placeholder="مثال: مدير مبيعات"
                  data-testid="input-role-ar"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t.department} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => {
                    updateFormField("department", v);
                    updateFormField("jobTitle", undefined);
                  }}
                >
                  <SelectTrigger data-testid="select-department">
                    <SelectValue placeholder={t.selectDepartment} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(departments).map(([key, dept]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", dept.bgColor)} />
                          {language === "ar" ? dept.labelAr : dept.labelEn}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.jobTitle}</Label>
                <Select
                  value={formData.jobTitle || ""}
                  onValueChange={(v) => {
                    const jobTitle = v as JobTitle;
                    updateFormField("jobTitle", jobTitle);
                    if (jobTitle && jobTitleLabels[jobTitle]) {
                      updateFormField("role", jobTitleLabels[jobTitle].en);
                      updateFormField("roleAr", jobTitleLabels[jobTitle].ar);
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-job-title">
                    <SelectValue placeholder={t.selectJobTitle} />
                  </SelectTrigger>
                  <SelectContent>
                    {(jobTitlesByDepartment[formData.department as keyof typeof jobTitlesByDepartment] || []).map((jt) => (
                      <SelectItem key={jt} value={jt}>
                        {language === "ar" ? jobTitleLabels[jt].ar : jobTitleLabels[jt].en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Salary Fields - Only for Admin */}
            {isAdmin && (
              <>
                {/* Salary Type Selection */}
                <div className="space-y-2">
                  <Label>{t.salaryType}</Label>
                  <Select
                    value={formData.salaryType}
                    onValueChange={(v: "monthly" | "per_project") => updateFormField("salaryType", v)}
                  >
                    <SelectTrigger data-testid="select-salary-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t.monthly}</SelectItem>
                      <SelectItem value="per_project">{t.perProject}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Monthly Salary Fields */}
                {formData.salaryType === "monthly" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.salaryAmount}</Label>
                      <Input
                        type="number"
                        value={formData.salaryAmount}
                        onChange={(e) => updateFormField("salaryAmount", e.target.value)}
                        placeholder="0"
                        data-testid="input-salary-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <Select
                        value={formData.salaryCurrency}
                        onValueChange={(v) => updateFormField("salaryCurrency", v)}
                      >
                        <SelectTrigger data-testid="select-salary-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRY">TRY</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Per-Project/Task Fields */}
                {formData.salaryType === "per_project" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t.rate}</Label>
                        <Input
                          type="number"
                          value={formData.rate}
                          onChange={(e) => updateFormField("rate", e.target.value)}
                          placeholder="0"
                          data-testid="input-rate"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>&nbsp;</Label>
                        <Select
                          value={formData.salaryCurrency}
                          onValueChange={(v) => updateFormField("salaryCurrency", v)}
                        >
                          <SelectTrigger data-testid="select-rate-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRY">TRY</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="SAR">SAR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.rateType}</Label>
                      <Select
                        value={formData.rateType}
                        onValueChange={(v: "per_project" | "per_task" | "per_service") => updateFormField("rateType", v)}
                      >
                        <SelectTrigger data-testid="select-rate-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_project">{t.perProject}</SelectItem>
                          <SelectItem value="per_task">{t.perTask}</SelectItem>
                          <SelectItem value="per_service">{t.perService}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Salary Notes */}
                <div className="space-y-2">
                  <Label>{t.salaryNotes}</Label>
                  <Input
                    value={formData.salaryNotes}
                    onChange={(e) => updateFormField("salaryNotes", e.target.value)}
                    placeholder={language === "ar" ? "ملاحظات اختيارية..." : "Optional notes..."}
                    data-testid="input-salary-notes"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="is-active">{t.isActive}</Label>
              <Switch
                id="is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => updateFormField("isActive", checked)}
                data-testid="switch-is-active"
              />
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 py-4">
            {/* System Role Selection */}
            <div className="space-y-2">
              <Label>
                {language === "ar" ? "دور النظام" : "System Role"} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.systemRole}
                onValueChange={(v: "admin" | "sales" | "execution" | "finance" | "viewer") => {
                  updateFormField("systemRole", v);
                  updateFormField("permissions", roleDefaultPerms[v] || []);
                }}
              >
                <SelectTrigger data-testid="select-system-role">
                  <SelectValue placeholder={language === "ar" ? "اختر الدور" : "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(systemRoles).map(([key, role]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span>{language === "ar" ? role.labelAr : role.labelEn}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions Checklist */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "الصلاحيات" : "Permissions"}</Label>
              <p className="text-xs text-muted-foreground">
                {language === "ar" 
                  ? "يمكنك تخصيص الصلاحيات أو استخدام الصلاحيات الافتراضية للدور المحدد" 
                  : "Customize permissions or use role defaults"}
              </p>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {permissionsList.map((perm) => (
                  <div key={perm.key} className="flex items-center justify-between">
                    <Label className="text-sm font-normal cursor-pointer">
                      {language === "ar" ? perm.labelAr : perm.labelEn}
                    </Label>
                    <Switch
                      checked={formData.permissions.includes(perm.key)}
                      onCheckedChange={(checked) => {
                        const newPerms = checked
                          ? [...formData.permissions, perm.key]
                          : formData.permissions.filter(p => p !== perm.key);
                        updateFormField("permissions", newPerms);
                      }}
                      data-testid={`switch-perm-${perm.key}`}
                      disabled={formData.systemRole === "admin"}
                    />
                  </div>
                ))}
              </div>
              {formData.systemRole === "admin" && (
                <p className="text-xs text-muted-foreground text-center">
                  {language === "ar" 
                    ? "المدير لديه جميع الصلاحيات تلقائياً" 
                    : "Admin has all permissions by default"}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsModalOpen(false)}
            data-testid="button-cancel"
          >
            {t.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name || !formData.role}
            data-testid="button-save-employee"
          >
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderInviteLinkModal = () => (
    <Dialog open={showInviteLinkModal} onOpenChange={setShowInviteLinkModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.invitationSent}</DialogTitle>
          <DialogDescription>
            {language === "ar" 
              ? "تم إنشاء حساب الموظف بنجاح، ولكن تعذر إرسال البريد الإلكتروني. يرجى نسخ الرابط أدناه وإرساله للموظف يدوياً."
              : "Employee account created successfully, but email could not be sent. Please copy the link below and send it to the employee manually."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 rtl:space-x-reverse mt-4">
          <Input 
            value={inviteLinkData || ""} 
            readOnly 
            className="font-mono text-sm"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              if (inviteLinkData) {
                navigator.clipboard.writeText(inviteLinkData);
                toast({
                  title: language === "ar" ? "تم النسخ" : "Copied",
                  description: language === "ar" ? "تم نسخ الرابط إلى الحافظة" : "Link copied to clipboard",
                });
              }
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setShowInviteLinkModal(false)}>
            {language === "ar" ? "إغلاق" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Empty state
  if (employees.length === 0) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>
          <Button onClick={() => openModal()} data-testid="button-add-employee">
            <Plus className="h-4 w-4 me-2" />
            {t.addEmployee}
          </Button>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <UserCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t.emptyTitle}</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {t.emptySubtitle}
            </p>
            <Button onClick={() => openModal()} data-testid="button-add-first-employee">
              <Plus className="h-4 w-4 me-2" />
              {t.addEmployee}
            </Button>
          </CardContent>
        </Card>

        {renderModal()}
        {renderInviteLinkModal()}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button onClick={() => openModal()} data-testid="button-add-employee">
          <Plus className="h-4 w-4 me-2" />
          {t.addEmployee}
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
            data-testid="input-search"
          />
        </div>
        <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as Department | "all")}>
          <SelectTrigger className="w-[180px]" data-testid="select-department-filter">
            <Filter className="h-4 w-4 me-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allDepartments}</SelectItem>
            {Object.entries(departments).map(([key, dept]) => (
              <SelectItem key={key} value={key}>
                {language === "ar" ? dept.labelAr : dept.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee) => {
          const deptInfo = getDepartmentInfo(employee.department || "delivery");
          const stats = getEmployeeStats(employee);
          const name = language === "ar" ? employee.name : (employee.nameEn || employee.name);
          const role = language === "ar" ? (employee.roleAr || employee.role) : employee.role;

          return (
            <Card
              key={employee.id}
              className="cursor-pointer hover-elevate"
              onClick={() => openProfile(employee)}
              data-testid={`card-employee-${employee.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <EmployeeAvatar 
                      name={employee.name}
                      nameEn={employee.nameEn}
                      profileImage={employee.profileImage}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold" data-testid={`text-employee-name-${employee.id}`}>
                        {name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{role}</p>
                      <Badge
                        variant="outline"
                        className={cn("mt-1 font-medium", deptInfo.color, deptInfo.bgColor)}
                      >
                        {language === "ar" ? deptInfo.labelAr : deptInfo.labelEn}
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" data-testid={`button-menu-${employee.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={language === "ar" ? "start" : "end"}>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openProfile(employee); }}>
                        <UserCircle className="h-4 w-4 me-2" />
                        {t.viewProfile}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openModal(employee); }}>
                        <Pencil className="h-4 w-4 me-2" />
                        {t.edit}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(employee.id); }}
                      >
                        <Trash2 className="h-4 w-4 me-2" />
                        {t.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {employee.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-2" dir="ltr">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                </div>

                {/* Quick stats */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{stats.assignedClients} {language === "ar" ? "عميل" : "clients"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{stats.activeServices} {language === "ar" ? "خدمة" : "services"}</span>
                    </div>
                    {stats.overdueServices > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stats.overdueServices} {language === "ar" ? "متأخر" : "overdue"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={employee.isActive ? "default" : "secondary"}>
                    {employee.isActive ? t.active : t.inactive}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {renderModal()}
      {renderProfileDrawer()}
      {renderInviteLinkModal()}
    </div>
  );
}
