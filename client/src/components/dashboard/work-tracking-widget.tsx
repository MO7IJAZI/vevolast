import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardList, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  PlayCircle
} from "lucide-react";

interface SummaryStats {
  totalServices: number;
  completedServices: number;
  inProgressServices: number;
  notStartedServices: number;
  delayedServices: number;
  overallProgress: number;
  recentServices: Array<{
    id: string;
    serviceName: string;
    serviceNameEn?: string;
    status: string;
    progress: number;
    clientId: string;
  }>;
}

export function WorkTrackingWidget() {
  const { language } = useLanguage();

  const { data: stats, isLoading } = useQuery<SummaryStats>({
    queryKey: ["/api/work-tracking/stats/summary"],
  });

  const t = {
    ar: {
      title: "متابعة العمل",
      totalServices: "إجمالي الخدمات",
      completed: "مكتملة",
      inProgress: "قيد التنفيذ",
      notStarted: "لم تبدأ",
      delayed: "متأخرة",
      overallProgress: "التقدم الإجمالي",
      recentActivity: "النشاط الأخير",
      viewAll: "عرض الكل",
      noData: "لا توجد بيانات",
    },
    en: {
      title: "Work Tracking",
      totalServices: "Total Services",
      completed: "Completed",
      inProgress: "In Progress",
      notStarted: "Not Started",
      delayed: "Delayed",
      overallProgress: "Overall Progress",
      recentActivity: "Recent Activity",
      viewAll: "View All",
      noData: "No data",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  if (isLoading) {
    return (
      <Card data-testid="card-work-tracking-widget">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {content.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalServices === 0) {
    return (
      <Card data-testid="card-work-tracking-widget">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {content.title}
          </CardTitle>
          <Link href="/work-tracking">
            <Button variant="ghost" size="sm">
              {content.viewAll}
              <ArrowRight className="h-4 w-4 ms-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {content.noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-work-tracking-widget">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {content.title}
        </CardTitle>
        <Link href="/work-tracking">
          <Button variant="ghost" size="sm">
            {content.viewAll}
            <ArrowRight className="h-4 w-4 ms-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-muted/50 rounded-md">
            <div className="text-2xl font-bold">{stats.totalServices}</div>
            <div className="text-xs text-muted-foreground">{content.totalServices}</div>
          </div>
          <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {stats.completedServices}
            </div>
            <div className="text-xs text-muted-foreground">{content.completed}</div>
          </div>
          <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1">
              <PlayCircle className="h-4 w-4" />
              {stats.inProgressServices}
            </div>
            <div className="text-xs text-muted-foreground">{content.inProgress}</div>
          </div>
          {stats.delayedServices > 0 ? (
            <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300 flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {stats.delayedServices}
              </div>
              <div className="text-xs text-muted-foreground">{content.delayed}</div>
            </div>
          ) : (
            <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />
                {stats.notStartedServices}
              </div>
              <div className="text-xs text-muted-foreground">{content.notStarted}</div>
            </div>
          )}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{content.overallProgress}</span>
            <span className="text-muted-foreground">{stats.overallProgress}%</span>
          </div>
          <Progress value={stats.overallProgress} className="h-2" />
        </div>

        {/* Recent Services */}
        {stats.recentServices && stats.recentServices.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{content.recentActivity}</h4>
            <div className="space-y-2">
              {stats.recentServices.slice(0, 3).map(service => (
                <div key={service.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {language === "ar" ? service.serviceName : (service.serviceNameEn || service.serviceName)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={service.progress} className="h-1.5 flex-1 max-w-24" />
                      <span className="text-xs text-muted-foreground">{service.progress}%</span>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      service.status === "completed" ? "secondary" : 
                      service.status === "delayed" ? "destructive" : 
                      "outline"
                    }
                    className="shrink-0 ms-2"
                  >
                    {service.status === "completed" && <CheckCircle2 className="h-3 w-3 me-1" />}
                    {service.status === "in_progress" && <PlayCircle className="h-3 w-3 me-1" />}
                    {service.status === "delayed" && <AlertCircle className="h-3 w-3 me-1" />}
                    {content[service.status as keyof typeof content] || service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
