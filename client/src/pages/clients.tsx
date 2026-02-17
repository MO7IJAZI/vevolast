import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import {
  Plus,
  Users,
  Search,
  Phone,
  Mail,
  Building2,
  Globe,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  Clock,
  Pause,
  Circle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  Trash2,
  UserPlus,
  Briefcase,
  Target,
  Archive,
  RotateCcw,
  UserCheck,
  ArrowLeftRight,
  Filter,
  History,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { useData, serviceCategories as packageCategories, type Lead, type ConfirmedClient, type ServiceItem, type ServiceStatus, type LeadStage, type PackageItem, type MainPackage, type SubPackage, type Employee } from "@/contexts/DataContext";
import { DateInput } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { EmployeeChips } from "@/components/employee-chip";
import { EmployeeProfileDrawer } from "@/components/employee-profile-drawer";
import { EmployeeMultiSelect } from "@/components/employee-multi-select";
import { ClientWorkProgress } from "@/components/work-tracking/client-work-progress";

// Lead Pipeline Stages
interface LeadStageInfo {
  labelAr: string;
  labelEn: string;
  color: string;
  bgColor: string;
}

const leadStages: Record<LeadStage, LeadStageInfo> = {
  new: {
    labelAr: "جديد",
    labelEn: "New",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  contacted: {
    labelAr: "تم التواصل",
    labelEn: "Contacted",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  proposal_sent: {
    labelAr: "تم إرسال العرض",
    labelEn: "Proposal Sent",
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  negotiation: {
    labelAr: "تفاوض",
    labelEn: "Negotiation",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  won: {
    labelAr: "تم الفوز",
    labelEn: "Won",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  lost: {
    labelAr: "خسارة",
    labelEn: "Lost",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

// Service Status
interface ServiceStatusInfo {
  labelAr: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: typeof Clock;
}

const serviceStatuses: Record<ServiceStatus, ServiceStatusInfo> = {
  not_started: {
    labelAr: "لم يبدأ",
    labelEn: "Not Started",
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    icon: Circle,
  },
  in_progress: {
    labelAr: "قيد التنفيذ",
    labelEn: "In Progress",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Clock,
  },
  completed: {
    labelAr: "مكتمل",
    labelEn: "Completed",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: CheckCircle2,
  },
  on_hold: {
    labelAr: "معلق",
    labelEn: "On Hold",
    color: "text-yellow-700 dark:text-yellow-300",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: Pause,
  },
  delayed: {
    labelAr: "متأخر",
    labelEn: "Delayed",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: AlertTriangle,
  },
};

// Service Types
const serviceTypes = [
  { key: "social_media", labelAr: "سوشيال ميديا", labelEn: "Social Media" },
  { key: "website", labelAr: "موقع إلكتروني", labelEn: "Website" },
  { key: "app", labelAr: "تطبيق", labelEn: "App" },
  { key: "ai", labelAr: "ذكاء اصطناعي", labelEn: "AI" },
  { key: "branding", labelAr: "هوية بصرية / لوغو", labelEn: "Branding / Logo" },
  { key: "custom", labelAr: "خدمة مخصصة", labelEn: "Custom" },
];

const countries = [
  { code: "TR", labelAr: "تركيا", labelEn: "Turkey" },
  { code: "SA", labelAr: "السعودية", labelEn: "Saudi Arabia" },
  { code: "AE", labelAr: "الإمارات", labelEn: "UAE" },
  { code: "EG", labelAr: "مصر", labelEn: "Egypt" },
  { code: "KW", labelAr: "الكويت", labelEn: "Kuwait" },
  { code: "QA", labelAr: "قطر", labelEn: "Qatar" },
  { code: "JO", labelAr: "الأردن", labelEn: "Jordan" },
  { code: "US", labelAr: "أمريكا", labelEn: "USA" },
  { code: "UK", labelAr: "بريطانيا", labelEn: "UK" },
  { code: "OTHER", labelAr: "أخرى", labelEn: "Other" },
];

const currencyOptions: Currency[] = ["TRY", "USD", "EUR", "SAR"];

const mainPackageToServiceTypeMap: Record<string, string> = {
  "main-pkg-1": "social_media",
  "main-pkg-2": "website",
  "main-pkg-3": "branding",
  "main-pkg-4": "ai",
  "main-pkg-5": "app",
  "main-pkg-6": "custom",
};

export default function ClientsPage() {
  const { toast } = useToast();
  console.log("[ClientsPage] Component rendering START");
  const { language } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const defaultCurrency = displayCurrency;
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const {
    leads,
    clients,
    packages,
    mainPackages,
    subPackages,
    getSubPackagesByMainPackage,
    employees,
    addLead,
    updateLead,
    deleteLead,
    convertLeadToClient,
    addClient,
    addClientWithService,
    updateClient,
    deleteClient,
    addServiceToClient,
    updateService,
    deleteService,
    archiveClient,
    restoreClient,
    reactivateClient,
    markClientCompleted,
    convertClientToLead,
    getCompletedClients,
    getCompletedClientsThisMonth,
  } = useData();
  
  const [mainTab, setMainTab] = useState<"clients" | "leads" | "completed">("clients");
  
  // Handle URL query params for navigation from dashboard widgets
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tab = params.get("tab");
    const filter = params.get("filter");
    
    if (tab === "confirmed" || tab === "clients") {
      setMainTab("clients");
      if (filter === "active") {
        setShowArchived(false);
      }
    } else if (tab === "leads") {
      setMainTab("leads");
    } else if (tab === "completed") {
      setMainTab("completed");
    }
  }, [searchString]);
  const [showArchived, setShowArchived] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [clientToConvert, setClientToConvert] = useState<ConfirmedClient | null>(null);
  
  // Completed clients filters
  const [completedFilters, setCompletedFilters] = useState({
    month: "",
    country: "",
    employeeId: "",
    serviceCategory: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  
  // Modal states
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingClient, setEditingClient] = useState<ConfirmedClient | null>(null);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceClientId, setServiceClientId] = useState<string | null>(null);
  
  // Expanded client cards
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  // Available packages for selection (from DataContext)
  const availablePackages = (Array.isArray(packages) ? packages : []).filter(p => p.isActive);
  
  // For hierarchical selection - main packages and sub-packages
  const activeMainPackages = (Array.isArray(mainPackages) ? mainPackages : []).filter(mp => mp.isActive);
  const [selectedMainPackageId, setSelectedMainPackageId] = useState<string>("");
  const availableSubPackages = selectedMainPackageId 
    ? (Array.isArray(getSubPackagesByMainPackage(selectedMainPackageId)) ? getSubPackagesByMainPackage(selectedMainPackageId) : []).filter(sp => sp.isActive)
    : [];
  
  // Form states
  const [leadForm, setLeadForm] = useState<{
    name: string;
    company: string;
    email: string;
    phone: string;
    country: string;
    stage: LeadStage;
    expectedCloseDate: string;
    estimatedValue: string;
    currency: Currency;
    notes: string;
    negotiatorId: string;
  }>({
    name: "",
    company: "",
    email: "",
    phone: "",
    country: "",
    stage: "new",
    expectedCloseDate: "",
    estimatedValue: "",
    currency: defaultCurrency,
    notes: "",
    negotiatorId: "",
  });
  
  const [clientForm, setClientForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    country: "",
    acquiredById: "",
    salesOwnerId: "",
    assignedManagerId: "",
    salesOwners: [] as string[],
    assignedStaff: [] as string[],
  });
  
  // Employee profile drawer
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEmployeeDrawerOpen(true);
  };
  
  const [serviceForm, setServiceForm] = useState<{
    selectedPackageId: string;
    serviceType: string;
    serviceName: string;
    startDate: string;
    dueDate: string;
    price: string;
    currency: Currency;
    assignedTo: string;
    serviceAssignees: string[];
    status: ServiceStatus;
  }>({
    selectedPackageId: "",
    serviceType: "social_media",
    serviceName: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    price: "",
    currency: defaultCurrency,
    assignedTo: "",
    serviceAssignees: [],
    status: "in_progress",
  });
  
  // Available packages for selection

  const content = {
    ar: {
      title: "العملاء",
      confirmedClients: "العملاء المؤكدين",
      leads: "العملاء المحتملين",
      addLead: "إضافة عميل محتمل",
      addClient: "إضافة عميل مؤكد",
      addService: "إضافة خدمة",
      editLead: "تعديل العميل المحتمل",
      editClient: "تعديل العميل",
      editService: "تعديل الخدمة",
      emptyLeadsTitle: "لا يوجد عملاء محتملين",
      emptyLeadsSubtitle: "أضف العملاء المحتملين لتتبع المفاوضات والفرص الجديدة",
      emptyClientsTitle: "لا يوجد عملاء مؤكدين",
      emptyClientsSubtitle: "أضف العملاء المؤكدين لإدارة المشاريع والخدمات",
      addFirstLead: "أضف أول عميل محتمل",
      addFirstClient: "أضف أول عميل مؤكد",
      search: "بحث...",
      name: "الاسم",
      company: "الشركة",
      email: "البريد الإلكتروني",
      phone: "الهاتف / واتساب",
      country: "الدولة",
      stage: "المرحلة",
      expectedCloseDate: "تاريخ الإغلاق المتوقع",
      estimatedValue: "القيمة المتوقعة",
      notes: "ملاحظات",
      save: "حفظ",
      cancel: "إلغاء",
      edit: "تعديل",
      delete: "حذف",
      selectCountry: "اختر الدولة",
      selectStage: "اختر المرحلة",
      purchasedServices: "الخدمات المشتراة",
      serviceType: "نوع الخدمة",
      serviceName: "اسم الخدمة / الباقة",
      startDate: "تاريخ البداية",
      dueDate: "تاريخ الاستحقاق",
      price: "السعر",
      currency: "العملة",
      assignedTo: "الموظف المسؤول",
      status: "الحالة",
      markCompleted: "تحديد كمكتمل",
      completedThisMonth: "المكتمل هذا الشهر",
      noServices: "لا توجد خدمات بعد",
      selectServiceType: "اختر نوع الخدمة",
      selectStatus: "اختر الحالة",
      required: "مطلوب",
      clientInfo: "معلومات العميل",
      firstService: "الخدمة الأولى",
      daysLeft: "يوم متبقي",
      overdue: "متأخر",
      completedOn: "اكتمل في",
      viewServices: "عرض الخدمات",
      hideServices: "إخفاء الخدمات",
      selectPackage: "اختر باقة",
      orCustomService: "أو أضف خدمة مخصصة",
      customService: "خدمة مخصصة",
      negotiator: "المسؤول عن الصفقة",
      selectNegotiator: "اختر الموظف",
      convertToClient: "تحويل إلى عميل مؤكد",
      archive: "أرشفة",
      restore: "استعادة",
      archived: "مؤرشف",
      archivedClients: "العملاء المؤرشفين",
      active: "نشط",
      completedClients: "تم الانتهاء",
      markAsCompleted: "تحديد كمنتهي",
      reactivate: "إعادة تفعيل",
      convertBackToLead: "إرجاع إلى عميل محتمل",
      acquiredBy: "جلبه الموظف",
      selectEmployee: "اختر الموظف",
      salesOwner: "المبيعات",
      assignedManager: "المسؤول",
      previouslyActive: "عميل سابق",
      convertedFromLead: "تم التحويل من عميل محتمل",
      convertConfirmTitle: "تحويل العميل إلى عميل محتمل",
      convertConfirmMessage: "سيتم نقل هذا العميل بالكامل مع كافة معلوماته وخدماته إلى قائمة العملاء المحتملين. لن يتم إنشاء نسخة في الأرشيف. يمكنك استعادته كعميل نشط في أي وقت.",
      confirmConvert: "تأكيد التحويل",
      filterByMonth: "فلتر حسب الشهر",
      filterByCountry: "فلتر حسب الدولة",
      filterByEmployee: "فلتر حسب الموظف",
      filterByService: "فلتر حسب الخدمة",
      allMonths: "جميع الأشهر",
      allCountries: "جميع الدول",
      allEmployees: "جميع الموظفين",
      allServices: "جميع الخدمات",
      servicesHistory: "سجل الخدمات",
      totalValue: "القيمة الإجمالية",
      completedDate: "تاريخ الانتهاء",
      emptyCompletedTitle: "لا يوجد عملاء منتهين",
      emptyCompletedSubtitle: "العملاء الذين تم الانتهاء من جميع خدماتهم سيظهرون هنا",
    },
    en: {
      title: "Clients",
      confirmedClients: "Confirmed Clients",
      leads: "Leads",
      addLead: "Add Lead",
      addClient: "Add Confirmed Client",
      addService: "Add Service",
      editLead: "Edit Lead",
      editClient: "Edit Client",
      editService: "Edit Service",
      emptyLeadsTitle: "No leads yet",
      emptyLeadsSubtitle: "Add potential clients to track negotiations and new opportunities",
      emptyClientsTitle: "No confirmed clients yet",
      emptyClientsSubtitle: "Add confirmed clients to manage projects and services",
      addFirstLead: "Add first lead",
      addFirstClient: "Add first confirmed client",
      search: "Search...",
      name: "Name",
      company: "Company",
      email: "Email",
      phone: "Phone / WhatsApp",
      country: "Country",
      stage: "Stage",
      expectedCloseDate: "Expected Close Date",
      estimatedValue: "Estimated Value",
      notes: "Notes",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      selectCountry: "Select Country",
      selectStage: "Select Stage",
      purchasedServices: "Purchased Services",
      serviceType: "Service Type",
      serviceName: "Service / Package Name",
      startDate: "Start Date",
      dueDate: "Due Date",
      price: "Price",
      currency: "Currency",
      assignedTo: "Assigned To",
      status: "Status",
      markCompleted: "Mark as Completed",
      completedThisMonth: "Completed This Month",
      noServices: "No services yet",
      selectServiceType: "Select Service Type",
      selectStatus: "Select Status",
      required: "Required",
      clientInfo: "Client Info",
      firstService: "First Service",
      daysLeft: "days left",
      overdue: "Overdue",
      completedOn: "Completed on",
      viewServices: "View Services",
      hideServices: "Hide Services",
      selectPackage: "Select Package",
      orCustomService: "or add custom service",
      customService: "Custom Service",
      negotiator: "Sales Owner",
      selectNegotiator: "Select Employee",
      convertToClient: "Convert to Client",
      archive: "Archive",
      restore: "Restore",
      archived: "Archived",
      archivedClients: "Archived Clients",
      active: "Active",
      completedClients: "Completed",
      markAsCompleted: "Mark as Completed",
      reactivate: "Reactivate",
      convertBackToLead: "Convert back to Lead",
      acquiredBy: "Acquired By",
      selectEmployee: "Select Employee",
      salesOwner: "Sales",
      assignedManager: "Assigned",
      previouslyActive: "Previously Active",
      convertedFromLead: "Converted from Lead",
      convertConfirmTitle: "Convert Client to Lead",
      convertConfirmMessage: "This client will be moved completely to Leads with all information and services. No copy will be kept in Archive. You can restore them as an Active client at any time.",
      confirmConvert: "Confirm Conversion",
      filterByMonth: "Filter by Month",
      filterByCountry: "Filter by Country",
      filterByEmployee: "Filter by Employee",
      filterByService: "Filter by Service",
      allMonths: "All Months",
      allCountries: "All Countries",
      allEmployees: "All Employees",
      allServices: "All Services",
      servicesHistory: "Services History",
      totalValue: "Total Value",
      completedDate: "Completed Date",
      emptyCompletedTitle: "No Completed Clients",
      emptyCompletedSubtitle: "Clients with all services completed will appear here",
    },
  };

  const t = content[language];

  // Get completed this month
  const getCompletedThisMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const completed: { client: ConfirmedClient; service: ServiceItem }[] = [];
    
    (Array.isArray(clients) ? clients : []).forEach(client => {
      const services = Array.isArray(client.services) ? client.services : [];
      services.forEach(service => {
        if (service.status === "completed" && service.completedDate) {
          const completedDate = new Date(service.completedDate);
          if (completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear) {
            completed.push({ client, service });
          }
        }
      });
    });
    
    return completed;
  };

  const completedThisMonth = getCompletedThisMonth();

  // Calculate days until due
  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Toggle client expansion
  const toggleClientExpanded = (clientId: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  // Lead handlers
  const resetLeadForm = () => {
    setLeadForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      country: "",
      stage: "new",
      expectedCloseDate: "",
      estimatedValue: "",
      currency: defaultCurrency,
      notes: "",
      negotiatorId: "",
    });
    setEditingLead(null);
  };

  const openLeadModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setLeadForm({
        name: lead.name,
        company: lead.company || "",
        email: lead.email || "",
        phone: lead.phone || "",
        country: lead.country || "",
        stage: lead.stage,
        expectedCloseDate: lead.expectedCloseDate || "",
        estimatedValue: lead.estimatedValue?.toString() || "",
        currency: (lead.currency as Currency) || defaultCurrency,
        notes: lead.notes || "",
        negotiatorId: lead.negotiatorId || "",
      });
    } else {
      resetLeadForm();
    }
    setIsLeadModalOpen(true);
  };

  const saveLead = () => {
    if (!leadForm.name) return;
    
    if (editingLead) {
      updateLead(editingLead.id, {
        name: leadForm.name,
        company: leadForm.company || undefined,
        email: leadForm.email || undefined,
        phone: leadForm.phone || undefined,
        country: leadForm.country || undefined,
        stage: leadForm.stage,
        expectedCloseDate: leadForm.expectedCloseDate || undefined,
        estimatedValue: leadForm.estimatedValue || undefined,
        currency: leadForm.currency || undefined,
        dealValue: leadForm.estimatedValue ? Number(leadForm.estimatedValue) : undefined,
        dealCurrency: leadForm.currency || undefined,
        notes: leadForm.notes || undefined,
        negotiatorId: leadForm.negotiatorId || undefined,
      });
    } else {
      addLead({
        name: leadForm.name,
        company: leadForm.company || undefined,
        email: leadForm.email || undefined,
        phone: leadForm.phone || undefined,
        country: leadForm.country || undefined,
        stage: leadForm.stage,
        expectedCloseDate: leadForm.expectedCloseDate || undefined,
        estimatedValue: leadForm.estimatedValue || undefined,
        currency: leadForm.currency || undefined,
        dealValue: leadForm.estimatedValue ? Number(leadForm.estimatedValue) : undefined,
        dealCurrency: leadForm.currency || undefined,
        notes: leadForm.notes || undefined,
        negotiatorId: leadForm.negotiatorId || undefined,
      });
    }
    
    setIsLeadModalOpen(false);
    resetLeadForm();
  };

  const handleDeleteLead = (id: string) => {
    deleteLead(id);
  };

  const handleConvertLead = async (leadId: string) => {
    try {
      toast({
        title: language === "ar" ? "جاري التحويل..." : "Converting...",
        description: language === "ar" ? "يرجى الانتظار بينما يتم تحويل العميل المحتمل" : "Please wait while the lead is being converted",
      });

      const newClient = await convertLeadToClient(leadId);
      if (newClient) {
        setMainTab("clients");
        setShowArchived(false); // Ensure we are looking at active clients
        setExpandedClients(prev => {
          const newSet = new Set(prev);
          newSet.add(newClient.id);
          return newSet;
        });
        
        toast({
          title: language === "ar" ? "تم التحويل بنجاح" : "Conversion Successful",
          description: language === "ar" ? `تم تحويل ${newClient.name} إلى عميل` : `${newClient.name} has been converted to client`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Failed to convert lead:", error);
      toast({
        title: language === "ar" ? "فشل التحويل" : "Conversion Failed",
        description: language === "ar" ? "حدث خطأ أثناء تحويل العميل المحتمل" : "An error occurred while converting the lead",
        variant: "destructive",
      });
    }
  };

  // Client handlers
  const resetClientForm = () => {
    setClientForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      country: "",
      acquiredById: "",
      salesOwnerId: "",
      assignedManagerId: "",
      salesOwners: [],
      assignedStaff: [],
    });
    setServiceForm({
      selectedPackageId: "",
      serviceType: "social_media",
      serviceName: "",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      price: "",
      currency: defaultCurrency,
      assignedTo: "",
      serviceAssignees: [],
      status: "in_progress",
    });
    setEditingClient(null);
  };

  // Handle mark client as completed
  const handleMarkCompleted = (clientId: string) => {
    markClientCompleted(clientId);
  };

  // Handle convert client back to lead
  const handleConvertClientToLead = () => {
    if (clientToConvert) {
      convertClientToLead(clientToConvert.id);
      setIsConvertModalOpen(false);
      setClientToConvert(null);
      setMainTab("leads");
    }
  };

  const openConvertModal = (client: ConfirmedClient) => {
    setClientToConvert(client);
    setIsConvertModalOpen(true);
  };
  
  // Handle main package category selection
  const handleMainPackageSelect = (mainPackageId: string) => {
    setSelectedMainPackageId(mainPackageId);
    // Reset sub-package selection when category changes
    setServiceForm(prev => ({
      ...prev,
      selectedPackageId: "",
      serviceName: "",
      price: "",
    }));
  };

  // Handle sub-package selection - auto-fill service details
  const handleSubPackageSelect = (subPackageId: string) => {
    if (subPackageId === "custom") {
      setServiceForm(prev => ({
        ...prev,
        selectedPackageId: "",
        serviceType: "custom",
        serviceName: "",
        price: "",
      }));
      return;
    }
    
    const subPkg = Array.isArray(subPackages) ? subPackages.find(sp => sp.id === subPackageId) : undefined;
    if (subPkg) {
      const serviceType = mainPackageToServiceTypeMap[subPkg.mainPackageId] || "custom";
      setServiceForm(prev => ({
        ...prev,
        selectedPackageId: subPackageId,
        serviceType,
        serviceName: language === "ar" ? subPkg.name : (subPkg.nameEn || subPkg.name),
        price: subPkg.price.toString(),
        currency: subPkg.currency,
      }));
    }
  };
  
  // Legacy - Handle package selection for backward compatibility
  const handlePackageSelect = (packageId: string) => {
    if (packageId === "custom") {
      setServiceForm(prev => ({
        ...prev,
        selectedPackageId: "",
        serviceType: "custom",
        serviceName: "",
        price: "",
      }));
      return;
    }
    
    const pkg = availablePackages.find(p => p.id === packageId);
    if (pkg) {
      setServiceForm(prev => ({
        ...prev,
        selectedPackageId: packageId,
        serviceType: pkg.category,
        serviceName: language === "ar" ? pkg.name : (pkg.nameEn || pkg.name),
        price: pkg.price.toString(),
        currency: pkg.currency,
      }));
    }
  };

  const openClientModal = (client?: ConfirmedClient) => {
    if (client) {
      setEditingClient(client);
      setClientForm({
        name: client.name,
        company: client.company || "",
        email: client.email || "",
        phone: client.phone || "",
        country: client.country || "",
        acquiredById: client.acquiredById || "",
        salesOwnerId: client.salesOwnerId || "",
        assignedManagerId: client.assignedManagerId || "",
        salesOwners: client.salesOwners || (client.salesOwnerId ? [client.salesOwnerId] : []),
        assignedStaff: client.assignedStaff || (client.assignedManagerId ? [client.assignedManagerId] : []),
      });
    } else {
      resetClientForm();
    }
    setIsClientModalOpen(true);
  };

  const saveClient = async () => {
    if (!clientForm.name) return;
    
    if (editingClient) {
      updateClient(editingClient.id, {
        name: clientForm.name,
        company: clientForm.company || undefined,
        email: clientForm.email || undefined,
        phone: clientForm.phone || undefined,
        country: clientForm.country || undefined,
        acquiredById: clientForm.acquiredById || undefined,
        salesOwnerId: clientForm.salesOwners[0] || undefined,
        assignedManagerId: clientForm.assignedStaff[0] || undefined,
        salesOwners: clientForm.salesOwners.length > 0 ? clientForm.salesOwners : undefined,
        assignedStaff: clientForm.assignedStaff.length > 0 ? clientForm.assignedStaff : undefined,
      });
    } else {
      // For new client, require first service and at least one sales owner
      if (!serviceForm.serviceType || !serviceForm.dueDate || clientForm.salesOwners.length === 0) return;
      
      try {
        const clientData = {
          name: clientForm.name,
          company: clientForm.company || undefined,
          email: clientForm.email || undefined,
          phone: clientForm.phone || undefined,
          country: clientForm.country || undefined,
          acquiredById: clientForm.acquiredById || undefined,
          salesOwnerId: clientForm.salesOwners[0] || undefined,
          assignedManagerId: clientForm.assignedStaff[0] || undefined,
          salesOwners: clientForm.salesOwners,
          assignedStaff: clientForm.assignedStaff.length > 0 ? clientForm.assignedStaff : undefined,
          status: "active" as const,
        };

        const serviceData = {
          serviceType: serviceForm.serviceType,
          serviceName: serviceForm.serviceName || getServiceTypeName(serviceForm.serviceType),
          serviceNameEn: serviceForm.serviceName || getServiceTypeName(serviceForm.serviceType), // Fallback for EN name
          startDate: serviceForm.startDate,
          dueDate: serviceForm.dueDate,
          price: serviceForm.price ? Number(serviceForm.price) : undefined,
          currency: serviceForm.currency as Currency || undefined,
          assignedTo: serviceForm.assignedTo || undefined,
          serviceAssignees: serviceForm.serviceAssignees.length > 0 ? serviceForm.serviceAssignees : undefined,
          status: serviceForm.status,
          packageId: serviceForm.selectedPackageId || undefined,
          mainPackageId: selectedMainPackageId || undefined,
          subPackageId: serviceForm.selectedPackageId || undefined,
          salesEmployeeId: clientForm.salesOwners.length > 0 ? clientForm.salesOwners[0] : undefined,
        };

        const newClient = await addClientWithService(clientData, serviceData);
        
        setExpandedClients(prev => {
          const newSet = new Set(prev);
          newSet.add(newClient.id);
          return newSet;
        });
      } catch (error) {
        console.error("Failed to create client:", error);
        return; // Don't close modal on error
      }
    }
    
    setIsClientModalOpen(false);
    resetClientForm();
  };

  const handleDeleteClient = (id: string) => {
    deleteClient(id);
  };

  // Service handlers
  const getServiceTypeName = (type: string) => {
    const svc = serviceTypes.find(s => s.key === type);
    return svc ? (language === "ar" ? svc.labelAr : svc.labelEn) : type;
  };

  const resetServiceForm = () => {
    setServiceForm({
      selectedPackageId: "",
      serviceType: "social_media",
      serviceName: "",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      price: "",
      currency: defaultCurrency,
      assignedTo: "",
      serviceAssignees: [],
      status: "in_progress",
    });
    setSelectedMainPackageId("");
    setEditingService(null);
    setServiceClientId(null);
  };

  const openServiceModal = (clientId: string, service?: ServiceItem) => {
    setServiceClientId(clientId);
    if (service) {
      setEditingService(service);
      // Set hierarchical package selection if available
      if (service.mainPackageId) {
        setSelectedMainPackageId(service.mainPackageId);
      } else if (service.subPackageId) {
        // Find main package from sub package
        const subPkg = Array.isArray(subPackages) ? subPackages.find(sp => sp.id === service.subPackageId) : undefined;
        if (subPkg) {
          setSelectedMainPackageId(subPkg.mainPackageId);
        }
      } else if (service.packageId) {
        // Legacy packageId - try to find main package
        const subPkg = Array.isArray(subPackages) ? subPackages.find(sp => sp.id === service.packageId) : undefined;
        if (subPkg) {
          setSelectedMainPackageId(subPkg.mainPackageId);
        }
      }
      setServiceForm({
        selectedPackageId: service.subPackageId || service.packageId || "",
        serviceType: service.serviceType,
        serviceName: service.serviceName,
        startDate: service.startDate,
        dueDate: service.dueDate,
        price: service.price?.toString() || "",
        currency: (service.currency as Currency) || defaultCurrency,
        assignedTo: service.assignedTo || "",
        serviceAssignees: service.serviceAssignees || [],
        status: service.status === "delayed" ? "in_progress" : service.status, // Handle computed status
      });
    } else {
      // When adding a new service, inherit assignedStaff from the client
      const client = (Array.isArray(clients) ? clients : []).find(c => c.id === clientId);
      const inheritedAssignees = client?.assignedStaff || (client?.assignedManagerId ? [client.assignedManagerId] : []);
      resetServiceForm();
      setServiceForm(prev => ({ ...prev, serviceAssignees: inheritedAssignees }));
      setServiceClientId(clientId);
    }
    setIsServiceModalOpen(true);
  };

  const saveService = async () => {
    if (!serviceClientId || !serviceForm.serviceType || !serviceForm.dueDate) return;
    
    try {
      if (editingService) {
        // Get client for salesEmployeeId
      const targetClient = (Array.isArray(clients) ? clients : []).find(c => c.id === serviceClientId);
        await updateService(serviceClientId, editingService.id, {
          serviceType: serviceForm.serviceType,
          serviceName: serviceForm.serviceName || getServiceTypeName(serviceForm.serviceType),
          startDate: serviceForm.startDate,
          dueDate: serviceForm.dueDate,
          price: serviceForm.price ? Number(serviceForm.price) : undefined,
          currency: serviceForm.currency as Currency || undefined,
          assignedTo: serviceForm.assignedTo || undefined,
          serviceAssignees: serviceForm.serviceAssignees.length > 0 ? serviceForm.serviceAssignees : undefined,
          status: serviceForm.status,
          packageId: serviceForm.selectedPackageId || undefined,
          mainPackageId: selectedMainPackageId || undefined,
          subPackageId: serviceForm.selectedPackageId || undefined,
          salesEmployeeId: editingService.salesEmployeeId || targetClient?.salesOwners?.[0] || undefined,
        });
      } else {
        // Get client to access salesOwners for salesEmployeeId
        const targetClient = (Array.isArray(clients) ? clients : []).find(c => c.id === serviceClientId);
        await addServiceToClient(serviceClientId, {
          serviceType: serviceForm.serviceType,
          serviceName: serviceForm.serviceName || getServiceTypeName(serviceForm.serviceType),
          startDate: serviceForm.startDate,
          dueDate: serviceForm.dueDate,
          price: serviceForm.price ? Number(serviceForm.price) : undefined,
          currency: serviceForm.currency as Currency || undefined,
          assignedTo: serviceForm.assignedTo || undefined,
          serviceAssignees: serviceForm.serviceAssignees.length > 0 ? serviceForm.serviceAssignees : undefined,
          status: serviceForm.status,
          packageId: serviceForm.selectedPackageId || undefined,
          mainPackageId: selectedMainPackageId || undefined,
          subPackageId: serviceForm.selectedPackageId || undefined,
          salesEmployeeId: targetClient?.salesOwners?.[0] || undefined,
        });
      }
      
      setIsServiceModalOpen(false);
      resetServiceForm();
    } catch (error) {
      console.error("Failed to save service:", error);
    }
  };

  const handleDeleteService = (clientId: string, serviceId: string) => {
    deleteService(clientId, serviceId);
  };

  const markServiceCompleted = (clientId: string, serviceId: string) => {
    updateService(clientId, serviceId, {
      status: "completed",
      completedDate: new Date().toISOString().split("T")[0],
    });
  };

  // Filter
  const filteredLeads = (Array.isArray(leads) ? leads : []).filter(lead => 
    (lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (monthFilter === "all" || (lead.createdAt && lead.createdAt.startsWith(monthFilter)))
  );

  const activeClients = (Array.isArray(clients) ? clients : []).filter(c => c.status === "active" || c.status === "on_hold");
  const archivedClients = (Array.isArray(clients) ? clients : []).filter(c => c.status === "archived");
  const completedClients = (Array.isArray(clients) ? clients : []).filter(c => c.status === "completed");
  
  const filteredClients = (showArchived ? archivedClients : activeClients).filter(client =>
    (client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (monthFilter === "all" || (client.createdAt && client.createdAt.startsWith(monthFilter)))
  );

  // Filter completed clients with filters
  const filteredCompletedClients = completedClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCountry = !completedFilters.country || client.country === completedFilters.country;
    const matchesEmployee = !completedFilters.employeeId || client.acquiredById === completedFilters.employeeId;
    
    const matchesMonth = !completedFilters.month || (client.completedDate && 
      client.completedDate.startsWith(completedFilters.month));
    
    const services = Array.isArray(client.services) ? client.services : [];
    const matchesService = !completedFilters.serviceCategory || 
      services.some(s => s.serviceType === completedFilters.serviceCategory);
    
    return matchesSearch && matchesCountry && matchesEmployee && matchesMonth && matchesService;
  });

  // Get employee by ID
  const getEmployeeName = (employeeId: string | undefined) => {
    if (!employeeId) return null;
    const emp = (Array.isArray(employees) ? employees : []).find(e => e.id === employeeId);
    return emp ? (language === "ar" ? emp.name : (emp.nameEn || emp.name)) : null;
  };

  // Get unique months from completed clients
  const getAvailableMonths = () => {
    const months = new Set<string>();
    const safeCompletedClients = Array.isArray(completedClients) ? completedClients : [];
    safeCompletedClients.forEach(c => {
      if (c.completedDate) {
        months.add(c.completedDate.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

  const getAvailableMainTabMonths = () => {
    const months = new Set<string>();
    const sources = mainTab === "leads" ? leads : (showArchived ? archivedClients : activeClients);
    const safeSources = Array.isArray(sources) ? sources : [];
    safeSources.forEach(item => {
      if (item.createdAt) {
        months.add(item.createdAt.substring(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

  // Render Convert Confirmation Modal
  const renderConvertModal = () => (
    <Dialog open={isConvertModalOpen} onOpenChange={setIsConvertModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t.convertConfirmTitle}
          </DialogTitle>
          <DialogDescription className="pt-4">
            {t.convertConfirmMessage}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsConvertModalOpen(false)} data-testid="button-cancel-convert">
            {t.cancel}
          </Button>
          <Button variant="default" onClick={handleConvertClientToLead} data-testid="button-confirm-convert">
            {t.confirmConvert}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Lead Modal
  const renderLeadModal = () => (
    <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingLead ? t.editLead : t.addLead}</DialogTitle>
          <DialogDescription>
            {language === "ar" ? "أضف معلومات العميل المحتمل" : "Add lead information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.name} <span className="text-destructive">*</span></Label>
              <Input
                value={leadForm.name}
                onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t.name}
                data-testid="input-lead-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.company}</Label>
              <Input
                value={leadForm.company}
                onChange={(e) => setLeadForm(prev => ({ ...prev, company: e.target.value }))}
                placeholder={t.company}
                data-testid="input-lead-company"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.phone}</Label>
              <Input
                value={leadForm.phone}
                onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={t.phone}
                data-testid="input-lead-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.email}</Label>
              <Input
                type="email"
                value={leadForm.email}
                onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t.email}
                data-testid="input-lead-email"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.country}</Label>
              <Select value={leadForm.country} onValueChange={(v) => setLeadForm(prev => ({ ...prev, country: v }))}>
                <SelectTrigger data-testid="select-lead-country">
                  <SelectValue placeholder={t.selectCountry} />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(countries) && countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {language === "ar" ? c.labelAr : c.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.stage} <span className="text-destructive">*</span></Label>
              <Select value={leadForm.stage} onValueChange={(v) => setLeadForm(prev => ({ ...prev, stage: v as LeadStage }))}>
                <SelectTrigger data-testid="select-lead-stage">
                  <SelectValue placeholder={t.selectStage} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(leadStages) as LeadStage[]).map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {language === "ar" ? leadStages[stage].labelAr : leadStages[stage].labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.expectedCloseDate}</Label>
              <DateInput
                value={leadForm.expectedCloseDate}
                onChange={(value) => setLeadForm(prev => ({ ...prev, expectedCloseDate: value }))}
                data-testid="input-lead-close-date"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.estimatedValue}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={leadForm.estimatedValue}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, estimatedValue: e.target.value }))}
                  placeholder="0"
                  className="flex-1"
                  data-testid="input-lead-value"
                />
                <Select value={leadForm.currency} onValueChange={(v) => setLeadForm(prev => ({ ...prev, currency: v as Currency }))}>
                  <SelectTrigger className="w-24" data-testid="select-lead-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.negotiator}</Label>
            <Select value={leadForm.negotiatorId} onValueChange={(v) => setLeadForm(prev => ({ ...prev, negotiatorId: v }))}>
              <SelectTrigger data-testid="select-lead-negotiator">
                <SelectValue placeholder={t.selectNegotiator} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(employees) && employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.notes}</Label>
            <Textarea
              value={leadForm.notes}
              onChange={(e) => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t.notes}
              data-testid="input-lead-notes"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsLeadModalOpen(false)} data-testid="button-cancel-lead">
            {t.cancel}
          </Button>
          <Button onClick={saveLead} disabled={!leadForm.name} data-testid="button-save-lead">
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Client Modal
  const renderClientModal = (
    convertAmountFn: typeof convertAmount,
    formatCurrencyFn: typeof formatCurrency,
    displayCurrencyVal: typeof displayCurrency
  ) => (
    <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingClient ? t.editClient : t.addClient}</DialogTitle>
          <DialogDescription>
            {language === "ar" ? "أضف معلومات العميل المؤكد" : "Add confirmed client information"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className={cn("grid w-full", editingClient ? "grid-cols-1" : "grid-cols-2")}>
            <TabsTrigger value="info" data-testid="tab-client-info">{t.clientInfo}</TabsTrigger>
            {!editingClient && (
              <TabsTrigger value="service" data-testid="tab-first-service">{t.firstService}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="info" className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.name} <span className="text-destructive">*</span></Label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t.name}
                  data-testid="input-client-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.company}</Label>
                <Input
                  value={clientForm.company}
                  onChange={(e) => setClientForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder={t.company}
                  data-testid="input-client-company"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t.email}
                  data-testid="input-client-email"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.phone}</Label>
                <Input
                  value={clientForm.phone}
                  onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={t.phone}
                  data-testid="input-client-phone"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.country}</Label>
                <Select value={clientForm.country} onValueChange={(v) => setClientForm(prev => ({ ...prev, country: v }))}>
                  <SelectTrigger data-testid="select-client-country">
                    <SelectValue placeholder={t.selectCountry} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(countries) && countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {language === "ar" ? c.labelAr : c.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <EmployeeMultiSelect
                selectedIds={clientForm.salesOwners}
                onChange={(ids) => setClientForm(prev => ({ ...prev, salesOwners: ids }))}
                label={`${t.salesOwner} *`}
                placeholder={t.selectEmployee}
                data-testid="select-sales-owners"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-1">
              <EmployeeMultiSelect
                selectedIds={clientForm.assignedStaff}
                onChange={(ids) => setClientForm(prev => ({ ...prev, assignedStaff: ids }))}
                label={t.assignedManager}
                placeholder={t.selectEmployee}
                data-testid="select-assigned-staff"
              />
            </div>
          </TabsContent>

          {!editingClient && (
            <TabsContent value="service" className="space-y-4 py-4">
              {/* Hierarchical Package Selection: Main Package (Category) -> Sub-Package (Plan) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{language === "ar" ? "فئة الباقة" : "Package Category"}</Label>
                  <Select 
                    value={selectedMainPackageId} 
                    onValueChange={handleMainPackageSelect}
                  >
                    <SelectTrigger data-testid="select-main-package">
                      <SelectValue placeholder={language === "ar" ? "اختر الفئة" : "Select category"} />
                    </SelectTrigger>
                    <SelectContent>
                  {Array.isArray(activeMainPackages) && activeMainPackages.map((mp) => (
                    <SelectItem key={mp.id} value={mp.id}>
                      {language === "ar" ? mp.name : (mp.nameEn || mp.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t.selectPackage}</Label>
                  <Select 
                    value={serviceForm.selectedPackageId || "custom"} 
                    onValueChange={handleSubPackageSelect}
                    disabled={!selectedMainPackageId}
                  >
                    <SelectTrigger data-testid="select-sub-package">
                      <SelectValue placeholder={t.selectPackage} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(availableSubPackages) && availableSubPackages.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          <div className="flex items-center gap-2">
                            <span>{language === "ar" ? sp.name : (sp.nameEn || sp.name)}</span>
                            <span className="text-muted-foreground text-xs">
                              ({formatCurrencyFn(
                                convertAmountFn(sp.price, sp.currency as Currency, displayCurrencyVal),
                                displayCurrencyVal
                              )})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        <span className="text-muted-foreground">{t.customService}</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t.orCustomService}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.serviceType} <span className="text-destructive">*</span></Label>
                  <Select value={serviceForm.serviceType} onValueChange={(v) => setServiceForm(prev => ({ ...prev, serviceType: v }))}>
                    <SelectTrigger data-testid="select-service-type">
                      <SelectValue placeholder={t.selectServiceType} />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {language === "ar" ? s.labelAr : s.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.serviceName}</Label>
                  <Input
                    value={serviceForm.serviceName}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, serviceName: e.target.value }))}
                    placeholder={t.serviceName}
                    data-testid="input-service-name"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.startDate}</Label>
                  <DateInput
                    value={serviceForm.startDate}
                    onChange={(value) => setServiceForm(prev => ({ ...prev, startDate: value }))}
                    data-testid="input-service-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.dueDate} <span className="text-destructive">*</span></Label>
                  <DateInput
                    value={serviceForm.dueDate}
                    onChange={(value) => setServiceForm(prev => ({ ...prev, dueDate: value }))}
                    data-testid="input-service-due"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.price}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0"
                      className="flex-1"
                      data-testid="input-service-price"
                    />
                    <Select value={serviceForm.currency} onValueChange={(v) => setServiceForm(prev => ({ ...prev, currency: v as Currency }))}>
                      <SelectTrigger className="w-24" data-testid="select-service-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <EmployeeMultiSelect
                  selectedIds={serviceForm.serviceAssignees}
                  onChange={(ids) => setServiceForm(prev => ({ ...prev, serviceAssignees: ids }))}
                  label={t.assignedTo}
                  placeholder={t.selectEmployee}
                  data-testid="select-service-assignees"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.status}</Label>
                <Select value={serviceForm.status} onValueChange={(v) => setServiceForm(prev => ({ ...prev, status: v as ServiceStatus }))}>
                  <SelectTrigger data-testid="select-service-status">
                    <SelectValue placeholder={t.selectStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(serviceStatuses) as ServiceStatus[])
                      .filter(s => s !== "delayed") // delayed is computed, not selectable
                      .map((status) => (
                      <SelectItem key={status} value={status}>
                        {language === "ar" ? serviceStatuses[status].labelAr : serviceStatuses[status].labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsClientModalOpen(false)} data-testid="button-cancel-client">
            {t.cancel}
          </Button>
          <Button 
            onClick={saveClient} 
            disabled={!clientForm.name || (!editingClient && !serviceForm.dueDate)}
            data-testid="button-save-client"
          >
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Service Modal (for adding/editing services to existing clients)
  const renderServiceModal = (
    convertAmountFn: typeof convertAmount,
    formatCurrencyFn: typeof formatCurrency,
    displayCurrencyVal: typeof displayCurrency
  ) => (
    <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingService ? t.editService : t.addService}</DialogTitle>
          <DialogDescription>
            {language === "ar" ? "أضف خدمة جديدة للعميل" : "Add new service for client"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hierarchical Package Selection: Main Package (Category) -> Sub-Package (Plan) */}
          {!editingService && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === "ar" ? "فئة الباقة" : "Package Category"}</Label>
                <Select 
                  value={selectedMainPackageId} 
                  onValueChange={handleMainPackageSelect}
                >
                  <SelectTrigger data-testid="select-modal-main-package">
                    <SelectValue placeholder={language === "ar" ? "اختر الفئة" : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMainPackages.map((mp) => (
                      <SelectItem key={mp.id} value={mp.id}>
                        {language === "ar" ? mp.name : (mp.nameEn || mp.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.selectPackage}</Label>
                <Select 
                  value={serviceForm.selectedPackageId || "custom"} 
                  onValueChange={handleSubPackageSelect}
                  disabled={!selectedMainPackageId}
                >
                  <SelectTrigger data-testid="select-modal-sub-package">
                    <SelectValue placeholder={t.selectPackage} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubPackages.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        <div className="flex items-center gap-2">
                          <span>{language === "ar" ? sp.name : (sp.nameEn || sp.name)}</span>
                          <span className="text-muted-foreground text-xs">
                            ({formatCurrencyFn(
                              convertAmountFn(sp.price, sp.currency as Currency, displayCurrencyVal),
                              displayCurrencyVal
                            )})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <span className="text-muted-foreground">{t.customService}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t.orCustomService}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.serviceType} <span className="text-destructive">*</span></Label>
              <Select value={serviceForm.serviceType} onValueChange={(v) => setServiceForm(prev => ({ ...prev, serviceType: v }))}>
                <SelectTrigger data-testid="select-modal-service-type">
                  <SelectValue placeholder={t.selectServiceType} />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {language === "ar" ? s.labelAr : s.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.serviceName}</Label>
              <Input
                value={serviceForm.serviceName}
                onChange={(e) => setServiceForm(prev => ({ ...prev, serviceName: e.target.value }))}
                placeholder={t.serviceName}
                data-testid="input-modal-service-name"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.startDate}</Label>
              <DateInput
                value={serviceForm.startDate}
                onChange={(value) => setServiceForm(prev => ({ ...prev, startDate: value }))}
                data-testid="input-modal-service-start"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.dueDate} <span className="text-destructive">*</span></Label>
              <DateInput
                value={serviceForm.dueDate}
                onChange={(value) => setServiceForm(prev => ({ ...prev, dueDate: value }))}
                data-testid="input-modal-service-due"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.price}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0"
                  className="flex-1"
                  data-testid="input-modal-service-price"
                />
                <Select value={serviceForm.currency} onValueChange={(v) => setServiceForm(prev => ({ ...prev, currency: v as Currency }))}>
                  <SelectTrigger className="w-24" data-testid="select-modal-service-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <EmployeeMultiSelect
              selectedIds={serviceForm.serviceAssignees}
              onChange={(ids) => setServiceForm(prev => ({ ...prev, serviceAssignees: ids }))}
              label={t.assignedTo}
              placeholder={t.selectEmployee}
              data-testid="select-modal-service-assignees"
            />
          </div>

          <div className="space-y-2">
            <Label>{t.status}</Label>
            <Select value={serviceForm.status} onValueChange={(v) => setServiceForm(prev => ({ ...prev, status: v as ServiceStatus }))}>
              <SelectTrigger data-testid="select-modal-service-status">
                <SelectValue placeholder={t.selectStatus} />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(serviceStatuses) as ServiceStatus[])
                  .filter(s => s !== "delayed") // delayed is computed, not selectable
                  .map((status) => (
                  <SelectItem key={status} value={status}>
                    {language === "ar" ? serviceStatuses[status].labelAr : serviceStatuses[status].labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsServiceModalOpen(false)} data-testid="button-cancel-service">
            {t.cancel}
          </Button>
          <Button onClick={saveService} disabled={!serviceForm.dueDate} data-testid="button-save-service">
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render service card
  const renderServiceCard = (service: ServiceItem, clientId: string) => {
    const statusInfo = serviceStatuses[service.status];
    const StatusIcon = statusInfo.icon;
    const daysLeft = getDaysUntilDue(service.dueDate);
    
    return (
      <div
        key={service.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-background"
        data-testid={`service-card-${service.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {getServiceTypeName(service.serviceType)}
            </Badge>
            <span className="font-medium truncate">{service.serviceName}</span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {service.startDate} → {service.dueDate}
            </div>
            {service.price && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(
                  convertAmount(service.price, (service.currency as Currency) || defaultCurrency, displayCurrency),
                  displayCurrency
                )}
              </div>
            )}
            {/* Show service assignees using chips */}
            {(service.serviceAssignees && service.serviceAssignees.length > 0) ? (
              <EmployeeChips
                employeeIds={service.serviceAssignees}
                variant="service"
                showRole={true}
                size="sm"
                maxVisible={2}
                onClick={handleEmployeeClick}
              />
            ) : service.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {service.assignedTo}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {service.status === "completed" && service.completedDate ? (
            <span className="text-xs text-muted-foreground">
              {t.completedOn} {service.completedDate}
            </span>
          ) : (
            <span className={cn(
              "text-xs",
              daysLeft < 0 ? "text-red-600 dark:text-red-400" : 
              daysLeft <= 3 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
            )}>
              {daysLeft < 0 ? t.overdue : `${daysLeft} ${t.daysLeft}`}
            </span>
          )}
          
          <Badge variant="outline" className={cn(statusInfo.color, statusInfo.bgColor, "gap-1")}>
            <StatusIcon className="h-3 w-3" />
            {language === "ar" ? statusInfo.labelAr : statusInfo.labelEn}
          </Badge>

          {service.status !== "completed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markServiceCompleted(clientId, service.id)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              data-testid={`button-complete-${service.id}`}
            >
              <CheckCircle2 className="h-4 w-4 me-1" />
              {t.markCompleted}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-service-menu-${service.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={language === "ar" ? "start" : "end"}>
              <DropdownMenuItem onClick={() => openServiceModal(clientId, service)}>
                <Pencil className="h-4 w-4 me-2" />
                {t.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteService(clientId, service.id)}
              >
                <Trash2 className="h-4 w-4 me-2" />
                {t.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // DEBUG: Temporary simple return to test component mounting
  console.log("[ClientsPage] About to render, t.title:", t.title);
  
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "clients" | "leads" | "completed")} className="w-full">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <TabsList>
            <TabsTrigger value="clients" data-testid="tab-confirmed-clients">
              <Briefcase className="h-4 w-4 me-2" />
              {t.confirmedClients}
            </TabsTrigger>
            <TabsTrigger value="leads" data-testid="tab-leads">
              <Target className="h-4 w-4 me-2" />
              {t.leads}
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-clients">
              <CheckCircle2 className="h-4 w-4 me-2" />
              {t.completedClients} ({completedClients.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="ps-10 w-[200px]"
                data-testid="input-search"
              />
            </div>
            {mainTab !== "completed" && (
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-month-filter-main">
                  <Filter className="h-4 w-4 me-2" />
                  <SelectValue placeholder={t.filterByMonth} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allMonths}</SelectItem>
                  {getAvailableMainTabMonths().map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {mainTab === "clients" && (
              <Button onClick={() => openClientModal()} data-testid="button-add-client">
                <Plus className="h-4 w-4 me-2" />
                {t.addClient}
              </Button>
            )}
            {mainTab === "leads" && (
              <Button onClick={() => openLeadModal()} data-testid="button-add-lead">
                <Plus className="h-4 w-4 me-2" />
                {t.addLead}
              </Button>
            )}
          </div>
        </div>

        {/* Confirmed Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          {/* Active / Archived Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={!showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(false)}
              data-testid="button-active-clients"
            >
              {t.active} ({activeClients.length})
            </Button>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(true)}
              data-testid="button-archived-clients"
            >
              {t.archived} ({archivedClients.length})
            </Button>
          </div>


          {filteredClients.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  {showArchived ? (
                    <Archive className="h-10 w-10 text-primary" />
                  ) : (
                    <Briefcase className="h-10 w-10 text-primary" />
                  )}
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  {showArchived 
                    ? (language === "ar" ? "لا يوجد عملاء مؤرشفين" : "No Archived Clients")
                    : t.emptyClientsTitle
                  }
                </h2>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {showArchived
                    ? (language === "ar" ? "العملاء المؤرشفين سيظهرون هنا" : "Archived clients will appear here")
                    : t.emptyClientsSubtitle
                  }
                </p>
                {!showArchived && (
                  <Button onClick={() => openClientModal()} data-testid="button-add-first-client">
                    <Plus className="h-4 w-4 me-2" />
                    {t.addFirstClient}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => {
                const isExpanded = expandedClients.has(client.id);
                const services = Array.isArray(client.services) ? client.services : [];
                const inProgressCount = services.filter(s => s.status === "in_progress").length;
                const completedCount = services.filter(s => s.status === "completed").length;
                const countryInfo = Array.isArray(countries) ? countries.find(c => c.code === client.country) : undefined;
                
                // Get employee IDs from both new arrays and legacy fields for backward compatibility
                const salesOwnerIds = client.salesOwners || (client.salesOwnerId ? [client.salesOwnerId] : []);
                const assignedStaffIds = client.assignedStaff || (client.assignedManagerId ? [client.assignedManagerId] : []);
                
                return (
                  <Card key={client.id} data-testid={`card-client-${client.id}`}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleClientExpanded(client.id)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-lg" data-testid={`text-client-name-${client.id}`}>
                                {client.name}
                              </CardTitle>
                              {client.company && (
                                <Badge variant="secondary" className="text-xs">
                                  <Building2 className="h-3 w-3 me-1" />
                                  {client.company}
                                </Badge>
                              )}
                              {client.convertedFromLeadId && (
                                <Badge variant="secondary" className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                  <History className="h-3 w-3 me-1" />
                                  {t.convertedFromLead}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                              {client.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {client.phone}
                                </div>
                              )}
                              {client.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </div>
                              )}
                              {countryInfo && (
                                <div className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {language === "ar" ? countryInfo.labelAr : countryInfo.labelEn}
                                </div>
                              )}
                            </div>
                            {(salesOwnerIds.length > 0 || assignedStaffIds.length > 0) && (
                              <div className="flex flex-col gap-2 mt-3">
                                {salesOwnerIds.length > 0 && (
                                  <div className="flex items-center gap-2 flex-wrap" data-testid={`sales-owners-${client.id}`}>
                                    <span className="text-xs text-muted-foreground">{t.salesOwner}:</span>
                                    <EmployeeChips
                                      employeeIds={salesOwnerIds}
                                      variant="sales"
                                      showRole={true}
                                      size="sm"
                                      onClick={handleEmployeeClick}
                                    />
                                  </div>
                                )}
                                {assignedStaffIds.length > 0 && (
                                  <div className="flex items-center gap-2 flex-wrap" data-testid={`assigned-staff-${client.id}`}>
                                    <span className="text-xs text-muted-foreground">{t.assignedManager}:</span>
                                    <EmployeeChips
                                      employeeIds={assignedStaffIds}
                                      variant="assigned"
                                      showRole={true}
                                      size="sm"
                                      onClick={handleEmployeeClick}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-sm">
                              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                <Clock className="h-3 w-3 me-1" />
                                {inProgressCount}
                              </Badge>
                              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3 me-1" />
                                {completedCount}
                              </Badge>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-client-menu-${client.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={language === "ar" ? "start" : "end"}>
                                <DropdownMenuItem onClick={() => openClientModal(client)}>
                                  <Pencil className="h-4 w-4 me-2" />
                                  {t.edit}
                                </DropdownMenuItem>
                                {client.status === "active" && (
                                  <DropdownMenuItem onClick={() => handleMarkCompleted(client.id)} data-testid={`button-mark-completed-${client.id}`}>
                                    <CheckCircle2 className="h-4 w-4 me-2" />
                                    {t.markAsCompleted}
                                  </DropdownMenuItem>
                                )}
                                {client.status === "active" && (
                                  <DropdownMenuItem onClick={() => openConvertModal(client)} data-testid={`button-convert-to-lead-${client.id}`}>
                                    <ArrowLeftRight className="h-4 w-4 me-2" />
                                    {t.convertBackToLead}
                                  </DropdownMenuItem>
                                )}
                                {client.status !== "archived" && client.status !== "completed" ? (
                                  <DropdownMenuItem onClick={() => archiveClient(client.id)}>
                                    <Archive className="h-4 w-4 me-2" />
                                    {t.archive}
                                  </DropdownMenuItem>
                                ) : client.status === "archived" ? (
                                  <DropdownMenuItem onClick={() => restoreClient(client.id)}>
                                    <RotateCcw className="h-4 w-4 me-2" />
                                    {t.restore}
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteClient(client.id)}
                                >
                                  <Trash2 className="h-4 w-4 me-2" />
                                  {t.delete}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-toggle-${client.id}`}>
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 me-1" />
                                    {t.hideServices}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 me-1" />
                                    {t.viewServices}
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                      </CardHeader>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">{t.purchasedServices}</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openServiceModal(client.id)}
                              data-testid={`button-add-service-${client.id}`}
                            >
                              <Plus className="h-4 w-4 me-1" />
                              {t.addService}
                            </Button>
                          </div>

                          {services.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">{t.noServices}</p>
                          ) : (
                            <div className="space-y-2">
                              {services.map(service => renderServiceCard(service, client.id))}
                            </div>
                          )}

                          <ClientWorkProgress clientId={client.id} />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-6">
          {filteredLeads.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Target className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">{t.emptyLeadsTitle}</h2>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {t.emptyLeadsSubtitle}
                </p>
                <Button onClick={() => openLeadModal()} data-testid="button-add-first-lead">
                  <Plus className="h-4 w-4 me-2" />
                  {t.addFirstLead}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLeads.map((lead) => {
                const stageInfo = leadStages[lead.stage];
                const countryInfo = Array.isArray(countries) ? countries.find(c => c.code === lead.country) : undefined;
                
                return (
                  <Card key={lead.id} className="hover-elevate" data-testid={`card-lead-${lead.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate" data-testid={`text-lead-name-${lead.id}`}>
                            {lead.name}
                          </h3>
                          {lead.company && (
                            <p className="text-sm text-muted-foreground truncate">{lead.company}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-lead-menu-${lead.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={language === "ar" ? "start" : "end"}>
                            <DropdownMenuItem onClick={() => openLeadModal(lead)}>
                              <Pencil className="h-4 w-4 me-2" />
                              {t.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleConvertLead(lead.id)}>
                              <UserPlus className="h-4 w-4 me-2" />
                              {t.convertToClient}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteLead(lead.id)}
                            >
                              <Trash2 className="h-4 w-4 me-2" />
                              {t.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(stageInfo.color, stageInfo.bgColor)}
                        >
                          {language === "ar" ? stageInfo.labelAr : stageInfo.labelEn}
                        </Badge>
                        {lead.wasConfirmedClient && (
                          <Badge variant="secondary" className="text-xs">
                            <History className="h-3 w-3 me-1" />
                            {t.previouslyActive}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {lead.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                        )}
                        {countryInfo && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            {language === "ar" ? countryInfo.labelAr : countryInfo.labelEn}
                          </div>
                        )}
                        {lead.negotiatorId && Array.isArray(employees) && (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {employees.find(e => e.id === lead.negotiatorId)?.name || lead.negotiatorId}
                          </div>
                        )}
                      </div>

                      {(lead.estimatedValue || lead.expectedCloseDate) && (
                        <div className="mt-3 pt-3 border-t space-y-1 text-sm">
                          {lead.estimatedValue && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                {formatCurrency(
                                  convertAmount(Number(lead.estimatedValue), (lead.currency as Currency) || "USD", displayCurrency),
                                  displayCurrency
                                )}
                              </span>
                            </div>
                          )}
                          {lead.expectedCloseDate && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {lead.expectedCloseDate}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Completed Clients Tab */}
        <TabsContent value="completed" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={completedFilters.month || "all"} onValueChange={(v) => setCompletedFilters(prev => ({ ...prev, month: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]" data-testid="filter-month">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder={t.filterByMonth} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allMonths}</SelectItem>
                {getAvailableMonths().map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={completedFilters.country || "all"} onValueChange={(v) => setCompletedFilters(prev => ({ ...prev, country: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]" data-testid="filter-country">
                <SelectValue placeholder={t.filterByCountry} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allCountries}</SelectItem>
                {Array.isArray(countries) && countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {language === "ar" ? c.labelAr : c.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={completedFilters.employeeId || "all"} onValueChange={(v) => setCompletedFilters(prev => ({ ...prev, employeeId: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]" data-testid="filter-employee">
                <SelectValue placeholder={t.filterByEmployee} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allEmployees}</SelectItem>
                {Array.isArray(employees) && employees.filter(e => e.isActive).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {language === "ar" ? emp.name : (emp.nameEn || emp.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={completedFilters.serviceCategory || "all"} onValueChange={(v) => setCompletedFilters(prev => ({ ...prev, serviceCategory: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]" data-testid="filter-service">
                <SelectValue placeholder={t.filterByService} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allServices}</SelectItem>
                {Array.isArray(serviceTypes) && serviceTypes.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {language === "ar" ? s.labelAr : s.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredCompletedClients.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">{t.emptyCompletedTitle}</h2>
                <p className="text-muted-foreground text-center max-w-md">{t.emptyCompletedSubtitle}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCompletedClients.map((client) => {
                const countryInfo = countries.find(c => c.code === client.country);
                // Get employee IDs from both new arrays and legacy fields for backward compatibility
                const salesOwnerIds = client.salesOwners || (client.salesOwnerId ? [client.salesOwnerId] : []);
                const assignedStaffIds = client.assignedStaff || (client.assignedManagerId ? [client.assignedManagerId] : []);
                const totalValue = (Array.isArray(client.services) ? client.services : []).reduce((sum, s) => sum + (s.price || 0), 0);
                
                return (
                  <Card key={client.id} className="border-green-200 dark:border-green-800" data-testid={`card-completed-${client.id}`}>
                    <Collapsible>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{client.name}</h3>
                              {client.company && (
                                <Badge variant="outline" className="text-xs">
                                  <Building2 className="h-3 w-3 me-1" />
                                  {client.company}
                                </Badge>
                              )}
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3 me-1" />
                                {t.completedClients}
                              </Badge>
                              {client.convertedFromLeadId && (
                                <Badge variant="secondary" className="text-xs">
                                  <History className="h-3 w-3 me-1" />
                                  {t.convertedFromLead}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                              {client.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {client.phone}
                                </div>
                              )}
                              {client.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </div>
                              )}
                              {countryInfo && (
                                <div className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {language === "ar" ? countryInfo.labelAr : countryInfo.labelEn}
                                </div>
                              )}
                              {client.completedDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {t.completedDate}: {client.completedDate}
                                </div>
                              )}
                            </div>
                            {(salesOwnerIds.length > 0 || assignedStaffIds.length > 0) && (
                              <div className="flex flex-col gap-2 mt-3">
                                {salesOwnerIds.length > 0 && (
                                  <div className="flex items-center gap-2 flex-wrap" data-testid={`sales-owners-completed-${client.id}`}>
                                    <span className="text-xs text-muted-foreground">{t.salesOwner}:</span>
                                    <EmployeeChips
                                      employeeIds={salesOwnerIds}
                                      variant="sales"
                                      showRole={true}
                                      size="sm"
                                      onClick={handleEmployeeClick}
                                    />
                                  </div>
                                )}
                                {assignedStaffIds.length > 0 && (
                                  <div className="flex items-center gap-2 flex-wrap" data-testid={`assigned-staff-completed-${client.id}`}>
                                    <span className="text-xs text-muted-foreground">{t.assignedManager}:</span>
                                    <EmployeeChips
                                      employeeIds={assignedStaffIds}
                                      variant="assigned"
                                      showRole={true}
                                      size="sm"
                                      onClick={handleEmployeeClick}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                              {Array.isArray(client.services) ? client.services.length : 0} {language === "ar" ? "خدمات" : "services"}
                            </Badge>
                            {totalValue > 0 && (
                              <Badge variant="outline">
                                <DollarSign className="h-3 w-3 me-1" />
                                {totalValue.toLocaleString()}
                              </Badge>
                            )}

                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => reactivateClient(client.id, true)}
                              data-testid={`button-reactivate-${client.id}`}
                            >
                              <RotateCcw className="h-4 w-4 me-1" />
                              {t.reactivate}
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-toggle-completed-${client.id}`}>
                                <ChevronDown className="h-4 w-4 me-1" />
                                {t.servicesHistory}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                      </CardHeader>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <h4 className="font-medium text-sm mb-3">{t.servicesHistory}</h4>
                          <div className="space-y-2">
                            {(Array.isArray(client.services) ? client.services : []).map((service) => (
                              <div key={service.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary">{getServiceTypeName(service.serviceType)}</Badge>
                                  <span className="font-medium">{service.serviceName}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{service.startDate} - {service.completedDate || service.dueDate}</span>
                                  {service.price && (
                                    <Badge variant="outline">
                                      {formatCurrency(
                                        convertAmount(service.price, service.currency || "USD", displayCurrency),
                                        displayCurrency
                                      )}
                                    </Badge>
                                  )}
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                    <CheckCircle2 className="h-3 w-3 me-1" />
                                    {language === "ar" ? "مكتمل" : "Completed"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <ClientWorkProgress clientId={client.id} />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {renderLeadModal()}
      {renderClientModal(convertAmount, formatCurrency, displayCurrency)}
      {renderServiceModal(convertAmount, formatCurrency, displayCurrency)}
      {renderConvertModal()}
      
      {/* Employee Profile Drawer */}
      <EmployeeProfileDrawer
        employee={selectedEmployee}
        isOpen={isEmployeeDrawerOpen}
        onClose={() => {
          setIsEmployeeDrawerOpen(false);
          setSelectedEmployee(null);
        }}
      />
    </div>
  );
}
