import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ClipboardList, ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface ClientWorkProgressProps {
  clientId: string;
}

interface ServiceWithProgress {
  id: string;
  serviceName: string;
  serviceNameEn?: string;
  status: "not_started" | "in_progress" | "completed" | "delayed";
  progress: number;
}

export function ClientWorkProgress({ clientId }: ClientWorkProgressProps) {
  const { language } = useLanguage();

  const { data: services, isLoading } = useQuery<ServiceWithProgress[]>({
    queryKey: ["/api/work-tracking", "client", clientId],
  });

  const t = {
    ar: {
      workProgress: "تقدم العمل",
      noServices: "لا توجد خدمات قيد التنفيذ",
      viewAll: "عرض الكل",
      notStarted: "لم تبدأ",
      inProgress: "قيد التنفيذ",
      completed: "مكتملة",
      delayed: "متأخرة",
    },
    en: {
      workProgress: "Work Progress",
      noServices: "No services in progress",
      viewAll: "View All",
      notStarted: "Not Started",
      inProgress: "In Progress",
      completed: "Completed",
      delayed: "Delayed",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const statusConfig = {
    not_started: { label: content.notStarted, color: "bg-gray-500", icon: Clock },
    in_progress: { label: content.inProgress, color: "bg-blue-500", icon: Clock },
    completed: { label: content.completed, color: "bg-green-500", icon: CheckCircle2 },
    delayed: { label: content.delayed, color: "bg-red-500", icon: AlertCircle },
  };

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="space-y-3 mt-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">{content.workProgress}</h4>
          </div>
          <Link href={`/work-tracking?clientId=${clientId}`}>
            <Button variant="ghost" size="sm" className="h-6 text-xs" data-testid={`button-view-work-${clientId}`}>
              {content.viewAll}
              <ExternalLink className="h-3 w-3 ms-1" />
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground text-center py-2">{content.noServices}</p>
      </div>
    );
  }

  const activeServices = (Array.isArray(services) ? services : []).filter(s => s.status !== "completed").slice(0, 3);
  const completedCount = (Array.isArray(services) ? services : []).filter(s => s.status === "completed").length;

  return (
    <div className="space-y-3 mt-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">{content.workProgress}</h4>
        </div>
        <Link href={`/work-tracking?clientId=${clientId}`}>
          <Button variant="ghost" size="sm" className="h-6 text-xs" data-testid={`button-view-work-${clientId}`}>
            {content.viewAll}
            <ExternalLink className="h-3 w-3 ms-1" />
          </Button>
        </Link>
      </div>

      {activeServices.length === 0 && completedCount > 0 ? (
        <div className="text-center py-2">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {completedCount} {content.completed}
          </Badge>
        </div>
      ) : (
        <div className="space-y-2">
          {activeServices.map(service => {
            const statusInfo = statusConfig[service.status];
            return (
              <div key={service.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {language === "ar" ? service.serviceName : (service.serviceNameEn || service.serviceName)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={service.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {service.progress}%
                    </span>
                  </div>
                </div>
                <Badge className={`${statusInfo.color} text-white text-xs shrink-0`}>
                  {statusInfo.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
