import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type ServiceItem, type ConfirmedClient, type ServiceDeliverable } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, Calendar, User, Package, CheckCircle2, Clock, AlertCircle, 
  TrendingUp, MapPin, Users, Building2, ChevronDown, ChevronUp, Check,
  Image, Video, MessageSquare, FileText, Palette, Globe, Smartphone, Bot,
  Share2, Brain, Settings, Circle, Megaphone, Layout, CreditCard, Truck, 
  Layers, Edit, Star, Type, Book, BarChart, Zap
} from "lucide-react";
import { EmployeeChips } from "@/components/employee-chip";
import { cn } from "@/lib/utils";

// Deliverables templates by main package category
const deliverablesTemplates: Record<string, { key: string; labelAr: string; labelEn: string; defaultTarget: number; icon: string; isBoolean?: boolean }[]> = {
  "main-pkg-1": [ // Social Media
    { key: "posts", labelAr: "منشورات (صور)", labelEn: "Posts (Images)", defaultTarget: 20, icon: "image" },
    { key: "reels", labelAr: "ريلز (فيديو)", labelEn: "Reels (Videos)", defaultTarget: 10, icon: "video" },
    { key: "stories", labelAr: "ستوريز", labelEn: "Stories", defaultTarget: 30, icon: "message" },
    { key: "report", labelAr: "تقرير شهري", labelEn: "Monthly Report", defaultTarget: 1, icon: "file", isBoolean: true },
  ],
  "main-pkg-2": [ // Websites
    { key: "requirements", labelAr: "جمع المتطلبات", labelEn: "Requirements Collected", defaultTarget: 1, icon: "file", isBoolean: true },
    { key: "design", labelAr: "اعتماد التصميم", labelEn: "UI Design Approved", defaultTarget: 1, icon: "palette", isBoolean: true },
    { key: "development", labelAr: "التطوير", labelEn: "Development", defaultTarget: 1, icon: "globe", isBoolean: true },
    { key: "content", labelAr: "رفع المحتوى", labelEn: "Content Upload", defaultTarget: 1, icon: "file", isBoolean: true },
    { key: "testing", labelAr: "الاختبار", labelEn: "QA Testing", defaultTarget: 1, icon: "check", isBoolean: true },
    { key: "launch", labelAr: "الإطلاق", labelEn: "Deployment/Launch", defaultTarget: 1, icon: "globe", isBoolean: true },
  ],
  "main-pkg-3": [ // Branding / Logo
    { key: "concepts", labelAr: "التصاميم المبدئية", labelEn: "Concepts", defaultTarget: 3, icon: "palette" },
    { key: "revisions", labelAr: "التعديلات", labelEn: "Revisions", defaultTarget: 2, icon: "palette" },
    { key: "formats", labelAr: "الصيغ", labelEn: "Formats", defaultTarget: 0, icon: "file" },
    { key: "delivery", labelAr: "تسليم الملفات النهائية", labelEn: "Final Files Delivery", defaultTarget: 1, icon: "file", isBoolean: true },
    { key: "final", labelAr: "تسليم الملفات النهائية", labelEn: "Final Files Delivery", defaultTarget: 1, icon: "file", isBoolean: true },
  ],
  "main-pkg-4": [ // AI Services
    { key: "discovery", labelAr: "الاكتشاف", labelEn: "Discovery/Use Case", defaultTarget: 1, icon: "bot", isBoolean: true },
    { key: "data", labelAr: "جمع البيانات", labelEn: "Data Collection", defaultTarget: 1, icon: "file", isBoolean: true },
    { key: "model", labelAr: "إعداد النموذج", labelEn: "Model/Agent Setup", defaultTarget: 1, icon: "bot", isBoolean: true },
    { key: "integration", labelAr: "التكاملات", labelEn: "Integrations", defaultTarget: 1, icon: "globe", isBoolean: true },
    { key: "testing", labelAr: "الاختبار", labelEn: "Testing", defaultTarget: 1, icon: "check", isBoolean: true },
    { key: "deployment", labelAr: "النشر", labelEn: "Deployment", defaultTarget: 1, icon: "globe", isBoolean: true },
  ],
  "main-pkg-5": [ // Apps
    { key: "requirements", labelAr: "المتطلبات", labelEn: "Requirements", defaultTarget: 1, icon: "file", isBoolean: true },
    { key: "uiux", labelAr: "UI/UX", labelEn: "UI/UX Design", defaultTarget: 1, icon: "palette", isBoolean: true },
    { key: "backend", labelAr: "Backend/API", labelEn: "Backend/API", defaultTarget: 1, icon: "globe", isBoolean: true },
    { key: "frontend", labelAr: "التطبيق", labelEn: "Frontend (App)", defaultTarget: 1, icon: "smartphone", isBoolean: true },
    { key: "testing", labelAr: "الاختبار", labelEn: "Testing", defaultTarget: 1, icon: "check", isBoolean: true },
    { key: "submission", labelAr: "رفع للمتجر", labelEn: "Store Submission", defaultTarget: 1, icon: "smartphone", isBoolean: true },
    { key: "launch", labelAr: "الإطلاق", labelEn: "Launch", defaultTarget: 1, icon: "globe", isBoolean: true },
  ],
  "main-pkg-6": [ // Custom Services
    { key: "delivered", labelAr: "تم التسليم", labelEn: "Delivered", defaultTarget: 1, icon: "check", isBoolean: true },
  ],
};

// Get icon component by name
const getDeliverableIcon = (iconName: string) => {
  // Use the extended icon mapping similar to packages.tsx
  const icons: Record<string, typeof Image> = {
    image: Image,
    video: Video,
    message: MessageSquare,
    file: FileText,
    palette: Palette,
    globe: Globe,
    smartphone: Smartphone,
    bot: Bot,
    check: Check,
    share2: Share2,
    brain: Brain,
    settings: Settings,
    circle: Circle,
    "file-text": FileText,
    users: Users,
    megaphone: Megaphone,
    layout: Layout,
    clock: Clock,
    "credit-card": CreditCard,
    truck: Truck,
    package: Package,
    layers: Layers,
    edit: Edit,
    star: Star,
    type: Type,
    book: Book,
    "bar-chart": BarChart,
    zap: Zap,
    "message-circle": MessageSquare,
  };
  return icons[iconName] || FileText;
};

// Client with services for work tracking
interface ClientWithServices {
  client: ConfirmedClient;
  activeServices: ServiceItem[];
  completedServices: ServiceItem[];
  totalActivePackages: number;
  overduePackages: number;
  nextDeadline: string | null;
}

export default function WorkTrackingPage() {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { clients, employees, mainPackages, subPackages, updateService, updateClient, reactivateClient } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("active");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const t = {
    ar: {
      title: "متابعة العمل",
      subtitle: "تتبع تقدم الخدمات والتسليمات لجميع العملاء",
      search: "بحث...",
      activeWorks: "الأعمال النشطة",
      completedWorks: "الأعمال المكتملة",
      allPackages: "جميع الباقات",
      totalServices: "إجمالي الخدمات",
      activeServices: "الخدمات النشطة",
      completedThisMonth: "المكتملة هذا الشهر",
      filterByMonth: "فلتر حسب الشهر",
      allMonths: "جميع الأشهر",
      delayedServices: "الخدمات المتأخرة",
      overallProgress: "التقدم العام",
      noClients: "لا يوجد عملاء",
      noClientsDesc: "أضف عملاء وخدمات من صفحة العملاء للبدء",
      noCompletedServices: "لا توجد أعمال مكتملة",
      noCompletedServicesDesc: "ستظهر الأعمال المكتملة هنا بعد إنهائها",
      activePackages: "باقات نشطة",
      overduePackages: "متأخرة",
      nextDeadline: "الموعد القادم",
      salesOwner: "مسؤول المبيعات",
      executionTeam: "فريق التنفيذ",
      deliverables: "التسليمات",
      progress: "التقدم",
      markCompleted: "إكمال الباقة",
      completedOn: "تم الإكمال في",
      daysRemaining: "يوم متبقي",
      daysOverdue: "يوم تأخير",
      startDate: "تاريخ البدء",
      endDate: "تاريخ الانتهاء",
      notStarted: "لم تبدأ",
      inProgress: "قيد التنفيذ",
      completed: "مكتملة",
      delayed: "متأخرة",
      onHold: "معلقة",
      done: "تم",
      of: "من",
      noDeliverables: "لا توجد تسليمات محددة",
      reactivate: "إعادة تفعيل",
      reactivateConfirm: "هل تريد إعادة الخدمات إلى حالة قيد التنفيذ؟",
    },
    en: {
      title: "Work Tracking",
      subtitle: "Track service progress and deliverables for all clients",
      search: "Search...",
      activeWorks: "Active Works",
      completedWorks: "Completed Works",
      allPackages: "All Packages",
      totalServices: "Total Services",
      activeServices: "Active Services",
      completedThisMonth: "Completed This Month",
      filterByMonth: "Filter by Month",
      allMonths: "All Months",
      delayedServices: "Delayed Services",
      overallProgress: "Overall Progress",
      noClients: "No Clients",
      noClientsDesc: "Add clients and services from the Clients page to start",
      noCompletedServices: "No Completed Works",
      noCompletedServicesDesc: "Completed works will appear here after they are finished",
      activePackages: "Active Packages",
      overduePackages: "Overdue",
      nextDeadline: "Next Deadline",
      salesOwner: "Sales Owner",
      executionTeam: "Execution Team",
      deliverables: "Deliverables",
      progress: "Progress",
      markCompleted: "Mark Completed",
      completedOn: "Completed On",
      daysRemaining: "days remaining",
      daysOverdue: "days overdue",
      startDate: "Start Date",
      endDate: "End Date",
      notStarted: "Not Started",
      inProgress: "In Progress",
      completed: "Completed",
      delayed: "Delayed",
      onHold: "On Hold",
      done: "Done",
      of: "of",
      noDeliverables: "No deliverables defined",
      reactivate: "Reactivate",
      reactivateConfirm: "Do you want to reset services to in-progress?",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  // Available months from completed services (YYYY-MM)
  const getAvailableMonths = () => {
    const months = new Set<string>();
    clients.forEach(client => {
      const services = Array.isArray(client.services) ? client.services : [];
      services.forEach(service => {
        if (service.completedDate && service.status === "completed") {
          months.add(service.completedDate.substring(0, 7));
        }
      });
    });
    return Array.from(months).sort().reverse();
  };

  // Process clients with their services
  const processedClients: ClientWithServices[] = useMemo(() => {
    return clients
      .filter(client => client.status !== "archived" && Array.isArray(client.services) && client.services.length > 0)
      .map(client => {
        const now = new Date();
        const services = Array.isArray(client.services) ? client.services : [];
        
        // Compute status for each service
        const servicesWithStatus = services.map(service => {
          let computedStatus = service.status;
          if (service.status !== "completed" && service.status !== "on_hold") {
            const dueDate = new Date(service.dueDate);
            if (dueDate < now) {
              computedStatus = "delayed";
            }
          }
          return { ...service, status: computedStatus };
        });

        const activeServices = servicesWithStatus.filter(s => s.status !== "completed");
        const completedServices = servicesWithStatus.filter(s => s.status === "completed");
        const overduePackages = activeServices.filter(s => s.status === "delayed").length;
        
        // Find next deadline
        const nextDeadline = activeServices
          .filter(s => s.dueDate)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate || null;

        return {
          client,
          activeServices,
          completedServices,
          totalActivePackages: activeServices.length,
          overduePackages,
          nextDeadline,
        };
      })
      .filter(c => {
        // Filter based on search (bilingual - check both Arabic and English fields)
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesClient = c.client.name.toLowerCase().includes(query) ||
            c.client.company?.toLowerCase().includes(query) ||
            (c.client as ConfirmedClient & { nameEn?: string }).nameEn?.toLowerCase().includes(query);
          const matchesService = [...c.activeServices, ...c.completedServices].some(s =>
            s.serviceName.toLowerCase().includes(query) ||
            s.serviceNameEn?.toLowerCase().includes(query)
          );
          if (!matchesClient && !matchesService) return false;
        }
        
        // Filter based on package
        if (packageFilter !== "all") {
          const hasPackage = [...c.activeServices, ...c.completedServices].some(s =>
            s.mainPackageId === packageFilter
          );
          if (!hasPackage) return false;
        }
        
        // Filter based on tab
        if (activeTab === "active") {
          return c.activeServices.length > 0;
        } else {
          const hasCompleted = c.completedServices.length > 0;
          if (!hasCompleted) return false;
          if (monthFilter !== "all") {
            return c.completedServices.some(s => s.completedDate?.startsWith(monthFilter));
          }
          return true;
        }
      });
  }, [clients, searchQuery, packageFilter, activeTab, monthFilter]);

  // Prepare a base list for tab counts (apply search & package filters, but NOT activeTab filtering)
  const baseFilteredClientsForCounts: ClientWithServices[] = useMemo(() => {
    return clients
      .filter(client => client.status !== "archived" && Array.isArray(client.services) && client.services.length > 0)
      .map(client => {
        const now = new Date();
        const services = Array.isArray(client.services) ? client.services : [];
        const servicesWithStatus = services.map(service => {
          let computedStatus = service.status;
          if (service.status !== "completed" && service.status !== "on_hold") {
            const dueDate = new Date(service.dueDate);
            if (dueDate < now) {
              computedStatus = "delayed";
            }
          }
          return { ...service, status: computedStatus };
        });
        const activeServices = servicesWithStatus.filter(s => s.status !== "completed");
        const completedServices = servicesWithStatus.filter(s => s.status === "completed");
        const overduePackages = activeServices.filter(s => s.status === "delayed").length;
        const nextDeadline = activeServices
          .filter(s => s.dueDate)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate || null;
        return {
          client,
          activeServices,
          completedServices,
          totalActivePackages: activeServices.length,
          overduePackages,
          nextDeadline,
        };
      })
      .filter(c => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesClient = c.client.name.toLowerCase().includes(query) ||
            c.client.company?.toLowerCase().includes(query) ||
            (c.client as ConfirmedClient & { nameEn?: string }).nameEn?.toLowerCase().includes(query);
          const matchesService = [...c.activeServices, ...c.completedServices].some(s =>
            s.serviceName.toLowerCase().includes(query) ||
            s.serviceNameEn?.toLowerCase().includes(query)
          );
          if (!matchesClient && !matchesService) return false;
        }
        if (packageFilter !== "all") {
          const hasPackage = [...c.activeServices, ...c.completedServices].some(s =>
            s.mainPackageId === packageFilter
          );
          if (!hasPackage) return false;
        }
        return true;
      });
  }, [clients, searchQuery, packageFilter]);

  const activeCount = useMemo(
    () => baseFilteredClientsForCounts.filter(c => c.activeServices.length > 0).length,
    [baseFilteredClientsForCounts]
  );
  const completedCount = useMemo(
    () =>
      baseFilteredClientsForCounts.filter(c =>
        c.completedServices.length > 0 &&
        (monthFilter === "all" || c.completedServices.some(s => s.completedDate?.startsWith(monthFilter)))
      ).length,
    [baseFilteredClientsForCounts, monthFilter]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const selectedYear = monthFilter !== "all" ? Number(monthFilter.split("-")[0]) : currentYear;
    const selectedMonthIndex = monthFilter !== "all" ? Number(monthFilter.split("-")[1]) - 1 : currentMonth;
    
    let total = 0;
    let active = 0;
    let delayed = 0;
    let completedThisMonth = 0;
    let totalProgress = 0;
    let serviceCount = 0;

    clients.forEach(client => {
      const services = Array.isArray(client.services) ? client.services : [];
      services.forEach(service => {
        total++;
        serviceCount++;
        
        let computedStatus = service.status;
        if (service.status !== "completed" && service.status !== "on_hold") {
          const dueDate = new Date(service.dueDate);
          if (dueDate < now) {
            computedStatus = "delayed";
          }
        }
        
        if (computedStatus === "in_progress" || computedStatus === "not_started") {
          active++;
        } else if (computedStatus === "delayed") {
          delayed++;
        }
        
        if (service.status === "completed" && service.completedDate) {
          const completedDate = new Date(service.completedDate);
          const matchYear = monthFilter === "all" ? completedDate.getFullYear() === currentYear : completedDate.getFullYear() === selectedYear;
          const matchMonth = monthFilter === "all" ? completedDate.getMonth() === currentMonth : completedDate.getMonth() === selectedMonthIndex;
          if (matchYear && matchMonth) {
            completedThisMonth++;
          }
        }
        
        // Calculate progress
        if (service.status === "completed") {
          totalProgress += 100;
        } else if (service.deliverables && service.deliverables.length > 0) {
          const serviceProgress = service.deliverables.reduce((acc, d) => {
            return acc + (d.target > 0 ? (d.completed / d.target) * 100 : 0);
          }, 0) / service.deliverables.length;
          totalProgress += serviceProgress;
        }
      });
    });

    return {
      total,
      active,
      delayed,
      completedThisMonth,
      overallProgress: serviceCount > 0 ? Math.round(totalProgress / serviceCount) : 0,
    };
  }, [clients]);

  // Toggle client expansion
  const toggleClient = (clientId: string) => {
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

  // Get package name
  const getPackageName = (service: ServiceItem) => {
    if (service.mainPackageId) {
      const mainPkg = mainPackages.find(p => p.id === service.mainPackageId);
      const subPkg = service.subPackageId ? subPackages.find(p => p.id === service.subPackageId) : null;
      
      if (mainPkg) {
        const mainName = language === "ar" ? mainPkg.name : mainPkg.nameEn;
        const subName = subPkg ? (language === "ar" ? subPkg.name : subPkg.nameEn) : null;
        return subName ? `${mainName} - ${subName}` : mainName;
      }
    }
    return service.serviceName || service.serviceType;
  };

  // Helper to safely check array inclusion with robust ID comparison
  const normalizeId = (id: any) => String(id || "").trim().toLowerCase();
  
  const isUserInList = (list: any, userId: string | undefined) => {
    if (!userId) return false;
    const normalizedUserId = normalizeId(userId);
    
    let safeList: any[] = [];
    if (Array.isArray(list)) {
      safeList = list;
    } else if (typeof list === 'string' && list.trim() !== "") {
      if (list.startsWith('[') && list.endsWith(']')) {
        try { safeList = JSON.parse(list); } catch { safeList = []; }
      } else {
        // Handle comma separated strings
        safeList = list.split(',').map(s => s.trim());
      }
    }
    
    if (!Array.isArray(safeList)) return false;
    return safeList.some(id => normalizeId(id) === normalizedUserId);
  };

  const isSameUser = (id1: any, id2: any) => {
     const n1 = normalizeId(id1);
     const n2 = normalizeId(id2);
     return n1 !== "" && n1 === n2;
  };

  const checkUserPermission = (service: ServiceItem, client: ConfirmedClient | undefined, currentUser: any, isUserAdmin: boolean) => {
    if (!currentUser) return false;
    if (isUserAdmin) return true;
    
    const uid = normalizeId(currentUser.id);
    const uemail = normalizeId(currentUser.email);
    const uname = normalizeId(currentUser.name);
    
    // Find the official employee record for the current user to get their "official" employee ID
    const currentEmployee = employees.find(e => 
      normalizeId(e.id) === uid || 
      normalizeId(e.email) === uemail ||
      normalizeId(e.name) === uname
    );
    
    const empId = currentEmployee ? normalizeId(currentEmployee.id) : uid;
    
    const isMatch = (id: any) => {
      const nid = normalizeId(id);
      if (!nid) return false;
      return nid === uid || nid === empId || nid === uemail || nid === uname;
    };

    const inList = (list: any) => {
      let safeList: any[] = [];
      if (Array.isArray(list)) {
        safeList = list;
      } else if (typeof list === 'string' && list.trim() !== "") {
        if (list.startsWith('[') && list.endsWith(']')) {
          try { safeList = JSON.parse(list); } catch { safeList = [list]; }
        } else {
          safeList = list.split(',').map(s => s.trim());
        }
      }
      
      if (!Array.isArray(safeList)) return false;
      return safeList.some(item => isMatch(item));
    };

    return (
      // Direct service assignees
      inList(service.serviceAssignees) ||
      inList((service as any).executionEmployeeIds) ||
      isMatch(service.assignedTo) ||
      // Sales owner of the service
      isMatch(service.salesEmployeeId) ||
      isMatch((service as any).salesEmployeeId) ||
      // Client sales owners
      isMatch(client?.salesOwnerId) ||
      inList(client?.salesOwners) ||
      // Client assigned managers/staff
      isMatch(client?.assignedManagerId) ||
      inList(client?.assignedStaff)
    );
  };

  // Get employee name with robust matching
  const getEmployeeName = (employeeId: string) => {
    if (!employeeId || typeof employeeId !== 'string') return "";
    const nid = normalizeId(employeeId);
    
    // 1. Try to find in the employees list
    const employee = employees.find(e => 
      normalizeId(e.id) === nid || 
      normalizeId(e.email) === nid || 
      normalizeId(e.name) === nid ||
      normalizeId(e.nameEn) === nid
    );
    
    if (employee) {
      return language === "ar" ? employee.name : (employee.nameEn || employee.name);
    }
    
    // 2. Try to match with the current user
    if (user && (
      normalizeId(user.id) === nid || 
      normalizeId(user.email) === nid || 
      normalizeId(user.name) === nid
    )) {
      return language === "ar" ? user.name : (user.nameEn || user.name);
    }
    
    // 3. Fallback: if it's a UUID or long random string, show "Unknown" instead of the raw ID
    // Check for UUID pattern or just length
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nid);
    if (isUuid || (nid.length > 20 && nid.includes('-'))) {
      return language === "ar" ? "موظف مجهول" : "Unknown Staff";
    }
    
    // 4. If it's already a name (doesn't look like an ID), return it as is
    if (nid.length > 0 && !/[0-9a-f]{8}/i.test(nid)) {
       return employeeId;
    }
    
    return employeeId;
  };

  // Get sales owner for a service
  const getSalesOwnerDisplay = (service: ServiceItem, client: ConfirmedClient | undefined) => {
    if (!client) return (language === "ar" ? "غير محدد" : "Unassigned");
    
    // Collect all potential sales owner IDs
    const rawIds = [
      (service as any).salesEmployeeId,
      ...(client.salesOwners || []),
      client.salesOwnerId
    ].filter(Boolean);
    
    // Deduplicate IDs
    const uniqueIds = Array.from(new Set(rawIds.map(id => normalizeId(id))));
    
    // Resolve names
    const names = uniqueIds
      .map(id => getEmployeeName(id))
      .filter(name => name && name !== "" && name !== (language === "ar" ? "موظف مجهول" : "Unknown Staff"));
    
    if (names.length > 0) {
      // Deduplicate names (in case different IDs point to same name)
      return Array.from(new Set(names)).join(", ");
    }
    
    return language === "ar" ? "غير محدد" : "Unassigned";
  };

  // Calculate days remaining/overdue
  const getDaysInfo = (service: ServiceItem) => {
    if (service.status === "completed") return null;
    
    const today = new Date();
    const dueDate = new Date(service.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Get deliverable label by key from template (for bilingual support)
  const getDeliverableLabelByKey = (packageId: string | undefined, key: string): { ar: string; en: string } => {
    const template = (packageId ? deliverablesTemplates[packageId] : undefined) ?? deliverablesTemplates["main-pkg-6"];
    const item = template?.find(t => t.key === key);
    return item ? { ar: item.labelAr, en: item.labelEn } : { ar: key, en: key };
  };

  // Get deliverables for a service (persisted -> sub package template -> main package template)
  const getDeliverables = (service: ServiceItem): ServiceDeliverable[] => {
    if (service.deliverables && service.deliverables.length > 0) {
      // For existing deliverables, derive labels from template at render time
      return service.deliverables.map(d => {
        const labels = getDeliverableLabelByKey(service.mainPackageId, d.key);
        return {
          ...d,
          label: language === "ar" ? labels.ar : labels.en,
          labelAr: labels.ar,
          labelEn: labels.en,
        };
      });
    }
    // Try sub package deliverables if present
    if (service.subPackageId) {
      const sp = subPackages.find(p => p.id === service.subPackageId);
      if (sp && Array.isArray(sp.deliverables) && sp.deliverables.length > 0) {
        return sp.deliverables.map((t: any) => ({
          key: t.key,
          label: language === "ar" ? (t.labelAr || t.label) : (t.labelEn || t.label || t.labelAr),
          labelAr: t.labelAr || t.label || "",
          labelEn: t.labelEn || t.label || "",
          target: t.target ? Number(t.target) : (t.value !== undefined && !isNaN(Number(t.value)) ? Number(t.value) : (t.isBoolean ? 1 : 0)),
          completed: 0,
          isBoolean: !!t.isBoolean,
        }));
      }
    }

    // Generate from template based on main package
    const template = ((service.mainPackageId ? deliverablesTemplates[service.mainPackageId] : undefined) 
      ?? deliverablesTemplates["main-pkg-6"]);
    if (template) {
      return template.map(t => ({
        key: t.key,
        label: language === "ar" ? t.labelAr : t.labelEn,
        labelAr: t.labelAr,
        labelEn: t.labelEn,
        target: t.defaultTarget,
        completed: 0,
        isBoolean: t.isBoolean,
      }));
    }
    
    return [];
  };

  // Calculate service progress
  const getServiceProgress = (service: ServiceItem) => {
    if (service.status === "completed") return 100;
    
    const deliverables = getDeliverables(service);
    if (deliverables.length === 0) return 0;
    
    const progress = deliverables.reduce((acc, d) => {
      // If target is > 0, calculate percentage. If target is 0 but completed > 0, count as full?
      // Or just ignore target 0 items? Let's assume if target is 0, it contributes 0 unless completed > 0 (maybe boolean like).
      // Better: if target is 0, assume it's boolean-like where any completion is 100%? Or maybe just 0.
      // Let's stick to safe division.
      return acc + (d.target > 0 ? Math.min((d.completed / d.target) * 100, 100) : (d.completed > 0 ? 100 : 0));
    }, 0) / deliverables.length;
    
    return Math.round(progress);
  };

  // Update deliverable progress
  const handleUpdateDeliverable = (clientId: string, serviceId: string, deliverableKey: string, newCompleted: number) => {
    const client = clients.find(c => c.id === clientId);
    const services = client && Array.isArray(client.services) ? client.services : [];
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Permissions Check
    const isUserAdmin = isAdmin || normalizeId(user?.role) === 'admin';
    const canEdit = checkUserPermission(service, client, user, isUserAdmin);
    
    if (!canEdit) {
       console.warn("User does not have permission to update deliverable");
       return;
    }

    let deliverables = service.deliverables || getDeliverables(service);
    // Allow any value, don't clamp to target if target is wrong (0)
    deliverables = (Array.isArray(deliverables) ? deliverables : []).map(d => 
      // Keep original target if it exists, don't overwrite with 0 or missing
      d.key === deliverableKey ? { ...d, completed: newCompleted, target: d.target > 0 ? d.target : (d.target || 0) } : d
    );

    updateService(clientId, serviceId, { deliverables });
  };

  // Toggle boolean deliverable
  const handleToggleDeliverable = (clientId: string, serviceId: string, deliverableKey: string) => {
    const client = clients.find(c => c.id === clientId);
    const services = client && Array.isArray(client.services) ? client.services : [];
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Permissions Check
    const isUserAdmin = isAdmin || normalizeId(user?.role) === 'admin';
    const canEdit = checkUserPermission(service, client, user, isUserAdmin);
    
    if (!canEdit) {
       console.warn("User does not have permission to toggle deliverable");
       return;
    }

    let deliverables = service.deliverables || getDeliverables(service);
    deliverables = (Array.isArray(deliverables) ? deliverables : []).map(d => 
      d.key === deliverableKey ? { ...d, completed: d.completed === 0 ? 1 : 0, target: d.target > 0 ? d.target : (d.target || 0) } : d
    );

    updateService(clientId, serviceId, { deliverables });
  };

  // Handle reactivate service (set back to in_progress)
  const handleReactivateService = (clientId: string, serviceId: string) => {
    updateService(clientId, serviceId, {
      status: "in_progress",
      completedDate: undefined,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/finance-summary"] });
  };

  // Handle reactivate entire client (all services back to in_progress)
  const handleReactivateClient = (clientId: string) => {
    reactivateClient(clientId, true); // true = reset all services to in_progress
    queryClient.invalidateQueries({ queryKey: ["/api/finance-summary"] });
  };

  // Handle mark service completed
  const handleMarkCompleted = (clientId: string, serviceId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Update service status
    updateService(clientId, serviceId, {
      status: "completed",
      completedDate: new Date().toISOString().split("T")[0],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/finance-summary"] });

    // Check if all services are completed
    const remainingActive = client.services.filter(s => 
      s.id !== serviceId && s.status !== "completed"
    ).length;

    if (remainingActive === 0) {
      // Update client status to completed
      updateClient(clientId, { 
        status: "completed",
        completedDate: new Date().toISOString().split("T")[0],
      });
    }
  };

  const statusColors: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    delayed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    on_hold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  };

  const statusLabels: Record<string, string> = {
    not_started: content.notStarted,
    in_progress: content.inProgress,
    completed: content.completed,
    delayed: content.delayed,
    on_hold: content.onHold,
  };

  // Render service/package card
  const renderServiceCard = (service: ServiceItem, clientId: string, isCompleted: boolean) => {
    const daysInfo = getDaysInfo(service);
    const progress = getServiceProgress(service);
    const deliverables = getDeliverables(service);
    
    // Check permissions
    // Admin can edit everything
    // Assigned users (execution team) can edit deliverables
    // Sales owner can edit deliverables
    // Assigned manager can edit deliverables
    
    // Find the client to check roles
    const client = clients.find(c => c.id === clientId);
    
    // Check permissions - Admin, Assigned (Exec), Sales Owner, Manager
    // Use the robust permission check logic
    const isUserAdmin = isAdmin || normalizeId(user?.role) === 'admin';
    const canEditDeliverables = checkUserPermission(service, client, user, isUserAdmin);
    const canMarkCompleted = canEditDeliverables; // Anyone who can edit can mark completed

    return (
      <div 
        key={service.id} 
        className="border rounded-lg p-4 bg-card/50"
        data-testid={`service-card-${service.id}`}
      >
        {/* Service Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">{getPackageName(service)}</h4>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {service.startDate} → {service.dueDate}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {language === "ar" ? "مسؤول المبيعات:" : "Sales Owner:"} {getSalesOwnerDisplay(service, client)}
              </span>
              {daysInfo !== null && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    daysInfo < 0 ? "border-red-500 text-red-600" : "border-green-500 text-green-600"
                  )}
                >
                  {Math.abs(daysInfo)} {daysInfo < 0 ? content.daysOverdue : content.daysRemaining}
                </Badge>
              )}
            </div>
          </div>
          <Badge className={statusColors[service.status]}>
            {statusLabels[service.status]}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">{content.progress}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Deliverables */}
        <div className="space-y-2 mb-3">
          <p className="text-sm font-medium text-muted-foreground">{content.deliverables}:</p>
          {deliverables.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {content.noDeliverables}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {deliverables.map(deliverable => {
                // Find template for fallback translations and icon
                const template = deliverablesTemplates[service.mainPackageId || "main-pkg-6"]?.find(t => t.key === deliverable.key);
                
                // Find definition in subPackage (SSOT) - DIRECT LOOKUP
                const sp = service.subPackageId ? subPackages.find(p => p.id === service.subPackageId) : undefined;
                const pkgDeliverable = sp?.deliverables?.find(d => d.key === deliverable.key);
                
                // Merge metadata: prioritize Package Definition > Service Data > Template > Defaults
                const iconName = pkgDeliverable?.icon || deliverable.icon || template?.icon || "file";
                const IconComponent = getDeliverableIcon(iconName);
                
                const labelAr = pkgDeliverable?.labelAr || deliverable.labelAr;
                const labelEn = pkgDeliverable?.labelEn || deliverable.labelEn;
                const baseLabel = pkgDeliverable?.label || deliverable.label;
                
                // Determine label with robust fallback strategy
                let displayLabel = "";
                if (language === "ar") {
                   // Prefer explicit Arabic label, then template Arabic label, then generic label
                   displayLabel = labelAr || template?.labelAr || baseLabel || "";
                } else {
                   displayLabel = labelEn || template?.labelEn || baseLabel || "";
                }
                
                // If displayLabel is still empty or looks like a key, use stricter fallback
                if (!displayLabel || displayLabel.startsWith('del-') || displayLabel === deliverable.key) {
                   // If we have a fallback from template, use it
                   if (template) {
                     displayLabel = language === "ar" ? template.labelAr : template.labelEn;
                   } else if (!deliverable.key.startsWith('del-')) {
                     // Only show key if it's NOT a timestamp-based key
                     displayLabel = deliverable.key; 
                   } else {
                     displayLabel = language === "ar" ? "عنصر جديد" : "New Item";
                   }
                }
                
                return (
                  <div 
                    key={deliverable.key}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border text-sm",
                      deliverable.completed >= deliverable.target && deliverable.target > 0
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : "bg-card"
                    )}
                  >
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">
                      {displayLabel}
                    </span>
                    {deliverable.isBoolean ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">{language === "ar" ? "تم" : "Done"}</span>
                            <Switch
                              checked={deliverable.completed > 0}
                              onCheckedChange={(checked) => handleUpdateDeliverable(
                                clientId,
                                service.id,
                                deliverable.key,
                                checked ? 1 : 0
                              )}
                              disabled={isCompleted || !canEditDeliverables}
                              data-testid={`toggle-${service.id}-${deliverable.key}`}
                              className="scale-75 origin-right rtl:origin-left"
                            />
                          </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Input
                          type="number"
                          min={0}
                          max={deliverable.target > 0 ? deliverable.target : undefined}
                          value={deliverable.completed}
                          onChange={(e) => {
                            let val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              // If target is set, clamp value
                              if (deliverable.target > 0) {
                                val = Math.min(val, deliverable.target);
                              }
                              handleUpdateDeliverable(
                                clientId, 
                                service.id, 
                                deliverable.key, 
                                val
                              );
                            }
                          }}
                          className="h-7 w-16 text-center text-sm p-1"
                          disabled={isCompleted || !canEditDeliverables}
                          data-testid={`input-${service.id}-${deliverable.key}`}
                        />
                        <span className="text-muted-foreground text-xs whitespace-nowrap">/ {deliverable.target}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platforms (from sub package if available) */}
        {(() => {
          const sp = service.subPackageId ? subPackages.find(p => p.id === service.subPackageId) : undefined;
          const plats: string[] = Array.isArray(sp?.platforms) ? sp!.platforms : [];
          if (!plats || plats.length === 0) return null;
          return (
            <div className="mb-3">
              <p className="text-sm font-medium text-muted-foreground">{language === "ar" ? "المنصات" : "Platforms"}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {plats.map((pl) => (
                  <Badge key={pl} variant="secondary" className="text-xs">
                    {pl}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Execution Team */}
        {service.serviceAssignees && service.serviceAssignees.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{content.executionTeam}:</span>
            <EmployeeChips employeeIds={service.serviceAssignees} maxVisible={3} size="sm" />
          </div>
        )}

        {/* Completed Date or Mark Completed Button */}
        {isCompleted ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{content.completedOn}: {service.completedDate}</span>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReactivateService(clientId, service.id)}
                data-testid={`reactivate-${service.id}`}
              >
                <Clock className="h-4 w-4 me-2" />
                {content.reactivate}
              </Button>
            )}
          </div>
        ) : (
          canMarkCompleted && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleMarkCompleted(clientId, service.id)}
              data-testid={`mark-completed-${service.id}`}
            >
              <CheckCircle2 className="h-4 w-4 me-2" />
              {content.markCompleted}
            </Button>
          )
        )}
      </div>
    );
  };

  // Render client card
  const renderClientCard = (item: ClientWithServices) => {
    const { client, activeServices, completedServices, totalActivePackages, overduePackages, nextDeadline } = item;
    const isExpanded = expandedClients.has(client.id);
    const services = activeTab === "active" ? activeServices : completedServices;

    return (
      <Card key={client.id} className="overflow-hidden" data-testid={`client-card-${client.id}`}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleClient(client.id)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover-elevate">
              <div className="flex items-start justify-between gap-4">
                {/* Client Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">{client.name}</h3>
                    {client.company && (
                      <span className="text-muted-foreground">• {client.company}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {client.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {client.country}
                      </span>
                    )}
                    {(() => {
                      const owners = Array.from(new Set((client.salesOwners || []).map(id => normalizeId(id))))
                        .map(sid => getEmployeeName(sid))
                        .filter(name => name && name !== "" && name !== (language === "ar" ? "موظف مجهول" : "Unknown Staff"));
                      
                      if (owners.length === 0) return null;
                      
                      return (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {content.salesOwner}: {owners.join(", ")}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="flex items-center gap-4">
                  {activeTab === "active" && (
                    <>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{totalActivePackages}</div>
                        <div className="text-xs text-muted-foreground">{content.activePackages}</div>
                      </div>
                      {overduePackages > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-500">{overduePackages}</div>
                          <div className="text-xs text-muted-foreground">{content.overduePackages}</div>
                        </div>
                      )}
                      {nextDeadline && (
                        <div className="text-center">
                          <div className="text-sm font-medium">{nextDeadline}</div>
                          <div className="text-xs text-muted-foreground">{content.nextDeadline}</div>
                        </div>
                      )}
                    </>
                  )}
                  <Button variant="ghost" size="icon">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {services.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {activeTab === "active" ? content.noClients : content.noCompletedServices}
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {services.map(service => renderServiceCard(service, client.id, activeTab === "completed"))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{content.title}</h1>
        <p className="text-muted-foreground">{content.subtitle}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{content.totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">{content.activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
                <p className="text-sm text-muted-foreground">{content.completedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.delayed}</p>
                <p className="text-sm text-muted-foreground">{content.delayedServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overallProgress}%</p>
                <p className="text-sm text-muted-foreground">{content.overallProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="active" data-testid="tab-active">
                {content.activeWorks} ({activeCount})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">
                {content.completedWorks} ({completedCount})
                {monthFilter !== "all" && (
                  <span className="ms-2 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                    {monthFilter}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={content.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 w-[200px]"
                  data-testid="input-search"
                />
              </div>
              <Select value={packageFilter} onValueChange={setPackageFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-package-filter">
                  <SelectValue placeholder={content.allPackages} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{content.allPackages}</SelectItem>
                  {mainPackages.filter(p => p.isActive).map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {language === "ar" ? pkg.name : pkg.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-month-filter">
                <SelectValue placeholder={content.filterByMonth} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{content.allMonths}</SelectItem>
                {getAvailableMonths().map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>

          <TabsContent value="active" className="space-y-4 mt-4">
            {processedClients.filter(c => c.activeServices.length > 0).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{content.noClients}</h3>
                  <p className="text-muted-foreground">{content.noClientsDesc}</p>
                </CardContent>
              </Card>
            ) : (
              processedClients
                .filter(c => c.activeServices.length > 0)
                .map(renderClientCard)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {processedClients.filter(c => c.completedServices.length > 0).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{content.noCompletedServices}</h3>
                  <p className="text-muted-foreground">{content.noCompletedServicesDesc}</p>
                </CardContent>
              </Card>
            ) : (
              processedClients
                .filter(c => c.completedServices.length > 0)
                .map(renderClientCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
