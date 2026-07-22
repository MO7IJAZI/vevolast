import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type ConfirmedClient, type ServiceItem, type ServiceDeliverable, type Employee } from "@/contexts/DataContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, X, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ReactivateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ConfirmedClient;
}

interface EditableService {
  original: ServiceItem;
  active: boolean;
  serviceName: string;
  serviceNameEn: string;
  startDate: string;
  endDate: string;
  price: string;
  currency: string;
  executionEmployeeIds: string[];
  notes: string;
  deliverables: { key: string; labelAr: string; labelEn: string; target: number; isBoolean: boolean }[];
  expanded: boolean;
}

export function ReactivateClientModal({ open, onOpenChange, client }: ReactivateClientModalProps) {
  const { language } = useLanguage();
  const { employees } = useData();
  const { toast } = useToast();

  const [services, setServices] = useState<EditableService[]>([]);
  const [saving, setSaving] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState<Record<string, { labelAr: string; labelEn: string; target: number; isBoolean: boolean }>>({});

  const executionEmployeesOptions = employees.filter(e =>
    e.department === "delivery" || e.department === "tech"
  );

  const t = {
    ar: {
      title: "إعادة تفعيل العميل",
      subtitle: "اختر الخدمات التي تريد إعادة تفعيلها وقم بتعديل بياناتها",
      client: "العميل",
      services: "الخدمات",
      selectAll: "اختر الكل",
      reactivateSelected: "إعادة تفعيل المحدد",
      reactivating: "جاري التفعيل...",
      serviceName: "اسم الخدمة",
      serviceNameEn: "اسم الخدمة (إنجليزي)",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      price: "السعر",
      currency: "العملة",
      executionTeam: "فريق التنفيذ",
      notes: "ملاحظات",
      deliverables: "التسليمات",
      addDeliverable: "إضافة تسليم",
      deliverableName: "اسم التسليم",
      deliverableNameEn: "اسم التسليم (إنجليزي)",
      target: "العدد",
      isYesNo: "نعم/لا",
      cancel: "إلغاء",
      success: "تم إعادة تفعيل الخدمات بنجاح",
      error: "حدث خطأ",
      noServices: "لا توجد خدمات مكتملة",
      expand: "تعديل",
      collapse: "إخفاء",
    },
    en: {
      title: "Reactivate Client",
      subtitle: "Select services to reactivate and edit their details",
      client: "Client",
      services: "Services",
      selectAll: "Select All",
      reactivateSelected: "Reactivate Selected",
      reactivating: "Reactivating...",
      serviceName: "Service Name",
      serviceNameEn: "Service Name (English)",
      startDate: "Start Date",
      endDate: "End Date",
      price: "Price",
      currency: "Currency",
      executionTeam: "Execution Team",
      notes: "Notes",
      deliverables: "Deliverables",
      addDeliverable: "Add Deliverable",
      deliverableName: "Deliverable Name",
      deliverableNameEn: "Deliverable Name (English)",
      target: "Target",
      isYesNo: "Yes/No",
      cancel: "Cancel",
      success: "Services reactivated successfully",
      error: "An error occurred",
      noServices: "No completed services",
      expand: "Edit",
      collapse: "Hide",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  useEffect(() => {
    if (open && client) {
      const clientServices = Array.isArray(client.services) ? client.services : [];
      const completed = clientServices.filter(s => s.status === "completed");
      setServices(completed.map(s => ({
        original: s,
        active: true,
        serviceName: s.serviceName || "",
        serviceNameEn: s.serviceNameEn || "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        price: s.price ? String(s.price) : "",
        currency: s.currency || "TRY",
        executionEmployeeIds: s.serviceAssignees || [],
        notes: s.notes || "",
        deliverables: (s.deliverables || []).map((d: ServiceDeliverable) => ({
          key: d.key || "",
          labelAr: d.labelAr || "",
          labelEn: d.labelEn || "",
          target: typeof d.target === "number" ? d.target : 1,
          isBoolean: d.isBoolean || false,
        })),
        expanded: false,
      })));
    }
  }, [open, client]);

  const toggleExpand = (index: number) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, expanded: !s.expanded } : s));
  };

  const toggleActive = (index: number) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, active: !s.active } : s));
  };

  const toggleAll = () => {
    const allActive = services.every(s => s.active);
    setServices(prev => prev.map(s => ({ ...s, active: !allActive })));
  };

  const updateService = (index: number, field: keyof EditableService, value: any) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const toggleExecutionEmployee = (svcIndex: number, empId: string) => {
    setServices(prev => prev.map((s, i) => {
      if (i !== svcIndex) return s;
      const ids = s.executionEmployeeIds.includes(empId)
        ? s.executionEmployeeIds.filter(id => id !== empId)
        : [...s.executionEmployeeIds, empId];
      return { ...s, executionEmployeeIds: ids };
    }));
  };

  const addDeliverable = (svcIndex: number) => {
    const nd = newDeliverable[svcIndex];
    if (!nd || !nd.labelAr || !nd.labelEn) return;
    const key = nd.labelEn.toLowerCase().replace(/\s+/g, "_");
    setServices(prev => prev.map((s, i) => {
      if (i !== svcIndex) return s;
      return { ...s, deliverables: [...s.deliverables, { ...nd, key }] };
    }));
    setNewDeliverable(prev => ({ ...prev, [svcIndex]: { labelAr: "", labelEn: "", target: 1, isBoolean: false } }));
  };

  const removeDeliverable = (svcIndex: number, delIndex: number) => {
    setServices(prev => prev.map((s, i) => {
      if (i !== svcIndex) return s;
      return { ...s, deliverables: s.deliverables.filter((_, di) => di !== delIndex) };
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const selected = services.filter(s => s.active);
    let successCount = 0;
    try {
      for (const svc of selected) {
        const data = {
          clientId: client.id,
          mainPackageId: svc.original.mainPackageId,
          subPackageId: svc.original.subPackageId || null,
          serviceName: svc.serviceName,
          serviceNameEn: svc.serviceNameEn || null,
          startDate: svc.startDate,
          endDate: svc.endDate || null,
          price: svc.price ? Math.round(Number(svc.price)) : null,
          currency: svc.currency || null,
          executionEmployeeIds: svc.executionEmployeeIds.length > 0 ? svc.executionEmployeeIds : null,
          notes: svc.notes || null,
          status: "not_started",
          deliverables: svc.deliverables.map(d => ({
            key: d.key,
            labelAr: d.labelAr,
            labelEn: d.labelEn,
            target: d.target,
            completed: 0,
            isBoolean: d.isBoolean,
          })),
        };
        await apiRequest("POST", "/api/work-tracking", data);
        successCount++;
      }
      // Update client status to active
      await apiRequest("PATCH", `/api/clients/${client.id}`, { status: "active", completedDate: undefined });
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking/stats/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: content.success, description: `${successCount} ${language === "ar" ? "خدمة" : "services"} reactivated` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: content.error, description: error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const allSelected = services.length > 0 && services.every(s => s.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{content.title}: {client.name}</DialogTitle>
        </DialogHeader>

        {services.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{content.noServices}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {allSelected ? content.selectAll : content.selectAll}
                  {services.filter(s => s.active).length}/{services.length}
                </Button>
              </div>
            </div>

            {services.map((svc, index) => (
              <div key={svc.original.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={svc.active} onCheckedChange={() => toggleActive(index)} />
                    <span className={cn("font-medium", !svc.active && "text-muted-foreground line-through")}>
                      {svc.serviceName}
                    </span>
                    {svc.original.price && (
                      <Badge variant="outline" className="text-xs">
                        {svc.original.price} {svc.original.currency}
                      </Badge>
                    )}
                  </div>
                  {svc.active && (
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(index)}>
                      {svc.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {svc.expanded ? content.collapse : content.expand}
                    </Button>
                  )}
                </div>

                {svc.expanded && svc.active && (
                  <div className="grid gap-3 pr-6 border-t pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{content.serviceName}</Label>
                        <Input value={svc.serviceName} onChange={e => updateService(index, "serviceName", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">{content.serviceNameEn}</Label>
                        <Input value={svc.serviceNameEn} onChange={e => updateService(index, "serviceNameEn", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{content.startDate}</Label>
                        <Input type="date" value={svc.startDate} onChange={e => updateService(index, "startDate", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">{content.endDate}</Label>
                        <Input type="date" value={svc.endDate} onChange={e => updateService(index, "endDate", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{content.price}</Label>
                        <Input type="number" value={svc.price} onChange={e => updateService(index, "price", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">{content.currency}</Label>
                        <Select value={svc.currency} onValueChange={v => updateService(index, "currency", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="TRY">TRY</SelectItem>
                            <SelectItem value="SAR">SAR</SelectItem>
                            <SelectItem value="AED">AED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{content.executionTeam}</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {executionEmployeesOptions.map(emp => (
                          <Button
                            key={emp.id}
                            variant={svc.executionEmployeeIds.includes(emp.id) ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toggleExecutionEmployee(index, emp.id)}
                          >
                            {emp.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{content.notes}</Label>
                      <Textarea value={svc.notes} onChange={e => updateService(index, "notes", e.target.value)} rows={2} />
                    </div>
                    <div>
                      <Label className="text-xs">{content.deliverables}</Label>
                      {svc.deliverables.map((d, di) => (
                        <div key={di} className="flex items-center gap-2 mt-1 bg-muted p-1.5 rounded text-sm">
                          <span className="flex-1">{language === "ar" ? d.labelAr : d.labelEn}{d.isBoolean ? ` (${content.isYesNo})` : ` x${d.target}`}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeDeliverable(index, di)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-1 mt-1">
                        <Input className="flex-1 text-xs h-7" placeholder={content.deliverableName} value={newDeliverable[index]?.labelAr || ""}
                          onChange={e => setNewDeliverable(prev => ({ ...prev, [index]: { ...prev[index], labelAr: e.target.value, labelEn: prev[index]?.labelEn || "", target: prev[index]?.target || 1, isBoolean: prev[index]?.isBoolean || false } }))} />
                        <Input className="flex-1 text-xs h-7" placeholder={content.deliverableNameEn} value={newDeliverable[index]?.labelEn || ""}
                          onChange={e => setNewDeliverable(prev => ({ ...prev, [index]: { ...prev[index], labelEn: e.target.value, labelAr: prev[index]?.labelAr || "", target: prev[index]?.target || 1, isBoolean: prev[index]?.isBoolean || false } }))} />
                        <div className="flex items-center gap-1">
                          <Label className="text-[10px]">{content.isYesNo}</Label>
                          <Switch checked={newDeliverable[index]?.isBoolean || false} onCheckedChange={v => setNewDeliverable(prev => ({ ...prev, [index]: { ...prev[index], isBoolean: v, labelAr: prev[index]?.labelAr || "", labelEn: prev[index]?.labelEn || "", target: prev[index]?.target || 1 } }))} />
                        </div>
                        <Button variant="outline" size="sm" className="h-7" onClick={() => addDeliverable(index)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{content.cancel}</Button>
          <Button onClick={handleSubmit} disabled={saving || services.filter(s => s.active).length === 0}>
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {saving ? content.reactivating : `${content.reactivateSelected} (${services.filter(s => s.active).length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
