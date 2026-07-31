import { useState, useMemo } from "react";
import { 
  Plus, 
  FileText, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  Search,
  Download,
  Eye,
  SendHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { HasPermission } from "@/components/permissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { useData, type Invoice, type Currency, type ServiceItem, type InvoiceStatus } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import logoPath from "@assets/logo.png";
import { ar, enUS } from "date-fns/locale";
import { useEffect } from "react";
import { safeJsonParse } from "@/utils/safeJson";

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  kind?: "standard" | "tax" | "discount";
};

type InvoiceServiceMode = "linked" | "custom";

type InvoicePaymentMethod = "bank_transfer" | "cash" | "credit_card" | "paypal" | "wise" | "other";

type InvoiceFormData = {
  invoiceNumber: string;
  clientId: string;
  serviceId: string;
  amount: string;
  currency: Currency;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: InvoiceItem[];
};

type InvoiceMutationPayload = Omit<InvoiceFormData, "amount" | "serviceId"> & {
  clientName: string;
  amount: number;
  serviceId?: string;
};

type InvoiceUpdatePayload = Partial<InvoiceMutationPayload> & {
  paidDate?: string;
  paymentMethod?: InvoicePaymentMethod;
};

type SystemSettingsPayload = {
  defaultInvoiceCurrency?: Currency;
  invoiceFooter?: string;
  enableTaxPerInvoice?: boolean;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
};

type InvoicePreviewData = {
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientPhone?: string;
  status: InvoiceStatus;
  serviceReference?: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  currency: Currency;
  items: InvoiceItem[];
  notes?: string;
};

type SendInvoicePayload = {
  email: string;
  message?: string;
};

const generateInvoiceNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `INV-${datePart}-${randomPart}`;
};

const parseInvoiceItems = (items: Invoice["items"] | string | null | undefined): InvoiceItem[] => {
  if (typeof items === "string") {
    return safeJsonParse(items, []);
  }

  return Array.isArray(items) ? items : [];
};

const getPrimaryItemDescription = (items: InvoiceItem[]): string =>
  items.find((item) => item.description.trim())?.description.trim() || "";

const getStandardItems = (items: InvoiceItem[]): InvoiceItem[] =>
  items.filter((item) => item.kind !== "tax" && item.kind !== "discount");

const getSystemItemAmount = (items: InvoiceItem[], kind: "tax" | "discount"): number => {
  const item = items.find((entry) => entry.kind === kind);
  if (!item) {
    return 0;
  }

  return Math.abs(Number(item.quantity || 0) * Number(item.unitPrice || 0));
};

const mergeInvoiceItems = (
  standardItems: InvoiceItem[],
  taxAmount: number,
  discountAmount: number,
  language: "ar" | "en",
): InvoiceItem[] => {
  const result = [...standardItems.map((item) => ({ ...item, kind: item.kind || "standard" as const }))];

  if (taxAmount > 0) {
    result.push({
      description: language === "ar" ? "ضريبة" : "Tax",
      quantity: 1,
      unitPrice: taxAmount,
      kind: "tax",
    });
  }

  if (discountAmount > 0) {
    result.push({
      description: language === "ar" ? "خصم" : "Discount",
      quantity: 1,
      unitPrice: -discountAmount,
      kind: "discount",
    });
  }

  return result;
};

const getInvoiceTotals = (items: InvoiceItem[]) => {
  const subtotal = getStandardItems(items).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
  const tax = getSystemItemAmount(items, "tax");
  const discount = getSystemItemAmount(items, "discount");
  const total = subtotal + tax - discount;

  return { subtotal, tax, discount, total };
};

const getInvoiceStatusTone = (status: InvoiceStatus) => {
  switch (status) {
    case "paid":
      return {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        stamp: "rgba(5,150,105,0.16)",
        stampText: "#047857",
      };
    case "sent":
      return {
        badge: "bg-blue-100 text-blue-700 border-blue-200",
        stamp: "rgba(37,99,235,0.12)",
        stampText: "#1d4ed8",
      };
    case "overdue":
      return {
        badge: "bg-red-100 text-red-700 border-red-200",
        stamp: "rgba(220,38,38,0.12)",
        stampText: "#b91c1c",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        stamp: "rgba(100,116,139,0.12)",
        stampText: "#475569",
      };
  }
};

const replaceStandardItems = (
  currentItems: InvoiceItem[],
  standardItems: InvoiceItem[],
  taxAmount: number,
  discountAmount: number,
  language: "ar" | "en",
) => mergeInvoiceItems(
  standardItems.map((item) => ({ ...item, kind: "standard" as const })),
  taxAmount,
  discountAmount,
  language,
);

export default function InvoicesPage() {
  const { isAdmin, hasResourcePermission } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { clients } = useData();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [serviceMode, setServiceMode] = useState<InvoiceServiceMode>("linked");
  const [customServiceName, setCustomServiceName] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
  const [sendInvoiceData, setSendInvoiceData] = useState<SendInvoicePayload>({ email: "", message: "" });

  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: generateInvoiceNumber(),
    clientId: "",
    serviceId: "",
    amount: "0",
    currency: "USD" as Currency,
    status: "draft" as "draft" | "sent" | "paid" | "overdue",
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    notes: "",
    items: []
  });

  // Calculate total amount when items change
  useEffect(() => {
    const total = getInvoiceTotals(formData.items).total;
    setFormData(prev => ({ ...prev, amount: total.toString() }));
  }, [formData.items]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      items: replaceStandardItems(
        prev.items,
        getStandardItems(prev.items),
        Number(taxAmount || 0),
        Number(discountAmount || 0),
        language,
      ),
    }));
  }, [discountAmount, language, taxAmount]);

  const handleAddItem = () => {
    setFormData((prev) => {
      const nextRegularItems: InvoiceItem[] = [...getStandardItems(prev.items), { description: "", quantity: 1, unitPrice: 0, kind: "standard" }];
      return {
        ...prev,
        items: replaceStandardItems(prev.items, nextRegularItems, Number(taxAmount || 0), Number(discountAmount || 0), language),
      };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => {
      const nextRegularItems = getStandardItems(prev.items).filter((_, i) => i !== index);
      return {
        ...prev,
        items: replaceStandardItems(prev.items, nextRegularItems, Number(taxAmount || 0), Number(discountAmount || 0), language),
      };
    });
  };

  const handleItemChange = <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => {
    setFormData(prev => {
      const regularItems = [...getStandardItems(prev.items)];
      regularItems[index] = { ...regularItems[index], [field]: value, kind: "standard" };
      return {
        ...prev,
        items: replaceStandardItems(prev.items, regularItems, Number(taxAmount || 0), Number(discountAmount || 0), language),
      };
    });
  };

  // Fetch invoices
  const canFinance = isAdmin || hasResourcePermission("finance");
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: canFinance
  });
  const { data: systemSettings = {} } = useQuery<SystemSettingsPayload>({
    queryKey: ["/api/system-settings"],
    enabled: isAdmin,
  });

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const matchesClient = clientFilter === "all" || invoice.clientId === clientFilter;
      
      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [clientFilter, invoices, searchQuery, statusFilter]);

  const invoiceOverview = useMemo(() => {
    return filteredInvoices.reduce(
      (summary, invoice) => {
        summary.totalCount += 1;
        summary.totalAmount += invoice.amount;

        if (invoice.status === "paid") {
          summary.paidCount += 1;
          summary.paidAmount += invoice.amount;
        } else {
          summary.openCount += 1;
          summary.openAmount += invoice.amount;
        }

        if (invoice.status === "overdue") {
          summary.overdueCount += 1;
          summary.overdueAmount += invoice.amount;
        }

        return summary;
      },
      {
        totalCount: 0,
        totalAmount: 0,
        paidCount: 0,
        paidAmount: 0,
        openCount: 0,
        openAmount: 0,
        overdueCount: 0,
        overdueAmount: 0,
      }
    );
  }, [filteredInvoices]);

  const invalidateFinanceQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey)
        && typeof query.queryKey[0] === "string"
        && (
          query.queryKey[0] === "/api/client-payments"
          || query.queryKey[0] === "/api/transactions"
          || query.queryKey[0].startsWith("/api/finance-")
        ),
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceMutationPayload) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      invalidateFinanceQueries();
      
      setIsModalOpen(false);
      resetForm();
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم إنشاء الفاتورة بنجاح" : "Invoice created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message,
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InvoiceUpdatePayload }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      invalidateFinanceQueries();
      
      setIsModalOpen(false);
      resetForm();
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم تحديث الفاتورة بنجاح" : "Invoice updated successfully",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      invalidateFinanceQueries();
      
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم حذف الفاتورة بنجاح" : "Invoice deleted successfully",
      });
    }
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SendInvoicePayload }) => {
      const res = await apiRequest("POST", `/api/invoices/${id}/send`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsSendModalOpen(false);
      setInvoiceToSend(null);
      setSendInvoiceData({ email: "", message: "" });
      toast({
        title: language === "ar" ? "تم إرسال الفاتورة" : "Invoice sent",
        description: language === "ar" ? "تم إرسال الفاتورة إلى البريد الإلكتروني بنجاح" : "Invoice email sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "تعذر إرسال الفاتورة" : "Failed to send invoice",
        description: error.message,
      });
    },
  });

  if (!canFinance) {
    setLocation("/");
    return null;
  }

  const resetForm = () => {
    setEditingInvoice(null);
    setServiceMode("linked");
    setCustomServiceName("");
    setTaxAmount("0");
    setDiscountAmount("0");
    setFormData({
      invoiceNumber: generateInvoiceNumber(),
      clientId: "",
      serviceId: "",
      amount: "0",
      currency: systemSettings.defaultInvoiceCurrency || "USD",
      status: "draft",
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      notes: "",
      items: []
    });
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    const parsedItems = parseInvoiceItems(invoice.items);
    setEditingInvoice(invoice);
    setServiceMode(invoice.serviceId ? "linked" : "custom");
    setCustomServiceName(invoice.serviceId ? "" : getPrimaryItemDescription(parsedItems));
    setTaxAmount(String(getSystemItemAmount(parsedItems, "tax")));
    setDiscountAmount(String(getSystemItemAmount(parsedItems, "discount")));
    setFormData({
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      serviceId: invoice.serviceId || "",
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      notes: invoice.notes || "",
      items: parsedItems
    });
    setIsModalOpen(true);
  };

  const buildServiceDraftItem = (service: ServiceItem): InvoiceItem => ({
    description: language === "ar" ? service.serviceName : (service.serviceNameEn || service.serviceName),
    quantity: 1,
    unitPrice: Number(service.price || 0),
  });

  const handleClientChange = (clientId: string) => {
    setFormData((prev) => ({
      ...prev,
      clientId,
      serviceId: "",
      items: serviceMode === "linked"
        ? mergeInvoiceItems([], Number(taxAmount || 0), Number(discountAmount || 0), language)
        : prev.items,
    }));
  };

  const handleServiceModeChange = (mode: InvoiceServiceMode) => {
    setServiceMode(mode);
    setFormData((prev) => ({
      ...prev,
      serviceId: mode === "linked" ? prev.serviceId : "",
      items: mode === "custom" && getStandardItems(prev.items).length === 0
        ? mergeInvoiceItems(
            [{ description: customServiceName, quantity: 1, unitPrice: 0, kind: "standard" }],
            Number(taxAmount || 0),
            Number(discountAmount || 0),
            language,
          )
        : prev.items,
    }));
  };

  const handleServiceChange = (serviceId: string) => {
    const selectedService = clientServices.find((service) => service.id === serviceId);
    if (!selectedService) {
      setFormData((prev) => ({ ...prev, serviceId }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      serviceId,
      currency: (selectedService.currency as Currency) || prev.currency,
      items: replaceStandardItems(
        prev.items,
        getStandardItems(prev.items).length > 1 ? getStandardItems(prev.items) : [buildServiceDraftItem(selectedService)],
        Number(taxAmount || 0),
        Number(discountAmount || 0),
        language,
      ),
    }));
  };

  const handleCustomServiceNameChange = (value: string) => {
    setCustomServiceName(value);
    setFormData((prev) => {
      if (serviceMode !== "custom") {
        return prev;
      }

      if (prev.items.length === 0) {
        return {
          ...prev,
          items: mergeInvoiceItems([{ description: value, quantity: 1, unitPrice: 0, kind: "standard" }], Number(taxAmount || 0), Number(discountAmount || 0), language),
        };
      }

      const regularItems = getStandardItems(prev.items);
      const nextItems = [...regularItems];
      nextItems[0] = {
        ...nextItems[0],
        description: value,
      };

      return {
        ...prev,
        items: mergeInvoiceItems(nextItems, Number(taxAmount || 0), Number(discountAmount || 0), language),
      };
    });
  };

  const handleSubmit = () => {
    const client = clients.find(c => c.id === formData.clientId);
    const cleanedItems = formData.items
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        kind: item.kind || "standard" as const,
      }))
      .filter((item) => item.description || item.quantity > 0 || item.unitPrice > 0)
      .map((item) => ({
        description: item.description,
        quantity: item.quantity > 0 ? item.quantity : 1,
        unitPrice: item.kind === "discount"
          ? -Math.abs(item.unitPrice)
          : Math.abs(item.unitPrice),
        kind: item.kind,
      }));

    if (!formData.invoiceNumber.trim()) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "رقم الفاتورة مطلوب" : "Invoice number is required",
      });
      return;
    }

    if (!client) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "العميل مطلوب" : "Client is required",
      });
      return;
    }

    if (serviceMode === "linked" && !formData.serviceId) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "اختر خدمة مرتبطة" : "Select a linked service",
      });
      return;
    }

    if (serviceMode === "custom" && !customServiceName.trim()) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "أدخل اسم الخدمة المخصصة" : "Enter a custom service name",
      });
      return;
    }

    if (cleanedItems.length === 0) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "أضف بندًا واحدًا على الأقل" : "Add at least one invoice item",
      });
      return;
    }

    const payload = {
      ...formData,
      serviceId: serviceMode === "linked" && formData.serviceId ? formData.serviceId : undefined,
      clientName: client?.name || "Unknown Client",
      amount: getInvoiceTotals(cleanedItems).total,
      items: cleanedItems,
    };

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const buildPreviewInvoice = (invoice?: Invoice): InvoicePreviewData => {
    if (invoice) {
      const client = clients.find((entry) => entry.id === invoice.clientId);
      return {
        invoiceNumber: invoice.invoiceNumber,
        clientName: client?.name || invoice.clientName,
        clientEmail: client?.email || undefined,
        clientCompany: client?.company || undefined,
        clientPhone: client?.phone || undefined,
        status: invoice.status,
        serviceReference: getInvoiceServiceReference(invoice),
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        currency: invoice.currency,
        items: parseInvoiceItems(invoice.items),
        notes: invoice.notes || undefined,
      };
    }

    const client = clients.find((entry) => entry.id === formData.clientId);
    return {
      invoiceNumber: formData.invoiceNumber,
      clientName: client?.name || "",
      clientEmail: client?.email || undefined,
      clientCompany: client?.company || undefined,
      clientPhone: client?.phone || undefined,
      status: formData.status,
      serviceReference: editingInvoice ? getInvoiceServiceReference(editingInvoice) : (customServiceName || (selectedService ? (language === "ar" ? selectedService.serviceName : (selectedService.serviceNameEn || selectedService.serviceName)) : "")),
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      currency: formData.currency,
      items: formData.items,
      notes: formData.notes || undefined,
    };
  };

  const openPreview = (invoice?: Invoice) => {
    setPreviewInvoice(buildPreviewInvoice(invoice));
    setIsPreviewOpen(true);
  };

  const openSendInvoice = (invoice: Invoice) => {
    const client = clients.find((entry) => entry.id === invoice.clientId);
    setInvoiceToSend(invoice);
    setSendInvoiceData({
      email: client?.email || "",
      message: "",
    });
    setIsSendModalOpen(true);
  };

  const confirmSendInvoice = () => {
    if (!invoiceToSend || !sendInvoiceData.email.trim()) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "البريد الإلكتروني مطلوب" : "Email is required",
      });
      return;
    }

    sendInvoiceMutation.mutate({
      id: invoiceToSend.id,
      data: {
        email: sendInvoiceData.email.trim(),
        message: sendInvoiceData.message?.trim() || undefined,
      },
    });
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    const invoiceItems = parseInvoiceItems(invoice.items);
    const totals = getInvoiceTotals(invoiceItems);
    const tone = getInvoiceStatusTone(invoice.status);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 36px; color: #0f172a; background: #f8fafc; }
          .sheet { max-width: 960px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 28px; padding: 32px; position: relative; overflow: hidden; }
          .sheet::before { content:''; position:absolute; inset:0; background: linear-gradient(135deg, rgba(59,130,246,0.06), transparent 45%, rgba(14,165,233,0.04)); pointer-events:none; }
          .stamp { position:absolute; top:38px; ${language === "ar" ? "left" : "right"}:36px; transform: rotate(-12deg); border: 3px solid ${tone.stampText}; color:${tone.stampText}; background:${tone.stamp}; padding:10px 18px; border-radius:16px; font-size:20px; font-weight:800; letter-spacing:1px; }
          .header { position:relative; display: flex; justify-content: space-between; gap: 24px; margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; }
          .company-info h1 { margin: 0; color: #0f172a; font-size: 28px; }
          .company-meta { color:#475569; line-height:1.8; margin-top:12px; }
          .invoice-details { text-align: ${language === 'ar' ? 'left' : 'right'}; }
          .status-pill { display:inline-flex; align-items:center; border-radius:999px; padding:8px 14px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:600; margin-bottom:12px; }
          .client-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:16px; margin-bottom: 32px; }
          .panel { border: 1px solid #e2e8f0; border-radius: 20px; padding: 18px; background: rgba(248,250,252,0.75); }
          .panel-label { color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; position:relative; z-index:1; }
          th { background: #f8fafc; padding: 14px 12px; text-align: ${language === 'ar' ? 'right' : 'left'}; font-weight: 700; border-bottom: 1px solid #e2e8f0; color:#334155; }
          td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; }
          .item-muted { color:#64748b; font-size:12px; }
          .total-section { display: flex; justify-content: flex-end; }
          .total-box { width: 340px; border:1px solid #e2e8f0; border-radius:20px; padding:18px; background:#fff; }
          .row { display: flex; justify-content: space-between; padding: 9px 0; color:#334155; }
          .total-row { font-weight: bold; font-size: 1.15em; border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 12px; color:#0f172a; }
          .footer-note { margin-top:24px; color:#64748b; font-size:13px; line-height:1.8; white-space:pre-wrap; }
          @media print {
            body { padding: 0; background:#fff; }
            .sheet { border:none; border-radius:0; padding:0; }
            @page { margin: 2cm; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          ${invoice.status === "paid" ? `<div class="stamp">${language === "ar" ? "مدفوعة" : "PAID"}</div>` : ""}
          <div class="header">
            <div class="company-info">
              <img src="${logoPath}" alt="${companyName} Logo" style="height:52px; width:auto;" />
              <h1>${companyName}</h1>
              <div class="company-meta">
                <div>${companyAddress || "Digital Marketing Agency"}</div>
                ${companyEmail ? `<div>${companyEmail}</div>` : ""}
                ${companyPhone ? `<div>${companyPhone}</div>` : ""}
              </div>
            </div>
            <div class="invoice-details">
              <div class="status-pill">${t[invoice.status as keyof typeof t]}</div>
              <h2 style="margin:0 0 12px;">${language === 'ar' ? 'فاتورة' : 'INVOICE'}</h2>
              <p style="margin:6px 0;"># ${invoice.invoiceNumber}</p>
              <p style="margin:6px 0;">${language === 'ar' ? 'التاريخ' : 'Date'}: ${format(new Date(invoice.issueDate), "dd MMM yyyy")}</p>
              <p style="margin:6px 0;">${language === 'ar' ? 'الاستحقاق' : 'Due'}: ${format(new Date(invoice.dueDate), "dd MMM yyyy")}</p>
              ${invoice.paidDate ? `<p style="margin:6px 0;">${t.paidDate}: ${format(new Date(invoice.paidDate), "dd MMM yyyy")}</p>` : ""}
            </div>
          </div>

          <div class="client-grid">
            <div class="panel">
              <div class="panel-label">${language === 'ar' ? 'فوترة إلى' : 'Bill To'}</div>
              <div><strong>${client?.name || invoice.clientName}</strong></div>
              ${client?.company ? `<div>${client.company}</div>` : ""}
              ${client?.email ? `<div>${client.email}</div>` : ""}
              ${client?.phone ? `<div>${client.phone}</div>` : ""}
            </div>
            <div class="panel">
              <div class="panel-label">${language === 'ar' ? 'ملخص الفاتورة' : 'Invoice Summary'}</div>
              <div>${t.serviceReference}: ${getInvoiceServiceReference(invoice)}</div>
              <div>${t.status}: ${t[invoice.status as keyof typeof t]}</div>
              <div>${t.currency}: ${invoice.currency}</div>
            </div>
          </div>

        <table>
          <thead>
            <tr>
              <th>${language === 'ar' ? 'الوصف' : 'Description'}</th>
              <th>${language === 'ar' ? 'الكمية' : 'Qty'}</th>
              <th>${language === 'ar' ? 'السعر' : 'Price'}</th>
              <th>${language === 'ar' ? 'المجموع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceItems.map((item: InvoiceItem) => `
              <tr>
                <td>
                  <div>${item.description}</div>
                  ${item.kind && item.kind !== "standard" ? `<div class="item-muted">${item.kind}</div>` : ""}
                </td>
                <td>${item.quantity}</td>
                <td>${Number(item.unitPrice).toLocaleString()} ${invoice.currency}</td>
                <td>${(item.quantity * item.unitPrice).toLocaleString()} ${invoice.currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-box">
            <div class="row">
              <span>${language === 'ar' ? 'الإجمالي قبل الضريبة والخصم' : 'Subtotal'}</span>
              <span>${totals.subtotal.toLocaleString()} ${invoice.currency}</span>
            </div>
            <div class="row">
              <span>${language === 'ar' ? 'الضريبة' : 'Tax'}</span>
              <span>${totals.tax.toLocaleString()} ${invoice.currency}</span>
            </div>
            <div class="row">
              <span>${language === 'ar' ? 'الخصم' : 'Discount'}</span>
              <span>${totals.discount.toLocaleString()} ${invoice.currency}</span>
            </div>
            <div class="row total-row">
              <span>${language === 'ar' ? 'المجموع الكلي' : 'Total Amount'}</span>
              <span>${totals.total.toLocaleString()} ${invoice.currency}</span>
            </div>
          </div>
        </div>

        ${(invoice.notes || systemSettings.invoiceFooter)
          ? `<div class="footer-note">${[invoice.notes, systemSettings.invoiceFooter].filter(Boolean).join("\n\n")}</div>`
          : ""}
        
        <script>
          window.onload = () => { window.print(); }
        </script>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<Invoice | null>(null);
  const [markPaidData, setMarkPaidData] = useState({
    date: new Date().toISOString().split('T')[0],
    method: "bank_transfer" as InvoicePaymentMethod
  });

  const handleMarkPaidClick = (invoice: Invoice) => {
    setInvoiceToMarkPaid(invoice);
    setMarkPaidData({
      date: new Date().toISOString().split('T')[0],
      method: "bank_transfer"
    });
    setIsMarkPaidModalOpen(true);
  };

  const confirmMarkPaid = () => {
    if (!invoiceToMarkPaid) return;

    updateMutation.mutate({
      id: invoiceToMarkPaid.id,
      data: {
        status: "paid",
        paidDate: markPaidData.date,
        paymentMethod: markPaidData.method
      }
    });
    setIsMarkPaidModalOpen(false);
  };

  const content = {
    ar: {
      title: "الفواتير",
      createInvoice: "إنشاء فاتورة",
      searchPlaceholder: "بحث برقم الفاتورة أو اسم العميل...",
      filterStatus: "تصفية حسب الحالة",
      filterClient: "تصفية حسب العميل",
      allStatuses: "كل الحالات",
      allClients: "كل العملاء",
      invoiceNumber: "رقم الفاتورة",
      client: "العميل",
      amount: "المبلغ",
      status: "الحالة",
      issueDate: "تاريخ الإصدار",
      dueDate: "تاريخ الاستحقاق",
      actions: "إجراءات",
      edit: "تعديل",
      delete: "حذف",
      markPaid: "تحديد كمدفوع",
      download: "تحميل PDF",
      preview: "معاينة",
      sendInvoice: "إرسال الفاتورة",
      save: "حفظ",
      cancel: "إلغاء",
      draft: "مسودة",
      sent: "تم الإرسال",
      paid: "مدفوعة",
      overdue: "متأخرة",
      selectClient: "اختر العميل",
      currency: "العملة",
      notes: "ملاحظات",
      noInvoices: "لا توجد فواتير",
      createFirst: "أنشئ فاتورتك الأولى",
      items: "العناصر",
      description: "الوصف",
      quantity: "الكمية",
      unitPrice: "سعر الوحدة",
      total: "المجموع",
      addItem: "إضافة عنصر",
      service: "الخدمة",
      selectService: "اختر الخدمة",
      noServices: "لا توجد خدمات لهذا العميل",
      serviceMode: "نوع الفاتورة",
      linkedService: "خدمة مرتبطة",
      customService: "خدمة مخصصة",
      customServiceName: "اسم الخدمة المخصصة",
      customServiceHint: "لفوترة خدمة غير موجودة ضمن خدمات العميل الحالية.",
      serviceReference: "مرجع الخدمة",
      customInvoice: "فاتورة مخصصة",
      linkedInvoice: "مرتبطة",
      summaryTotal: "إجمالي الفواتير",
      summaryPaid: "مدفوعة",
      summaryOpen: "مفتوحة",
      summaryOverdue: "متأخرة",
      paidDate: "تاريخ الدفع",
      subtotal: "الإجمالي قبل الضريبة والخصم",
      tax: "الضريبة",
      discount: "الخصم",
      recipientEmail: "البريد الإلكتروني للمستلم",
      sendMessage: "رسالة مرافقة",
      sendMessageHint: "رسالة اختيارية تظهر داخل البريد المرسل.",
      previewTitle: "معاينة الفاتورة",
      sendTitle: "إرسال الفاتورة",
      sendDescription: "سيتم إرسال نسخة من الفاتورة إلى البريد المحدد، وسيتم تحويل حالتها إلى مرسلة إذا كانت ما تزال مسودة.",
      saving: "جاري الحفظ...",
      sending: "جاري الإرسال...",
      markPaidConfirm: "تأكيد الدفع",
      markPaidDesc: "الرجاء تأكيد تفاصيل الدفع لهذه الفاتورة. سيتم إنشاء عملية دفع للعميل تلقائياً.",
      paymentDate: "تاريخ الدفع",
      paymentMethod: "طريقة الدفع",
      methods: {
        bank_transfer: "تحويل بنكي",
        cash: "نقداً",
        credit_card: "بطاقة ائتمان",
        paypal: "باي بال",
        wise: "وايز",
        other: "أخرى"
      }
    },
    en: {
      title: "Invoices",
      createInvoice: "Create Invoice",
      searchPlaceholder: "Search by invoice # or client...",
      filterStatus: "Filter by Status",
      filterClient: "Filter by Client",
      allStatuses: "All Statuses",
      allClients: "All Clients",
      invoiceNumber: "Invoice #",
      client: "Client",
      amount: "Amount",
      status: "Status",
      issueDate: "Issue Date",
      dueDate: "Due Date",
      actions: "Actions",
      edit: "Edit",
      delete: "Delete",
      markPaid: "Mark as Paid",
      download: "Download PDF",
      preview: "Preview",
      sendInvoice: "Send Invoice",
      save: "Save",
      cancel: "Cancel",
      draft: "Draft",
      sent: "Sent",
      paid: "Paid",
      overdue: "Overdue",
      selectClient: "Select Client",
      currency: "Currency",
      notes: "Notes",
      noInvoices: "No invoices found",
      createFirst: "Create your first invoice",
      items: "Items",
      description: "Description",
      quantity: "Quantity",
      unitPrice: "Unit Price",
      total: "Total",
      addItem: "Add Item",
      service: "Service",
      selectService: "Select Service",
      noServices: "No services found for this client",
      serviceMode: "Invoice Type",
      linkedService: "Linked Service",
      customService: "Custom Service",
      customServiceName: "Custom Service Name",
      customServiceHint: "Use this for services that do not exist in the client's dashboard services.",
      serviceReference: "Service Reference",
      customInvoice: "Custom Invoice",
      linkedInvoice: "Linked",
      summaryTotal: "Total Invoices",
      summaryPaid: "Paid",
      summaryOpen: "Open",
      summaryOverdue: "Overdue",
      paidDate: "Paid Date",
      subtotal: "Subtotal",
      tax: "Tax",
      discount: "Discount",
      recipientEmail: "Recipient Email",
      sendMessage: "Message",
      sendMessageHint: "Optional message included in the email.",
      previewTitle: "Invoice Preview",
      sendTitle: "Send Invoice",
      sendDescription: "The invoice will be emailed to the selected recipient and marked as sent if it is still a draft.",
      saving: "Saving...",
      sending: "Sending...",
      markPaidConfirm: "Confirm Payment",
      markPaidDesc: "Please confirm the payment details for this invoice. A client payment will be created automatically.",
      paymentDate: "Payment Date",
      paymentMethod: "Payment Method",
      methods: {
        bank_transfer: "Bank Transfer",
        cash: "Cash",
        credit_card: "Credit Card",
        paypal: "PayPal",
        wise: "Wise",
        other: "Other"
      }
    },
  };

  const t = content[language];
  const companyName = typeof systemSettings.companyName === "string" && systemSettings.companyName.trim()
    ? systemSettings.companyName.trim()
    : "Vevoline";
  const companyAddress = typeof systemSettings.companyAddress === "string" ? systemSettings.companyAddress.trim() : "";
  const companyPhone = typeof systemSettings.companyPhone === "string" ? systemSettings.companyPhone.trim() : "";
  const companyEmail = typeof systemSettings.companyEmail === "string" ? systemSettings.companyEmail.trim() : "";

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const clientServices = Array.isArray(selectedClient?.services) ? selectedClient.services : [];
  const selectedService = clientServices.find((service) => service.id === formData.serviceId);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const overviewCurrencies = Array.from(new Set(filteredInvoices.map((invoice) => invoice.currency)));
  const overviewCurrencyLabel = overviewCurrencies.length === 1
    ? overviewCurrencies[0]
    : (language === "ar" ? "عملات متعددة" : "Multi-currency");

  const getInvoiceServiceReference = (invoice: Invoice) => {
    if (invoice.serviceId) {
      const client = clients.find((entry) => entry.id === invoice.clientId);
      const services = Array.isArray(client?.services) ? client.services : [];
      const service = services.find((entry) => entry.id === invoice.serviceId);
      if (service) {
        return language === "ar" ? service.serviceName : (service.serviceNameEn || service.serviceName);
      }
    }

    const items = parseInvoiceItems(invoice.items);
    return getPrimaryItemDescription(items) || t.customInvoice;
  };

  const getStatusBadge = (status: string) => {
    const tone = getInvoiceStatusTone(status as InvoiceStatus);
    return (
      <Badge className={tone.badge}>
        {t[status as keyof typeof t] as string}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة فواتير العملاء والمدفوعات" : "Manage client invoices and payments"}
          </p>
        </div>
        <HasPermission permission="finance:create">
          <Button onClick={handleOpenModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 me-2" />
            {t.createInvoice}
          </Button>
        </HasPermission>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="w-full min-w-0">
          <CardContent className="p-5 space-y-1">
            <div className="text-sm text-muted-foreground">{t.summaryTotal}</div>
            <div className="text-2xl font-bold">{invoiceOverview.totalCount}</div>
            <div className="text-sm text-muted-foreground break-all">
              {overviewCurrencies.length === 1
                ? `${invoiceOverview.totalAmount.toLocaleString()} ${overviewCurrencyLabel}`
                : overviewCurrencyLabel}
            </div>
          </CardContent>
        </Card>
        <Card className="w-full min-w-0">
          <CardContent className="p-5 space-y-1">
            <div className="text-sm text-muted-foreground">{t.summaryPaid}</div>
            <div className="text-2xl font-bold text-green-600">{invoiceOverview.paidCount}</div>
            <div className="text-sm text-muted-foreground break-all">
              {overviewCurrencies.length === 1
                ? `${invoiceOverview.paidAmount.toLocaleString()} ${overviewCurrencyLabel}`
                : overviewCurrencyLabel}
            </div>
          </CardContent>
        </Card>
        <Card className="w-full min-w-0">
          <CardContent className="p-5 space-y-1">
            <div className="text-sm text-muted-foreground">{t.summaryOpen}</div>
            <div className="text-2xl font-bold text-blue-600">{invoiceOverview.openCount}</div>
            <div className="text-sm text-muted-foreground break-all">
              {overviewCurrencies.length === 1
                ? `${invoiceOverview.openAmount.toLocaleString()} ${overviewCurrencyLabel}`
                : overviewCurrencyLabel}
            </div>
          </CardContent>
        </Card>
        <Card className="w-full min-w-0">
          <CardContent className="p-5 space-y-1">
            <div className="text-sm text-muted-foreground">{t.summaryOverdue}</div>
            <div className="text-2xl font-bold text-red-600">{invoiceOverview.overdueCount}</div>
            <div className="text-sm text-muted-foreground break-all">
              {overviewCurrencies.length === 1
                ? `${invoiceOverview.overdueAmount.toLocaleString()} ${overviewCurrencyLabel}`
                : overviewCurrencyLabel}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm flex-wrap w-full min-w-0">
        <div className="relative w-full sm:w-96 min-w-0">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchPlaceholder}
            className="ps-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto min-w-0">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvoiceStatus | "all")}>
            <SelectTrigger className="w-full sm:w-[180px] min-w-0">
              <SelectValue placeholder={t.filterStatus} />
            </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatuses}</SelectItem>
            <SelectItem value="draft">{t.draft}</SelectItem>
            <SelectItem value="sent">{t.sent}</SelectItem>
            <SelectItem value="paid">{t.paid}</SelectItem>
            <SelectItem value="overdue">{t.overdue}</SelectItem>
          </SelectContent>
        </Select>
      </div>
        <div className="w-full sm:w-auto min-w-0">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[220px] min-w-0">
              <SelectValue placeholder={t.filterClient} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allClients}</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="w-full min-w-0">
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.noInvoices}</h3>
              <HasPermission permission="finance:create">
                <Button variant="outline" onClick={handleOpenModal} className="w-full sm:w-auto">
                  {t.createFirst}
                </Button>
              </HasPermission>
            </div>
          ) : (
            <div className="w-full overflow-x-auto border rounded-xl">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.invoiceNumber}</TableHead>
                    <TableHead>{t.client}</TableHead>
                    <TableHead>{t.serviceReference}</TableHead>
                    <TableHead>{t.amount}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.issueDate}</TableHead>
                    <TableHead>{t.dueDate}</TableHead>
                    <TableHead>{t.paidDate}</TableHead>
                    <TableHead className="text-end">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell className="min-w-[220px]">
                        <div className="flex flex-col gap-1">
                          <span className="break-words">{getInvoiceServiceReference(invoice)}</span>
                          <Badge variant="outline" className="w-fit">
                            {invoice.serviceId ? t.linkedInvoice : t.customInvoice}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.amount.toLocaleString()} {invoice.currency}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.issueDate), "dd MMM yyyy", { locale: language === "ar" ? ar : enUS })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.dueDate), "dd MMM yyyy", { locale: language === "ar" ? ar : enUS })}
                      </TableCell>
                      <TableCell>
                        {invoice.paidDate
                          ? format(new Date(invoice.paidDate), "dd MMM yyyy", { locale: language === "ar" ? ar : enUS })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {invoice.status !== "paid" && (
                            <HasPermission permission="finance:edit">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkPaidClick(invoice)}
                                title={t.markPaid}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                            </HasPermission>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openPreview(invoice)}>
                                <Eye className="h-4 w-4 me-2" />
                                {t.preview}
                              </DropdownMenuItem>
                              <HasPermission permission="finance:edit">
                                <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                  <Pencil className="h-4 w-4 me-2" />
                                  {t.edit}
                                </DropdownMenuItem>
                              </HasPermission>
                              <HasPermission permission="invoices:send">
                                <DropdownMenuItem onClick={() => openSendInvoice(invoice)}>
                                  <SendHorizontal className="h-4 w-4 me-2" />
                                  {t.sendInvoice}
                                </DropdownMenuItem>
                              </HasPermission>
                              <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                                <Download className="h-4 w-4 me-2" />
                                {t.download}
                              </DropdownMenuItem>
                              <HasPermission permission="finance:delete">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => deleteMutation.mutate(invoice.id)}
                                >
                                  <Trash2 className="h-4 w-4 me-2" />
                                  {t.delete}
                                </DropdownMenuItem>
                              </HasPermission>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? t.edit : t.createInvoice}</DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? "أدخل تفاصيل الفاتورة أدناه" 
                : "Enter invoice details below"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.invoiceNumber}</Label>
                <Input 
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.client}</Label>
                <Select 
                  value={formData.clientId} 
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder={t.selectClient} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{t.serviceMode}</Label>
                <Select value={serviceMode} onValueChange={(value) => handleServiceModeChange(value as InvoiceServiceMode)}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linked">{t.linkedService}</SelectItem>
                    <SelectItem value="custom">{t.customService}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {serviceMode === "linked" ? (
                <div className="space-y-2 col-span-2">
                  <Label>{t.service}</Label>
                  <Select
                    value={formData.serviceId}
                    onValueChange={handleServiceChange}
                    disabled={!formData.clientId}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder={t.selectService} />
                    </SelectTrigger>
                    <SelectContent>
                      {clientServices.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {t.noServices}
                        </div>
                      ) : (
                        clientServices.map((service: ServiceItem) => (
                          <SelectItem key={service.id} value={service.id}>
                            {language === 'ar' ? service.serviceName : (service.serviceNameEn || service.serviceName)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 col-span-2">
                  <Label>{t.customServiceName}</Label>
                  <Input
                    value={customServiceName}
                    onChange={(e) => handleCustomServiceNameChange(e.target.value)}
                    placeholder={t.customServiceName}
                  />
                  <p className="text-xs text-muted-foreground">{t.customServiceHint}</p>
                </div>
              )}
            </div>

            {serviceMode === "linked" && formData.serviceId && (
              <div className="rounded-xl border bg-muted/30 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{t.serviceReference}</div>
                  <div className="font-medium break-words">
                    {selectedService
                      ? (language === "ar"
                        ? selectedService.serviceName
                        : (selectedService.serviceNameEn || selectedService.serviceName))
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.amount}</div>
                  <div className="font-medium break-all">
                    {Number(selectedService?.price || 0).toLocaleString()} {selectedService?.currency || formData.currency}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.status}</div>
                  <div className="font-medium">
                    {selectedService?.status || "-"}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>{t.items}</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 me-2" />
                  {t.addItem}
                </Button>
              </div>
              
              <div className="space-y-4">
                {getStandardItems(formData.items).length === 0 && (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground text-center">
                    {language === "ar"
                      ? "أضف بنود الفاتورة يدويًا، أو اختر خدمة مرتبطة ليتم تجهيز أول بند تلقائيًا."
                      : "Add invoice items manually, or choose a linked service to prefill the first line item."}
                  </div>
                )}
                {getStandardItems(formData.items).map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end border p-4 rounded-lg bg-card">
                    <div className="col-span-12 sm:col-span-5 space-y-2">
                      <Label>{t.description}</Label>
                      <Input 
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder={t.description}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-2">
                      <Label>{t.quantity}</Label>
                      <Input 
                        type="number" 
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-3 space-y-2">
                      <Label>{t.unitPrice}</Label>
                      <Input 
                        type="number" 
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2">
                      <div className="text-sm font-medium mb-3">
                        {(item.quantity * item.unitPrice).toLocaleString()}
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive mb-1"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.tax}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.discount}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center gap-1">
                  <div className="text-sm text-muted-foreground">
                    {t.subtotal}: {getInvoiceTotals(formData.items).subtotal.toLocaleString()} {formData.currency}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t.tax}: {getInvoiceTotals(formData.items).tax.toLocaleString()} {formData.currency}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t.discount}: {getInvoiceTotals(formData.items).discount.toLocaleString()} {formData.currency}
                  </div>
                  <div className="text-lg font-bold">
                    {t.total}: {getInvoiceTotals(formData.items).total.toLocaleString()} {formData.currency}
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>{t.currency}</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(val) => setFormData({...formData, currency: val as Currency})}
                  >
                    <SelectTrigger className="w-full sm:w-[100px] min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.issueDate}</Label>
                <Input 
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.dueDate}</Label>
                <Input 
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.status}</Label>
              <Select 
                value={formData.status} 
                  onValueChange={(val: InvoiceStatus) => setFormData({...formData, status: val})}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t.draft}</SelectItem>
                  <SelectItem value="sent">{t.sent}</SelectItem>
                  <SelectItem value="paid">{t.paid}</SelectItem>
                  <SelectItem value="overdue">{t.overdue}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.notes}</Label>
              <Input 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 flex-wrap w-full">
            <Button variant="outline" onClick={() => openPreview()} className="w-full sm:w-auto">
              <Eye className="h-4 w-4 me-2" />
              {t.preview}
            </Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              {t.cancel}
            </Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? t.saving : t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.previewTitle}</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="relative overflow-hidden rounded-[28px] border bg-background p-6 space-y-6">
              {previewInvoice.status === "paid" && (
                <div
                  className="absolute top-8 left-6 rotate-[-12deg] rounded-2xl border-2 px-4 py-2 text-lg font-extrabold tracking-widest"
                  style={{
                    borderColor: getInvoiceStatusTone(previewInvoice.status).stampText,
                    color: getInvoiceStatusTone(previewInvoice.status).stampText,
                    background: getInvoiceStatusTone(previewInvoice.status).stamp,
                  }}
                >
                  {language === "ar" ? "مدفوعة" : "PAID"}
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(59,130,246,0.06),transparent_45%,rgba(14,165,233,0.04))]" />
              <div className="relative flex flex-col sm:flex-row justify-between gap-4 border-b pb-4">
                <div className="space-y-2">
                  <img src={logoPath} alt={`${companyName} Logo`} className="h-10 w-auto" />
                  <div className="font-semibold text-lg">{companyName}</div>
                  <div className="text-sm text-muted-foreground">{companyAddress || "Digital Marketing Agency"}</div>
                  {companyEmail && <div className="text-sm text-muted-foreground break-all">{companyEmail}</div>}
                  {companyPhone && <div className="text-sm text-muted-foreground">{companyPhone}</div>}
                </div>
                <div className="space-y-1 text-sm">
                  {getStatusBadge(previewInvoice.status)}
                  <div className="font-semibold text-lg">#{previewInvoice.invoiceNumber}</div>
                  <div>{t.issueDate}: {previewInvoice.issueDate}</div>
                  <div>{t.dueDate}: {previewInvoice.dueDate}</div>
                  {previewInvoice.paidDate && <div>{t.paidDate}: {previewInvoice.paidDate}</div>}
                </div>
              </div>

              <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 rounded-2xl border bg-muted/30 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.client}</div>
                  <div className="font-semibold">{previewInvoice.clientName || "-"}</div>
                  {previewInvoice.clientCompany && <div className="text-sm">{previewInvoice.clientCompany}</div>}
                  {previewInvoice.clientEmail && <div className="text-sm break-all">{previewInvoice.clientEmail}</div>}
                  {previewInvoice.clientPhone && <div className="text-sm">{previewInvoice.clientPhone}</div>}
                </div>
                <div className="space-y-1 rounded-2xl border bg-muted/30 p-4 sm:text-end">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.serviceReference}</div>
                  <div className="font-semibold">{previewInvoice.serviceReference || "-"}</div>
                  <div className="text-sm text-muted-foreground">{t.currency}: {previewInvoice.currency}</div>
                </div>
              </div>

              <div className="relative rounded-2xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.description}</TableHead>
                      <TableHead>{t.quantity}</TableHead>
                      <TableHead>{t.unitPrice}</TableHead>
                      <TableHead>{t.total}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewInvoice.items.map((item, index) => (
                      <TableRow key={`${item.description}-${index}`}>
                        <TableCell>
                          <div>{item.description}</div>
                          {item.kind && item.kind !== "standard" && (
                            <div className="text-xs text-muted-foreground">{item.kind}</div>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unitPrice.toLocaleString()} {previewInvoice.currency}</TableCell>
                        <TableCell>{(item.quantity * item.unitPrice).toLocaleString()} {previewInvoice.currency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="relative ms-auto w-full sm:w-[340px] space-y-2 rounded-2xl border bg-background p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>{t.subtotal}</span>
                  <span>{getInvoiceTotals(previewInvoice.items).subtotal.toLocaleString()} {previewInvoice.currency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t.tax}</span>
                  <span>{getInvoiceTotals(previewInvoice.items).tax.toLocaleString()} {previewInvoice.currency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t.discount}</span>
                  <span>{getInvoiceTotals(previewInvoice.items).discount.toLocaleString()} {previewInvoice.currency}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold border-t pt-2">
                  <span>{t.total}</span>
                  <span>{getInvoiceTotals(previewInvoice.items).total.toLocaleString()} {previewInvoice.currency}</span>
                </div>
              </div>

              {(previewInvoice.notes || systemSettings.invoiceFooter) && (
                <div className="relative space-y-2 border-t pt-4 text-sm text-muted-foreground whitespace-pre-wrap">
                  {previewInvoice.notes && <div>{previewInvoice.notes}</div>}
                  {systemSettings.invoiceFooter && <div>{systemSettings.invoiceFooter}</div>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t.sendTitle}</DialogTitle>
            <DialogDescription>{t.sendDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.recipientEmail}</Label>
              <Input
                type="email"
                value={sendInvoiceData.email}
                onChange={(e) => setSendInvoiceData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.sendMessage}</Label>
              <Input
                value={sendInvoiceData.message}
                onChange={(e) => setSendInvoiceData((prev) => ({ ...prev, message: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t.sendMessageHint}</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIsSendModalOpen(false)} className="w-full sm:w-auto">
              {t.cancel}
            </Button>
            <Button onClick={confirmSendInvoice} className="w-full sm:w-auto" disabled={sendInvoiceMutation.isPending}>
              {sendInvoiceMutation.isPending ? t.sending : t.sendInvoice}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMarkPaidModalOpen} onOpenChange={setIsMarkPaidModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.markPaidConfirm}</DialogTitle>
            <DialogDescription>
              {t.markPaidDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.paymentDate}</Label>
              <Input
                type="date"
                value={markPaidData.date}
                onChange={(e) => setMarkPaidData({ ...markPaidData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.paymentMethod}</Label>
              <Select
                value={markPaidData.method}
                onValueChange={(val) => setMarkPaidData({ ...markPaidData, method: val as InvoicePaymentMethod })}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(t.methods).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIsMarkPaidModalOpen(false)} className="w-full sm:w-auto">
              {t.cancel}
            </Button>
            <Button onClick={confirmMarkPaid} className="w-full sm:w-auto">
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
