import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  LogOut,
  User,
} from "lucide-react";

interface ClientServiceSummary {
  totalServices: number;
  inProgress: number;
  completed: number;
  notStarted: number;
  delayed: number;
  overallProgress: number;
  totalDeliverables: number;
  completedDeliverables: number;
}

interface ClientService {
  id: string;
  serviceName: string;
  serviceNameEn?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  totalDeliverables: number;
  completedDeliverables: number;
  deliverables: Array<{
    id: string;
    key: string;
    labelAr: string;
    labelEn: string;
    target: number;
    completed: number;
    icon?: string;
    isBoolean?: boolean;
  }>;
}

export default function ClientDashboard() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: summary, isLoading: isLoadingSummary } = useQuery<ClientServiceSummary>({
    queryKey: ["/api/client/services/summary"],
  });

  const { data: services, isLoading: isLoadingServices } = useQuery<ClientService[]>({
    queryKey: ["/api/client/services"],
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setLocation("/client/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const t = {
    ar: {
      welcome: "مرحباً",
      dashboard: "لوحة التحكم",
      yourProgress: "تقدم خدماتك",
      services: "الخدمات",
      invoices: "الفواتير",
      totalServices: "إجمالي الخدمات",
      inProgress: "قيد التنفيذ",
      completed: "مكتملة",
      notStarted: "لم تبدأ",
      delayed: "متأخرة",
      overallProgress: "التقدم العام",
      recentServices: "الخدمات الأخيرة",
      viewAll: "عرض الكل",
      logout: "تسجيل الخروج",
      noServices: "لا توجد خدمات حالياً",
      deliverables: "التسليمات",
    },
    en: {
      welcome: "Welcome",
      dashboard: "Dashboard",
      yourProgress: "Your Progress",
      services: "Services",
      invoices: "Invoices",
      totalServices: "Total Services",
      inProgress: "In Progress",
      completed: "Completed",
      notStarted: "Not Started",
      delayed: "Delayed",
      overallProgress: "Overall Progress",
      recentServices: "Recent Services",
      viewAll: "View All",
      logout: "Logout",
      noServices: "No services yet",
      deliverables: "Deliverables",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const statusColors: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    delayed: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, { ar: string; en: string }> = {
    not_started: { ar: "لم تبدأ", en: "Not Started" },
    in_progress: { ar: "قيد التنفيذ", en: "In Progress" },
    completed: { ar: "مكتمل", en: "Completed" },
    delayed: { ar: "متأخر", en: "Delayed" },
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!user || !(user as any).isClientUser) {
    setLocation("/client/login");
    return null;
  }

  return (
    <div 
      className="min-h-screen bg-background"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <div>
              <h1 className="font-semibold">{content.welcome}, {(user as any).name}</h1>
              <p className="text-sm text-muted-foreground">{content.dashboard}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 me-2" />
            {content.logout}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                <span className="text-sm">{content.totalServices}</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {isLoadingSummary ? <Skeleton className="h-8 w-12" /> : summary?.totalServices || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{content.inProgress}</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {isLoadingSummary ? <Skeleton className="h-8 w-12" /> : summary?.inProgress || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">{content.completed}</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {isLoadingSummary ? <Skeleton className="h-8 w-12" /> : summary?.completed || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{content.delayed}</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {isLoadingSummary ? <Skeleton className="h-8 w-12" /> : summary?.delayed || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{content.overallProgress}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <div className="space-y-2">
                <Progress value={summary?.overallProgress || 0} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{summary?.completedDeliverables || 0} / {summary?.totalDeliverables || 0} {content.deliverables}</span>
                  <span>{summary?.overallProgress || 0}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{content.services}</CardTitle>
              <CardDescription>{content.yourProgress}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingServices ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : services && services.length > 0 ? (
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {language === "ar" ? service.serviceName : (service.serviceNameEn || service.serviceName)}
                      </h4>
                      <Badge className={statusColors[service.status]}>
                        {language === "ar" 
                          ? statusLabels[service.status]?.ar 
                          : statusLabels[service.status]?.en}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{service.completedDeliverables} / {service.totalDeliverables} {content.deliverables}</span>
                        <span>{service.progress}%</span>
                      </div>
                      <Progress value={service.progress} className="h-2" />
                    </div>
                    {Array.isArray(service.deliverables) && service.deliverables.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                        {service.deliverables.slice(0, 4).map((d) => (
                          <div key={d.id} className="text-xs p-2 rounded bg-muted/50 flex items-center justify-between gap-1">
                            <span className="truncate">{language === "ar" ? d.labelAr : d.labelEn}</span>
                            <span className="font-medium">{d.completed}/{d.target}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{content.noServices}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
