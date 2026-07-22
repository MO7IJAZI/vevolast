import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type ServiceItem, type ServiceDeliverable } from "@/contexts/DataContext";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReactivateServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  service: ServiceItem;
}

interface DeliverableInput {
  key: string;
  labelAr: string;
  labelEn: string;
  target: number;
  isBoolean: boolean;
}

export function ReactivateServiceModal({
  open,
  onOpenChange,
  clientId,
  service,
}: ReactivateServiceModalProps) {
  const { language } = useLanguage();
  const { employees } = useData();
  const { toast } = useToast();

  const [serviceName, setServiceName] = useState("");
  const [serviceNameEn, setServiceNameEn] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [executionEmployeeIds, setExecutionEmployeeIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [deliverables, setDeliverables] = useState<DeliverableInput[]>([]);
  const [newDeliverable, setNewDeliverable] = useState({ labelAr: "", labelEn: "", target: 1, isBoolean: false });
  const [saving, setSaving] = useState(false);

  const t = {
    ar: {
      title: "إعادة تفعيل الباقة",
      serviceName: "اسم الخدمة",
      serviceNameEn: "اسم الخدمة (إنجليزي)",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      price: "السعر",
      currency: "العملة",
      executionTeam: "فريق التنفيذ",
      selectExecution: "اختر الموظفين",
      notes: "ملاحظات",
      deliverables: "التسليمات",
      addDeliverable: "إضافة تسليم",
      deliverableName: "اسم التسليم",
      deliverableNameEn: "اسم التسليم (إنجليزي)",
      target: "العدد",
      isYesNo: "نعم/لا",
      save: "إعادة تفعيل",
      saving: "جاري التفعيل...",
      cancel: "إلغاء",
      success: "تم إعادة تفعيل الباقة بنجاح",
      error: "حدث خطأ",
    },
    en: {
      title: "Reactivate Service",
      serviceName: "Service Name",
      serviceNameEn: "Service Name (English)",
      startDate: "Start Date",
      endDate: "End Date",
      price: "Price",
      currency: "Currency",
      executionTeam: "Execution Team",
      selectExecution: "Select employees",
      notes: "Notes",
      deliverables: "Deliverables",
      addDeliverable: "Add Deliverable",
      deliverableName: "Deliverable Name",
      deliverableNameEn: "Deliverable Name (English)",
      target: "Target",
      isYesNo: "Yes/No",
      save: "Reactivate",
      saving: "Reactivating...",
      cancel: "Cancel",
      success: "Service reactivated successfully",
      error: "An error occurred",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const executionEmployeesOptions = employees.filter(e =>
    e.department === "delivery" || e.department === "tech"
  );

  useEffect(() => {
    if (open && service) {
      setServiceName(service.serviceName || "");
      setServiceNameEn(service.serviceNameEn || "");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setPrice(service.price ? String(service.price) : "");
      setCurrency(service.currency || "TRY");
      setExecutionEmployeeIds(service.serviceAssignees || []);
      setNotes(service.notes || "");
      if (service.deliverables && service.deliverables.length > 0) {
        setDeliverables(
          service.deliverables.map((d: ServiceDeliverable) => ({
            key: d.key || "",
            labelAr: d.labelAr || "",
            labelEn: d.labelEn || "",
            target: typeof d.target === "number" ? d.target : 1,
            isBoolean: d.isBoolean || false,
          }))
        );
      } else {
        setDeliverables([]);
      }
    }
  }, [open, service]);

  const handleSubmit = async () => {
    if (!serviceName) {
      toast({ title: content.error, description: "Service name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const data = {
        clientId,
        mainPackageId: service.mainPackageId,
        subPackageId: service.subPackageId || null,
        serviceName,
        serviceNameEn: serviceNameEn || null,
        startDate,
        endDate: endDate || null,
        price: price ? Math.round(Number(price)) : null,
        currency: currency || null,
        executionEmployeeIds: executionEmployeeIds.length > 0 ? executionEmployeeIds : null,
        notes: notes || null,
        status: "not_started",
        deliverables: deliverables.map(d => ({
          key: d.key,
          labelAr: d.labelAr,
          labelEn: d.labelEn,
          target: d.target,
          completed: 0,
          isBoolean: d.isBoolean,
        })),
      };
      await apiRequest("POST", "/api/work-tracking", data);
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking/stats/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: content.success });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: content.error, description: error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDeliverable = () => {
    if (!newDeliverable.labelAr || !newDeliverable.labelEn) return;
    const key = newDeliverable.labelEn.toLowerCase().replace(/\s+/g, "_");
    setDeliverables([...deliverables, { ...newDeliverable, key }]);
    setNewDeliverable({ labelAr: "", labelEn: "", target: 1, isBoolean: false });
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const toggleExecutionEmployee = (empId: string) => {
    if (executionEmployeeIds.includes(empId)) {
      setExecutionEmployeeIds(executionEmployeeIds.filter(id => id !== empId));
    } else {
      setExecutionEmployeeIds([...executionEmployeeIds, empId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{content.serviceName}</Label>
              <Input value={serviceName} onChange={e => setServiceName(e.target.value)} />
            </div>
            <div>
              <Label>{content.serviceNameEn}</Label>
              <Input value={serviceNameEn} onChange={e => setServiceNameEn(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{content.startDate}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{content.endDate}</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{content.price}</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>{content.currency}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <Label>{content.executionTeam}</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {executionEmployeesOptions.map(emp => (
                <Button
                  key={emp.id}
                  variant={executionEmployeeIds.includes(emp.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleExecutionEmployee(emp.id)}
                >
                  {emp.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>{content.notes}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>{content.deliverables}</Label>
            {deliverables.map((d, index) => (
              <div key={index} className="flex items-center gap-2 mt-2 bg-muted p-2 rounded">
                <div className="flex-1 text-sm">
                  {language === "ar" ? d.labelAr : d.labelEn}
                  {d.isBoolean ? ` (${content.isYesNo})` : ` x${d.target}`}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveDeliverable(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-5 gap-2 mt-2 items-end">
              <div className="col-span-2">
                <Input
                  placeholder={content.deliverableName}
                  value={newDeliverable.labelAr}
                  onChange={e => setNewDeliverable({ ...newDeliverable, labelAr: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Input
                  placeholder={content.deliverableNameEn}
                  value={newDeliverable.labelEn}
                  onChange={e => setNewDeliverable({ ...newDeliverable, labelEn: e.target.value })}
                />
              </div>
              {!newDeliverable.isBoolean && (
                <div>
                  <Input
                    type="number"
                    min="1"
                    value={newDeliverable.target}
                    onChange={e => setNewDeliverable({ ...newDeliverable, target: Number(e.target.value) })}
                  />
                </div>
              )}
              <div className="flex items-center gap-1">
                <Label className="text-xs">{content.isYesNo}</Label>
                <Switch
                  checked={newDeliverable.isBoolean}
                  onCheckedChange={v => setNewDeliverable({ ...newDeliverable, isBoolean: v })}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleAddDeliverable}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {content.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {saving ? content.saving : content.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
