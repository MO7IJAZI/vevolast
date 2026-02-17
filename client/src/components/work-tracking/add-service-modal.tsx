import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type ConfirmedClient, type Employee, type MainPackage, type SubPackage } from "@/contexts/DataContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ConfirmedClient[];
  employees: Employee[];
  mainPackages: MainPackage[];
  preselectedClientId?: string;
}

interface DeliverableInput {
  key: string;
  labelAr: string;
  labelEn: string;
  target: number;
  isBoolean: boolean;
}

export function AddServiceModal({
  open,
  onOpenChange,
  clients,
  employees,
  mainPackages,
  preselectedClientId,
}: AddServiceModalProps) {
  const { language } = useLanguage();
  const { subPackages } = useData();
  const { toast } = useToast();
  
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [mainPackageId, setMainPackageId] = useState("");
  const [subPackageId, setSubPackageId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceNameEn, setServiceNameEn] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [salesEmployeeId, setSalesEmployeeId] = useState("");
  const [executionEmployeeIds, setExecutionEmployeeIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [deliverables, setDeliverables] = useState<DeliverableInput[]>([]);
  const [newDeliverable, setNewDeliverable] = useState({ labelAr: "", labelEn: "", target: 1, isBoolean: false });

  const t = {
    ar: {
      title: "إضافة خدمة جديدة",
      subtitle: "أضف خدمة لتتبع التقدم والتسليمات",
      client: "العميل",
      selectClient: "اختر العميل",
      mainPackage: "الباقة الرئيسية",
      selectPackage: "اختر الباقة",
      subPackage: "الباقة الفرعية",
      selectSubPackage: "اختر الباقة الفرعية",
      serviceName: "اسم الخدمة",
      serviceNameEn: "اسم الخدمة (إنجليزي)",
      startDate: "تاريخ البدء",
      endDate: "تاريخ الانتهاء",
      price: "السعر",
      currency: "العملة",
      salesPerson: "مسؤول المبيعات",
      selectSales: "اختر مسؤول المبيعات",
      executionTeam: "فريق التنفيذ",
      selectExecution: "اختر الموظفين",
      notes: "ملاحظات",
      deliverables: "التسليمات",
      addDeliverable: "إضافة تسليم",
      deliverableName: "اسم التسليم",
      deliverableNameEn: "اسم التسليم (إنجليزي)",
      target: "الهدف",
      isYesNo: "نعم/لا",
      save: "حفظ",
      saving: "جاري الحفظ...",
      cancel: "إلغاء",
      success: "تم إضافة الخدمة بنجاح",
      error: "حدث خطأ",
      loadFromPackage: "تحميل من الباقة",
    },
    en: {
      title: "Add New Service",
      subtitle: "Add a service to track progress and deliverables",
      client: "Client",
      selectClient: "Select client",
      mainPackage: "Main Package",
      selectPackage: "Select package",
      subPackage: "Sub Package",
      selectSubPackage: "Select sub package",
      serviceName: "Service Name",
      serviceNameEn: "Service Name (English)",
      startDate: "Start Date",
      endDate: "End Date",
      price: "Price",
      currency: "Currency",
      salesPerson: "Sales Person",
      selectSales: "Select sales person",
      executionTeam: "Execution Team",
      selectExecution: "Select employees",
      notes: "Notes",
      deliverables: "Deliverables",
      addDeliverable: "Add Deliverable",
      deliverableName: "Deliverable Name",
      deliverableNameEn: "Deliverable Name (English)",
      target: "Target",
      isYesNo: "Yes/No",
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      success: "Service added successfully",
      error: "An error occurred",
      loadFromPackage: "Load from Package",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const salesEmployees = employees.filter(e => e.department === "sales");
  const executionEmployeesOptions = employees.filter(e => 
    e.department === "delivery" || e.department === "tech"
  );

  const filteredSubPackages = subPackages.filter(sp => sp.mainPackageId === mainPackageId);

  const createServiceMutation = useMutation({
    mutationFn: async () => {
      const data = {
        clientId,
        mainPackageId,
        subPackageId: subPackageId || null,
        serviceName,
        serviceNameEn: serviceNameEn || null,
        startDate,
        endDate: endDate || null,
        price: price ? parseInt(price) : null,
        currency: currency || null,
        salesEmployeeId: salesEmployeeId || null,
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
      
      return apiRequest("POST", "/api/work-tracking", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-tracking/stats/summary"] });
      toast({ title: content.success });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: content.error, description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setClientId(preselectedClientId || "");
    setMainPackageId("");
    setSubPackageId("");
    setServiceName("");
    setServiceNameEn("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setPrice("");
    setCurrency("TRY");
    setSalesEmployeeId("");
    setExecutionEmployeeIds([]);
    setNotes("");
    setDeliverables([]);
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

  const loadFromSubPackage = () => {
    const selectedSubPackage = subPackages.find(sp => sp.id === subPackageId);
    if (selectedSubPackage) {
      setServiceName(selectedSubPackage.name);
      setServiceNameEn(selectedSubPackage.nameEn);
      setPrice(String(selectedSubPackage.price));
      setCurrency(selectedSubPackage.currency);
      
      // Load deliverables from package
      const packageDeliverables = selectedSubPackage.deliverables.map(d => ({
        key: d.key,
        labelAr: d.labelAr,
        labelEn: d.labelEn,
        target: typeof d.value === "number" ? d.value : 1,
        isBoolean: typeof d.value !== "number",
      }));
      setDeliverables(packageDeliverables);
    }
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
          <DialogDescription>{content.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>{content.client}</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger data-testid="select-modal-client">
                <SelectValue placeholder={content.selectClient} />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Main Package */}
          <div className="space-y-2">
            <Label>{content.mainPackage}</Label>
            <Select value={mainPackageId} onValueChange={(v) => { setMainPackageId(v); setSubPackageId(""); }}>
              <SelectTrigger data-testid="select-modal-package">
                <SelectValue placeholder={content.selectPackage} />
              </SelectTrigger>
              <SelectContent>
                {mainPackages.map(pkg => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {language === "ar" ? pkg.name : pkg.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub Package */}
          {mainPackageId && filteredSubPackages.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>{content.subPackage}</Label>
                {subPackageId && (
                  <Button variant="ghost" size="sm" className="h-auto p-0" onClick={loadFromSubPackage}>
                    {content.loadFromPackage}
                  </Button>
                )}
              </div>
              <Select value={subPackageId} onValueChange={setSubPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder={content.selectSubPackage} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubPackages.map(sp => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {language === "ar" ? sp.name : sp.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Service Name */}
          <div className="space-y-2">
            <Label>{content.serviceName}</Label>
            <Input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              data-testid="input-service-name"
            />
          </div>

          <div className="space-y-2">
            <Label>{content.serviceNameEn}</Label>
            <Input
              value={serviceNameEn}
              onChange={(e) => setServiceNameEn(e.target.value)}
              data-testid="input-service-name-en"
            />
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <Label>{content.startDate}</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-testid="input-start-date"
            />
          </div>

          <div className="space-y-2">
            <Label>{content.endDate}</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              data-testid="input-end-date"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label>{content.price}</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              data-testid="input-price"
            />
          </div>

          <div className="space-y-2">
            <Label>{content.currency}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">TRY</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sales Person */}
          <div className="space-y-2">
            <Label>{content.salesPerson}</Label>
            <Select value={salesEmployeeId} onValueChange={setSalesEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder={content.selectSales} />
              </SelectTrigger>
              <SelectContent>
                {salesEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Execution Team */}
          <div className="space-y-2">
            <Label>{content.executionTeam}</Label>
            <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-10">
              {executionEmployeeIds.map(id => {
                const emp = employees.find(e => e.id === id);
                return emp ? (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {emp.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleExecutionEmployee(id)} 
                    />
                  </Badge>
                ) : null;
              })}
            </div>
            <Select onValueChange={toggleExecutionEmployee}>
              <SelectTrigger>
                <SelectValue placeholder={content.selectExecution} />
              </SelectTrigger>
              <SelectContent>
                {executionEmployeesOptions.map(emp => (
                  <SelectItem 
                    key={emp.id} 
                    value={emp.id}
                    disabled={executionEmployeeIds.includes(emp.id)}
                  >
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2 md:col-span-2">
            <Label>{content.notes}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Deliverables */}
          <div className="space-y-2 md:col-span-2">
            <Label>{content.deliverables}</Label>
            
            {/* Existing deliverables */}
            {Array.isArray(deliverables) && deliverables.length > 0 && (
              <div className="space-y-2 mb-4">
                {deliverables.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <span className="flex-1">{language === "ar" ? d.labelAr : d.labelEn}</span>
                    <Badge variant="outline">
                      {d.isBoolean ? "Yes/No" : `Target: ${d.target}`}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveDeliverable(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new deliverable */}
            <div className="flex flex-col md:flex-row gap-2 p-3 border rounded-md bg-muted/30">
              <Input
                placeholder={content.deliverableName}
                value={newDeliverable.labelAr}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, labelAr: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder={content.deliverableNameEn}
                value={newDeliverable.labelEn}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, labelEn: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder={content.target}
                value={newDeliverable.target}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, target: parseInt(e.target.value) || 1 })}
                className="w-20"
                disabled={newDeliverable.isBoolean}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newDeliverable.isBoolean}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, isBoolean: e.target.checked, target: 1 })}
                />
                {content.isYesNo}
              </label>
              <Button variant="outline" size="icon" onClick={handleAddDeliverable}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {content.cancel}
          </Button>
          <Button
            onClick={() => createServiceMutation.mutate()}
            disabled={!clientId || !mainPackageId || !serviceName || createServiceMutation.isPending}
            data-testid="button-save-service"
          >
            {createServiceMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {content.saving}
              </>
            ) : (
              content.save
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
