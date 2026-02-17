import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ClipboardList, ExternalLink, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface EmployeeWorkStatsProps {
  employeeId: string;
  department?: string;
}

interface EmployeeStats {
  totalAssigned: number;
  asSalesEmployee: number;
  asExecutionEmployee: number;
  completedServices: number;
  inProgressServices: number;
  notStartedServices: number;
  delayedServices: number;
  averageProgress: number;
  recentServices: Array<{
    id: string;
    serviceName: string;
    serviceNameEn?: string;
    status: string;
    progress: number;
  }>;
}

export function EmployeeWorkStats({ employeeId, department }: EmployeeWorkStatsProps) {
  const { language } = useLanguage();

  const { data: stats, isLoading } = useQuery<EmployeeStats>({
    queryKey: ["/api/work-tracking", "stats", "employee", employeeId],
  });

  const t = {
    ar: {
      workTrackingStats: "إحصائيات متابعة العمل",
      assignedServices: "الخدمات المسندة",
      asSales: "كمبيعات",
      asExecution: "كتنفيذ",
      completed: "مكتملة",
      inProgress: "قيد التنفيذ",
      delayed: "متأخرة",
      averageProgress: "متوسط التقدم",
      recentServices: "الخدمات الأخيرة",
      viewAll: "عرض الكل",
      noData: "لا توجد بيانات",
    },
    en: {
      workTrackingStats: "Work Tracking Stats",
      assignedServices: "Assigned Services",
      asSales: "As Sales",
      asExecution: "As Execution",
      completed: "Completed",
      inProgress: "In Progress",
      delayed: "Delayed",
      averageProgress: "Avg Progress",
      recentServices: "Recent Services",
      viewAll: "View All",
      noData: "No data",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalAssigned === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">{content.workTrackingStats}</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">{content.noData}</p>
      </div>
    );
  }

  // Show different stats based on department
  const isSales = department === "sales";
  const isExecution = department === "delivery" || department === "tech" || department === "creative";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">{content.workTrackingStats}</h3>
        </div>
        <Link href={`/work-tracking?${isSales ? 'salesEmployeeId' : 'executionEmployeeId'}=${employeeId}`}>
          <Button variant="ghost" size="sm" className="h-6 text-xs" data-testid={`button-view-employee-work-${employeeId}`}>
            {content.viewAll}
            <ExternalLink className="h-3 w-3 ms-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.totalAssigned}
            </div>
            <div className="text-xs text-muted-foreground">
              {content.assignedServices}
            </div>
          </CardContent>
        </Card>

        {isSales && (
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.asSalesEmployee}
              </div>
              <div className="text-xs text-muted-foreground">
                {content.asSales}
              </div>
            </CardContent>
          </Card>
        )}

        {isExecution && (
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.asExecutionEmployee}
              </div>
              <div className="text-xs text-muted-foreground">
                {content.asExecution}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.completedServices}
            </div>
            <div className="text-xs text-muted-foreground">
              {content.completed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.inProgressServices}
            </div>
            <div className="text-xs text-muted-foreground">
              {content.inProgress}
            </div>
          </CardContent>
        </Card>

        {stats.delayedServices > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.delayedServices}
              </div>
              <div className="text-xs text-muted-foreground">
                {content.delayed}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.averageProgress}%
            </div>
            <div className="text-xs text-muted-foreground">
              {content.averageProgress}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Services */}
      {stats.recentServices && stats.recentServices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{content.recentServices}</h4>
          {stats.recentServices.slice(0, 3).map(service => (
            <div key={service.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {language === "ar" ? service.serviceName : (service.serviceNameEn || service.serviceName)}
                </p>
                <Progress value={service.progress} className="h-1.5 mt-1" />
              </div>
              <span className="text-xs text-muted-foreground">{service.progress}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
