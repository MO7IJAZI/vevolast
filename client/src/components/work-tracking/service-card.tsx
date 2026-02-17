import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { ConfirmedClient, Employee, MainPackage } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  User, 
  Users,
  Plus,
  Minus,
  Edit,
  Trash2,
  Check
} from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";

interface ServiceDeliverable {
  id: string;
  serviceId: string;
  key: string;
  labelAr: string;
  labelEn: string;
  target: number;
  completed: number;
  icon?: string;
  isBoolean: boolean;
}

interface ClientServiceWithDeliverables {
  id: string;
  clientId: string;
  mainPackageId: string;
  subPackageId?: string;
  serviceName: string;
  serviceNameEn?: string;
  startDate: string;
  endDate?: string;
  status: "not_started" | "in_progress" | "completed" | "delayed";
  price?: number;
  currency?: string;
  salesEmployeeId?: string;
  executionEmployeeIds?: string[];
  notes?: string;
  completedAt?: string;
  deliverables: ServiceDeliverable[];
  progress: number;
}

interface ServiceCardProps {
  service: ClientServiceWithDeliverables;
  clients: ConfirmedClient[];
  employees: Employee[];
  mainPackages: MainPackage[];
}

export function ServiceCard({ service, clients, employees, mainPackages }: ServiceCardProps) {
  const { language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [showDeliverables, setShowDeliverables] = useState(false);

  const t = {
    ar: {
      notStarted: "لم تبدأ",
      inProgress: "قيد التنفيذ",
      completed: "مكتملة",
      delayed: "متأخرة",
      progress: "التقدم",
      deliverables: "التسليمات",
      salesPerson: "مسؤول المبيعات",
      executionTeam: "فريق التنفيذ",
      startDate: "تاريخ البدء",
      endDate: "تاريخ الانتهاء",
      markComplete: "تحديد كمكتمل",
      editService: "تعديل",
      deleteService: "حذف",
      updateDeliverables: "تحديث التسليمات",
      client: "العميل",
      package: "الباقة",
      daysRemaining: "يوم متبقي",
      daysOverdue: "يوم تأخير",
      updated: "تم التحديث",
    },
    en: {
      notStarted: "Not Started",
      inProgress: "In Progress",
      completed: "Completed",
      delayed: "Delayed",
      progress: "Progress",
      deliverables: "Deliverables",
      salesPerson: "Sales Person",
      executionTeam: "Execution Team",
      startDate: "Start Date",
      endDate: "End Date",
      markComplete: "Mark Complete",
      editService: "Edit",
      deleteService: "Delete",
      updateDeliverables: "Update Deliverables",
      client: "Client",
      package: "Package",
      daysRemaining: "days remaining",
      daysOverdue: "days overdue",
      updated: "Updated",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const client = clients.find(c => c.id === service.clientId);
  const mainPackage = mainPackages.find(p => p.id === service.mainPackageId);
  const salesEmployee = employees.find(e => e.id === service.salesEmployeeId);
  const executionEmployees = employees.filter(e => 
    service.executionEmployeeIds?.includes(e.id)
  );

  const statusConfig = {
    not_started: { label: content.notStarted, color: "bg-gray-500", icon: Clock },
    in_progress: { label: content.inProgress, color: "bg-blue-500", icon: Clock },
    completed: { label: content.completed, color: "bg-green-500", icon: CheckCircle2 },
    delayed: { label: content.delayed, color: "bg-red-500", icon: AlertCircle },
  };

  const statusInfo = statusConfig[service.status];
  const StatusIcon = statusInfo.icon;

  // Calculate days remaining or overdue
  const getDaysInfo = () => {
    if (!service.endDate || service.status === "completed") return null;
    
    const endDate = new Date(service.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { days: Math.abs(diffDays), isOverdue: true };
    }
    return { days: diffDays, isOverdue: false };
  };

  const daysInfo = getDaysInfo();

  // Mutation for updating deliverable
  const updateDeliverableMutation = useMutation({
    mutationFn: async ({ deliverableId, completed }: { deliverableId: string; completed: number }) => {
      return apiRequest("PATCH", `/api/work-tracking/${service.id}/deliverables/${deliverableId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking/stats/summary"] });
      toast({ title: content.updated });
    },
  });

  // Mutation for marking complete
  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/work-tracking/${service.id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking/stats/summary"] });
      toast({ title: content.completed });
    },
  });

  const handleDeliverableChange = (deliverable: ServiceDeliverable, delta: number) => {
    const newCompleted = Math.max(0, Math.min(deliverable.target, deliverable.completed + delta));
    updateDeliverableMutation.mutate({ deliverableId: deliverable.id, completed: newCompleted });
  };

  return (
    <>
      <Card className="hover-elevate" data-testid={`card-service-${service.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {language === "ar" ? service.serviceName : (service.serviceNameEn || service.serviceName)}
              </CardTitle>
              <p className="text-sm text-muted-foreground truncate">
                {client?.name || "—"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={`${statusInfo.color} text-white`}>
                <StatusIcon className="h-3 w-3 me-1" />
                {statusInfo.label}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {service.status !== "completed" && (
                    <DropdownMenuItem onClick={() => markCompleteMutation.mutate()}>
                      <Check className="h-4 w-4 me-2" />
                      {content.markComplete}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowDeliverables(true)}>
                    <Edit className="h-4 w-4 me-2" />
                    {content.updateDeliverables}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Package Info */}
          {mainPackage && (
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="font-medium me-2">{content.package}:</span>
              {language === "ar" ? mainPackage.name : mainPackage.nameEn}
            </div>
          )}

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{content.progress}</span>
              <span className="font-medium">{service.progress}%</span>
            </div>
            <Progress value={service.progress} />
          </div>

          {/* Deliverables Summary */}
          {Array.isArray(service.deliverables) && service.deliverables.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{content.deliverables}</p>
              <div className="grid grid-cols-2 gap-2">
                {service.deliverables.slice(0, 4).map(deliverable => (
                  <div key={deliverable.id} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                    <span className="truncate">
                      {language === "ar" ? deliverable.labelAr : deliverable.labelEn}
                    </span>
                    <span className="font-mono text-xs">
                      {deliverable.isBoolean 
                        ? (deliverable.completed >= 1 ? "✓" : "—")
                        : `${deliverable.completed}/${deliverable.target}`
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Dates */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-4 w-4 me-1" />
              {new Date(service.startDate).toLocaleDateString()}
            </div>
            {daysInfo && (
              <Badge variant={daysInfo.isOverdue ? "destructive" : "secondary"}>
                {daysInfo.days} {daysInfo.isOverdue ? content.daysOverdue : content.daysRemaining}
              </Badge>
            )}
          </div>

          {/* Team */}
          {(salesEmployee || executionEmployees.length > 0) && (
            <div className="flex items-center gap-2">
              {salesEmployee && (
                <EmployeeAvatar 
                  name={salesEmployee.name} 
                  nameEn={salesEmployee.nameEn} 
                  profileImage={salesEmployee.profileImage} 
                  size="sm" 
                />
              )}
              {executionEmployees.slice(0, 3).map(emp => (
                <EmployeeAvatar 
                  key={emp.id} 
                  name={emp.name} 
                  nameEn={emp.nameEn} 
                  profileImage={emp.profileImage} 
                  size="sm" 
                />
              ))}
              {executionEmployees.length > 3 && (
                <Badge variant="secondary">+{executionEmployees.length - 3}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deliverables Dialog */}
      <Dialog open={showDeliverables} onOpenChange={setShowDeliverables}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{content.updateDeliverables}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? service.serviceName : (service.serviceNameEn || service.serviceName)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(Array.isArray(service.deliverables) ? service.deliverables : []).map(deliverable => (
              <div key={deliverable.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">
                    {language === "ar" ? deliverable.labelAr : deliverable.labelEn}
                  </p>
                  {!deliverable.isBoolean && (
                    <p className="text-sm text-muted-foreground">
                      {deliverable.completed} / {deliverable.target}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {deliverable.isBoolean ? (
                    <Button
                      variant={deliverable.completed >= 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDeliverableChange(deliverable, deliverable.completed >= 1 ? -1 : 1)}
                      disabled={updateDeliverableMutation.isPending}
                    >
                      {deliverable.completed >= 1 ? <CheckCircle2 className="h-4 w-4" /> : "—"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeliverableChange(deliverable, -1)}
                        disabled={deliverable.completed <= 0 || updateDeliverableMutation.isPending}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-mono">{deliverable.completed}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeliverableChange(deliverable, 1)}
                        disabled={deliverable.completed >= deliverable.target || updateDeliverableMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
