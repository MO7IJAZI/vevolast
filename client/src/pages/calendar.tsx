import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Clock, User, Building2, Package, Wallet, CheckCircle, AlertCircle, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-picker";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CalendarEvent, EventType, EventStatus, EventPriority } from "@shared/schema";
import { eventTypeConfigs } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// Content translations
const content = {
  ar: {
    title: "التقويم",
    views: { monthly: "شهري", weekly: "أسبوعي", agenda: "القائمة" },
    filters: { all: "الكل", manual: "يدوي", task: "مهام", payroll: "الرواتب", client_payment: "مدفوعات العملاء", package_end: "نهاية الباقات", delivery_due: "التسليمات" },
    status: { all: "الكل", upcoming: "قادم", today: "اليوم", overdue: "متأخر", done: "مكتمل" },
    emptyTitle: "لا توجد أحداث",
    emptySubtitle: "أضف مواعيد واجتماعات ومهام للبقاء منظماً",
    addEvent: "إضافة حدث / مهمة",
    addFirstEvent: "أضف أول حدث أو مهمة",
    eventTitle: "العنوان",
    eventTitleEn: "العنوان بالإنجليزية",
    date: "التاريخ",
    time: "الوقت",
    type: "النوع",
    typeTask: "مهمة",
    typeManual: "حدث يدوي",
    assignee: "المكلف بها",
    selectEmployee: "اختر موظفاً",
    priority: "الأولوية",
    notes: "ملاحظات",
    save: "حفظ",
    cancel: "إلغاء",
    markDone: "تم",
    viewDetails: "عرض التفاصيل",
    search: "بحث...",
    priorityLow: "منخفضة",
    priorityMedium: "متوسطة",
    priorityHigh: "عالية",
    months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    daysShort: ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
    client: "العميل",
    employee: "الموظف",
    service: "الخدمة",
    autoEvents: "أحداث تلقائية",
    manualEvents: "أحداث يدوية",
    dueIn: "متبقي",
    days_unit: "أيام",
    overdue_by: "متأخر بـ",
  },
  en: {
    title: "Calendar",
    views: { monthly: "Monthly", weekly: "Weekly", agenda: "Agenda" },
    filters: { all: "All", manual: "Manual", task: "Tasks", payroll: "Payroll", client_payment: "Client Payments", package_end: "Package Ending", delivery_due: "Deliveries" },
    status: { all: "All", upcoming: "Upcoming", today: "Today", overdue: "Overdue", done: "Done" },
    emptyTitle: "No events yet",
    emptySubtitle: "Add appointments, meetings, and tasks to stay organized",
    addEvent: "Add Event / Task",
    addFirstEvent: "Add first event or task",
    eventTitle: "Title",
    eventTitleEn: "Title (English)",
    date: "Date",
    time: "Time",
    type: "Type",
    typeTask: "Task",
    typeManual: "Manual Event",
    assignee: "Assignee",
    selectEmployee: "Select Employee",
    priority: "Priority",
    notes: "Notes",
    save: "Save",
    cancel: "Cancel",
    markDone: "Mark Done",
    viewDetails: "View Details",
    search: "Search...",
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    client: "Client",
    employee: "Employee",
    service: "Service",
    autoEvents: "Auto Events",
    manualEvents: "Manual Events",
    dueIn: "Due in",
    days_unit: "days",
    overdue_by: "Overdue by",
  },
};

// Helper to generate system events from real data
function generateSystemEvents(
  clients: any[],
  employees: any[],
  salaries: any[],
  clientPayments: any[],
  payrollPayments: any[],
  language: "ar" | "en"
): Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">[] {
  const today = new Date().toISOString().split("T")[0];
  const events: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">[] = [];

  // Generate package end events from client services
  clients.forEach((client) => {
    if (client.services && client.services.length > 0) {
      client.services.forEach((service: any) => {
        if (service.dueDate && service.status !== "completed") {
          const dueDate = service.dueDate;
          let status: EventStatus = "upcoming";
          if (dueDate === today) status = "today";
          else if (dueDate < today) status = "overdue";

          events.push({
            source: "system",
            eventType: "package_end",
            titleAr: `نهاية باقة: ${client.name}`,
            titleEn: `Package Ending: ${client.name}`,
            date: dueDate,
            time: null,
            status,
            priority: status === "overdue" ? "high" : "medium",
            clientId: client.id,
            serviceId: service.id,
            employeeId: null,
            salesId: service.salesEmployeeId || null,
            notes: service.serviceName,
            reminderDays: JSON.stringify([7, 3, 1, 0]),
          });
        }

        // Delivery due events for active services
        if (service.status === "in_progress" && service.dueDate) {
          const dueDate = service.dueDate;
          let status: EventStatus = "upcoming";
          if (dueDate === today) status = "today";
          else if (dueDate < today) status = "overdue";

          events.push({
            source: "system",
            eventType: "delivery_due",
            titleAr: `موعد تسليم: ${service.serviceName}`,
            titleEn: `Delivery Due: ${service.serviceNameEn || service.serviceName}`,
            date: dueDate,
            time: null,
            status,
            priority: status === "overdue" ? "high" : "medium",
            clientId: client.id,
            serviceId: service.id,
            employeeId: service.serviceAssignees?.[0] || null,
            salesId: service.salesEmployeeId || null,
            notes: null,
            reminderDays: JSON.stringify([3, 1, 0]),
          });
        }
      });
    }
  });

  // Generate payroll events for employees with monthly salary
  const now = new Date();
  const payrollDay = 28; // Default payroll day
  const payrollDate = new Date(now.getFullYear(), now.getMonth(), payrollDay);
  const payrollDateStr = payrollDate.toISOString().split("T")[0];

  employees.forEach((emp: any) => {
    const salary = salaries.find((s: any) => s.employeeId === emp.id);
    if (salary && salary.type === "monthly" && salary.amount) {
      // Check if already paid this month
      const paidThisMonth = payrollPayments.some(
        (p: any) =>
          p.employeeId === emp.id &&
          p.month === now.getMonth() + 1 &&
          p.year === now.getFullYear()
      );

      if (!paidThisMonth) {
        let status: EventStatus = "upcoming";
        if (payrollDateStr === today) status = "today";
        else if (payrollDateStr < today) status = "overdue";

        events.push({
          source: "system",
          eventType: "payroll",
          titleAr: `راتب: ${emp.name}`,
          titleEn: `Payroll: ${emp.nameEn || emp.name}`,
          date: payrollDateStr,
          time: null,
          status,
          priority: status === "overdue" ? "high" : "medium",
          clientId: null,
          serviceId: null,
          employeeId: emp.id,
          salesId: null,
          notes: `${salary.amount} ${salary.currency}`,
          reminderDays: JSON.stringify([3, 0]),
        });
      }
    }
  });

  // Generate client payment due events (monthly recurring)
  clients
    .filter((c) => c.status === "active" && c.services?.length > 0)
    .forEach((client) => {
      const monthlyTotal = client.services.reduce((sum: number, s: any) => {
        if (s.price && s.status !== "completed") {
          return sum + s.price;
        }
        return sum;
      }, 0);

      if (monthlyTotal > 0) {
        // Check if paid this month
        const paidThisMonth = clientPayments.some(
          (p: any) =>
            p.clientId === client.id &&
            p.month === now.getMonth() + 1 &&
            p.year === now.getFullYear()
        );

        if (!paidThisMonth) {
          const dueDate = new Date(now.getFullYear(), now.getMonth(), 15)
            .toISOString()
            .split("T")[0];
          let status: EventStatus = "upcoming";
          if (dueDate === today) status = "today";
          else if (dueDate < today) status = "overdue";

          events.push({
            source: "system",
            eventType: "client_payment",
            titleAr: `دفعة مستحقة: ${client.name}`,
            titleEn: `Payment Due: ${client.name}`,
            date: dueDate,
            time: null,
            status,
            priority: status === "overdue" ? "high" : "medium",
            clientId: client.id,
            serviceId: null,
            employeeId: null,
            salesId: null,
            notes: null,
            reminderDays: JSON.stringify([7, 3, 0]),
          });
        }
      }
    });

  return events;
}

// Event Card Component
function EventCard({
  event,
  clients,
  employees,
  language,
  t,
  onMarkDone,
  onNavigate,
}: {
  event: CalendarEvent | Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">;
  clients: any[];
  employees: any[];
  language: "ar" | "en";
  t: typeof content.ar;
  onMarkDone: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const title = language === "ar" ? event.titleAr : event.titleEn || event.titleAr;
  const typeConfig = eventTypeConfigs[event.eventType as EventType];
  const client = event.clientId ? clients.find((c) => c.id === event.clientId) : null;
  const employee = event.employeeId ? employees.find((e) => e.id === event.employeeId) : null;

  const today = new Date().toISOString().split("T")[0];
  const eventDate = new Date(event.date);
  const todayDate = new Date(today);
  const diffDays = Math.ceil((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  const getStatusBadge = () => {
    switch (event.status) {
      case "done":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 me-1" />{t.status.done}</Badge>;
      case "overdue":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 me-1" />{t.status.overdue}</Badge>;
      case "today":
        return <Badge className="bg-orange-500"><Clock className="w-3 h-3 me-1" />{t.status.today}</Badge>;
      default:
        return <Badge variant="secondary">{diffDays > 0 ? `${t.dueIn} ${diffDays} ${t.days_unit}` : t.status.upcoming}</Badge>;
    }
  };

  const getTypeBadge = () => {
    const label = language === "ar" ? typeConfig.labelAr : typeConfig.labelEn;
    return (
      <Badge variant="outline" style={{ borderColor: typeConfig.color, color: typeConfig.color }}>
        {label}
      </Badge>
    );
  };

  return (
    <Card className={cn(
      "hover-elevate transition-all",
      event.status === "overdue" && "border-destructive/50",
      event.status === "today" && "border-orange-500/50",
      event.status === "done" && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(event.date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {event.time && ` - ${event.time}`}
            </p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {getTypeBadge()}
          {event.priority === "high" && <Badge variant="destructive">{t.priorityHigh}</Badge>}
        </div>

        {(client || employee) && (
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
            {client && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {client.name}
              </span>
            )}
            {employee && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {language === "ar" ? employee.name : employee.nameEn || employee.name}
              </span>
            )}
          </div>
        )}

        {event.notes && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.notes}</p>
        )}

        <div className="flex gap-2">
          {event.status !== "done" && "id" in event && (
            <Button size="sm" variant="outline" onClick={() => onMarkDone((event as CalendarEvent).id)} data-testid={`button-mark-done-${(event as CalendarEvent).id}`}>
              <CheckCircle className="w-4 h-4 me-1" />
              {t.markDone}
            </Button>
          )}
          {client && (
            <Button size="sm" variant="ghost" onClick={() => onNavigate("/clients")} data-testid="button-view-client">
              <Eye className="w-4 h-4 me-1" />
              {t.viewDetails}
            </Button>
          )}
          {employee && event.eventType === "payroll" && (
            <Button size="sm" variant="ghost" onClick={() => onNavigate("/finance")} data-testid="button-view-payroll">
              <Wallet className="w-4 h-4 me-1" />
              {t.viewDetails}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  const { language, direction } = useLanguage();
  const { clients, employees } = useData();
  const [, navigate] = useLocation();
  const t = content[language];

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<"monthly" | "weekly" | "agenda">("agenda");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    titleAr: "",
    titleEn: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    eventType: "manual" as EventType,
    employeeId: "",
    priority: "medium" as EventPriority,
    notes: "",
  });

  // Fetch calendar events from API
  const { data: manualEvents = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

  // Fetch salaries and payments for system event generation
  const { data: salaries = [] } = useQuery({
    queryKey: ["/api/employee-salaries"],
  });

  const now = new Date();
  const { data: clientPayments = [] } = useQuery({
    queryKey: ["/api/client-payments", { month: now.getMonth() + 1, year: now.getFullYear() }],
    queryFn: async () => {
      const res = await fetch(`/api/client-payments?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (!res.ok) throw new Error("Failed to fetch client payments");
      return res.json();
    },
  });

  const { data: payrollPayments = [] } = useQuery({
    queryKey: ["/api/payroll-payments", { month: now.getMonth() + 1, year: now.getFullYear() }],
    queryFn: async () => {
      const res = await fetch(`/api/payroll-payments?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (!res.ok) throw new Error("Failed to fetch payroll payments");
      return res.json();
    },
  });

  // Generate system events from real data
  const systemEvents = useMemo(() => {
    return generateSystemEvents(
      clients,
      employees,
      salaries as any[],
      clientPayments as any[],
      payrollPayments as any[],
      language
    );
  }, [clients, employees, salaries, clientPayments, payrollPayments, language]);

  // Combine manual and system events
  const allEvents = useMemo(() => {
    const manual = manualEvents.map((e) => ({ ...e, isManual: true }));
    const system = systemEvents.map((e, i) => ({ ...e, id: `sys-${i}`, isManual: false }));
    return [...manual, ...system];
  }, [manualEvents, systemEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = allEvents;

    if (filterType !== "all") {
      filtered = filtered.filter((e) => e.eventType === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((e) => e.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => {
        const title = language === "ar" ? e.titleAr : e.titleEn || e.titleAr;
        const client = e.clientId ? clients.find((c) => c.id === e.clientId) : null;
        const employee = e.employeeId ? employees.find((emp) => emp.id === e.employeeId) : null;
        return (
          title?.toLowerCase().includes(query) ||
          client?.name.toLowerCase().includes(query) ||
          employee?.name.toLowerCase().includes(query) ||
          e.notes?.toLowerCase().includes(query)
        );
      });
    }

    // Sort by date and status (overdue first, then today, then upcoming)
    filtered.sort((a, b) => {
      const statusOrder = { overdue: 0, today: 1, upcoming: 2, done: 3 };
      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 2) - (statusOrder[b.status as keyof typeof statusOrder] || 2);
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return filtered;
  }, [allEvents, filterType, filterStatus, searchQuery, language, clients, employees]);

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/calendar-events", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      setIsModalOpen(false);
      setFormData({ 
        titleAr: "", 
        titleEn: "", 
        date: new Date().toISOString().split("T")[0], 
        time: "", 
        eventType: "manual",
        employeeId: "",
        priority: "medium", 
        notes: "" 
      });
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/calendar-events/${id}`, { status: "done" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
    },
  });

  const handleSubmit = () => {
    if (!formData.titleAr && !formData.titleEn) return;
    
    createEventMutation.mutate({
      source: "manual",
      eventType: formData.eventType,
      titleAr: formData.titleAr || formData.titleEn,
      titleEn: formData.titleEn || formData.titleAr,
      date: formData.date,
      time: formData.time || null,
      status: "upcoming",
      priority: formData.priority,
      employeeId: formData.eventType === "task" ? (formData.employeeId || null) : null,
      notes: formData.notes || null,
      reminderDays: JSON.stringify([1, 0]),
    });
  };

  // Navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Calendar grid for monthly view
  const getMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const grid: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let i = 1; i <= daysInMonth; i++) grid.push(i);

    return grid;
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.date === dateStr);
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: allEvents.length,
      overdue: allEvents.filter((e) => e.status === "overdue").length,
      today: allEvents.filter((e) => e.status === "today").length,
      upcoming: allEvents.filter((e) => e.status === "upcoming").length,
    };
  }, [allEvents]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>{stats.total} {language === "ar" ? "حدث" : "events"}</span>
            {stats.overdue > 0 && <span className="text-destructive">{stats.overdue} {t.status.overdue}</span>}
            {stats.today > 0 && <span className="text-orange-500">{stats.today} {t.status.today}</span>}
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} data-testid="button-add-event">
          <Plus className="h-4 w-4 me-2" />
          {t.addEvent}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-events"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-type">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filters.all}</SelectItem>
                <SelectItem value="manual">{t.filters.manual}</SelectItem>
                <SelectItem value="task">{t.filters.task}</SelectItem>
                <SelectItem value="payroll">{t.filters.payroll}</SelectItem>
                <SelectItem value="client_payment">{t.filters.client_payment}</SelectItem>
                <SelectItem value="package_end">{t.filters.package_end}</SelectItem>
                <SelectItem value="delivery_due">{t.filters.delivery_due}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.status.all}</SelectItem>
                <SelectItem value="upcoming">{t.status.upcoming}</SelectItem>
                <SelectItem value="today">{t.status.today}</SelectItem>
                <SelectItem value="overdue">{t.status.overdue}</SelectItem>
                <SelectItem value="done">{t.status.done}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Views Tabs */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="agenda" data-testid="tab-agenda">{t.views.agenda}</TabsTrigger>
          <TabsTrigger value="monthly" data-testid="tab-monthly">{t.views.monthly}</TabsTrigger>
          <TabsTrigger value="weekly" data-testid="tab-weekly">{t.views.weekly}</TabsTrigger>
        </TabsList>

        {/* Agenda View */}
        <TabsContent value="agenda">
          {filteredEvents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <CalendarIcon className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">{t.emptyTitle}</h2>
                <p className="text-muted-foreground text-center max-w-md mb-6">{t.emptySubtitle}</p>
                <Button onClick={() => setIsModalOpen(true)} data-testid="button-add-first-event">
                  <Plus className="h-4 w-4 me-2" />
                  {t.addFirstEvent}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event, idx) => (
                <EventCard
                  key={event.id || `sys-${idx}`}
                  event={event}
                  clients={clients}
                  employees={employees}
                  language={language}
                  t={t}
                  onMarkDone={(id) => markDoneMutation.mutate(id)}
                  onNavigate={navigate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Monthly View */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={direction === "rtl" ? goToNextMonth : goToPrevMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <CardTitle>
                  {t.months[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={direction === "rtl" ? goToPrevMonth : goToNextMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {t.daysShort.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getMonthGrid().map((day, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[80px] p-1 border rounded-md",
                      day === null && "bg-muted/30",
                      day === new Date().getDate() &&
                        currentDate.getMonth() === new Date().getMonth() &&
                        currentDate.getFullYear() === new Date().getFullYear() &&
                        "border-primary"
                    )}
                  >
                    {day && (
                      <>
                        <div className="text-sm font-medium mb-1">{day}</div>
                        <div className="space-y-0.5">
                          {getEventsForDay(day).slice(0, 3).map((event, i) => {
                            const typeConfig = eventTypeConfigs[event.eventType as EventType];
                            return (
                              <div
                                key={i}
                                className="text-xs truncate px-1 py-0.5 rounded"
                                style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
                              >
                                {language === "ar" ? event.titleAr : event.titleEn || event.titleAr}
                              </div>
                            );
                          })}
                          {getEventsForDay(day).length > 3 && (
                            <div className="text-xs text-muted-foreground">+{getEventsForDay(day).length - 3}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly View */}
        <TabsContent value="weekly">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - date.getDay() + i);
                  const dateStr = date.toISOString().split("T")[0];
                  const dayEvents = filteredEvents.filter((e) => e.date === dateStr);
                  const isToday = dateStr === new Date().toISOString().split("T")[0];

                  return (
                    <div key={i} className={cn("p-3 rounded-lg", isToday && "bg-primary/5 border border-primary/20")}>
                      <div className="font-medium mb-2">
                        {t.days[i]} - {date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
                        {isToday && <Badge className="ms-2">{t.status.today}</Badge>}
                      </div>
                      {dayEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.emptyTitle}</p>
                      ) : (
                        <div className="space-y-2">
                          {dayEvents.map((event, idx) => {
                            const typeConfig = eventTypeConfigs[event.eventType as EventType];
                            const title = language === "ar" ? event.titleAr : event.titleEn || event.titleAr;
                            return (
                              <div
                                key={event.id || `sys-${idx}`}
                                className="flex items-center gap-2 text-sm p-2 rounded"
                                style={{ backgroundColor: `${typeConfig.color}10` }}
                              >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeConfig.color }} />
                                <span className="flex-1 truncate">{title}</span>
                                {event.time && <span className="text-muted-foreground">{event.time}</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addEvent}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أضف حدثاً جديداً للتقويم" : "Add a new event to your calendar"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.eventTitle}</Label>
                <Input
                  value={formData.titleAr}
                  onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                  placeholder={t.eventTitle}
                  data-testid="input-event-title-ar"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.eventTitleEn}</Label>
                <Input
                  value={formData.titleEn}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  placeholder={t.eventTitleEn}
                  data-testid="input-event-title-en"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.type}</Label>
                <Select value={formData.eventType} onValueChange={(v) => setFormData({ ...formData, eventType: v as EventType })}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t.typeManual}</SelectItem>
                    <SelectItem value="task">{t.typeTask}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.eventType === "task" && (
                <div className="space-y-2">
                  <Label>{t.assignee}</Label>
                  <Select value={formData.employeeId} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                    <SelectTrigger data-testid="select-assignee">
                      <SelectValue placeholder={t.selectEmployee} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {language === "ar" ? emp.name : emp.nameEn || emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.date}</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.time}</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  data-testid="input-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.priority}</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as EventPriority })}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t.priorityLow}</SelectItem>
                  <SelectItem value="medium">{t.priorityMedium}</SelectItem>
                  <SelectItem value="high">{t.priorityHigh}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.notes}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t.notes}
                data-testid="input-notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={createEventMutation.isPending} data-testid="button-save-event">
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
