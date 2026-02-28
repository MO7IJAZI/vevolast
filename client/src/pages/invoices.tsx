import { useState, useMemo } from "react";
import { 
  Plus, 
  FileText, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download
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
import { useData, type Invoice, type Currency, type ServiceItem } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import logoPath from "@assets/logo.png";
import { ar, enUS } from "date-fns/locale";
import { useEffect } from "react";
import { safeJsonParse } from "@/utils/safeJson";

export default function InvoicesPage() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { clients } = useData();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    invoiceNumber: "",
    clientId: "",
    serviceId: "",
    amount: "0",
    currency: "USD" as Currency,
    status: "draft" as "draft" | "sent" | "paid" | "overdue",
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    notes: "",
    items: [] as { description: string; quantity: number; unitPrice: number }[]
  });

  // Calculate total amount when items change
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    setFormData(prev => ({ ...prev, amount: total.toString() }));
  }, [formData.items]);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, unitPrice: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  // Fetch invoices
  const canFinance = isAdmin || useAuth().hasResourcePermission("finance");
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: canFinance
  });

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      // Invalidate finance queries as invoice creation might affect totals if paid immediately
      queryClient.invalidateQueries({ queryKey: ["/api/client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-summary"] });
      
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      // Invalidate finance queries as updating invoice (e.g. marking as paid) affects totals
      queryClient.invalidateQueries({ queryKey: ["/api/client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-summary"] });
      
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
      // Invalidate finance queries just in case (though currently delete doesn't cascade to payments)
      queryClient.invalidateQueries({ queryKey: ["/api/finance-summary"] });
      
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم حذف الفاتورة بنجاح" : "Invoice deleted successfully",
      });
    }
  });

  if (!canFinance) {
    setLocation("/");
    return null;
  }

  const resetForm = () => {
    setEditingInvoice(null);
    setFormData({
      invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
      clientId: "",
      serviceId: "",
      amount: "0",
      currency: "USD",
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
    setEditingInvoice(invoice);
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
      items: typeof invoice.items === 'string' 
        ? safeJsonParse(invoice.items, []) 
        : (Array.isArray(invoice.items) ? invoice.items : [])
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    const client = clients.find(c => c.id === formData.clientId);
    const payload = {
      ...formData,
      clientName: client?.name || "Unknown Client",
      amount: Number(formData.amount),
    };

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .company-info h1 { margin: 0; color: #2563eb; }
          .invoice-details { text-align: ${language === 'ar' ? 'left' : 'right'}; }
          .client-info { margin-bottom: 40px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f8fafc; padding: 12px; text-align: ${language === 'ar' ? 'right' : 'left'}; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .total-section { display: flex; justify-content: flex-end; }
          .total-box { width: 300px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
          @media print {
            body { padding: 0; }
            @page { margin: 2cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <img src="${logoPath}" alt="Vevoline Logo" style="height:48px; width:auto;" />
            <p>Digital Marketing Agency</p>
          </div>
          <div class="invoice-details">
            <h2>${language === 'ar' ? 'فاتورة' : 'INVOICE'}</h2>
            <p># ${invoice.invoiceNumber}</p>
            <p>${language === 'ar' ? 'التاريخ' : 'Date'}: ${format(new Date(invoice.issueDate), "dd MMM yyyy")}</p>
            <p>${language === 'ar' ? 'الاستحقاق' : 'Due'}: ${format(new Date(invoice.dueDate), "dd MMM yyyy")}</p>
          </div>
        </div>

        <div class="client-info">
          <h3>${language === 'ar' ? 'فوترة إلى' : 'Bill To'}:</h3>
          <p><strong>${client?.name || invoice.clientName}</strong></p>
          <p>${client?.company || ''}</p>
          <p>${client?.email || ''}</p>
          <p>${client?.phone || ''}</p>
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
            ${(Array.isArray(invoice.items) ? invoice.items : []).map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${Number(item.unitPrice).toLocaleString()} ${invoice.currency}</td>
                <td>${(item.quantity * item.unitPrice).toLocaleString()} ${invoice.currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-box">
            <div class="row total-row">
              <span>${language === 'ar' ? 'المجموع الكلي' : 'Total Amount'}</span>
              <span>${Number(invoice.amount).toLocaleString()} ${invoice.currency}</span>
            </div>
          </div>
        </div>
        
        <script>
          window.onload = () => { window.print(); }
        </script>
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
    method: "bank_transfer"
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
      allStatuses: "كل الحالات",
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
      allStatuses: "All Statuses",
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

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const clientServices = selectedClient?.services || [];

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {t[status as keyof typeof t] as string}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة فواتير العملاء والمدفوعات" : "Manage client invoices and payments"}
          </p>
        </div>
        <HasPermission permission="finance:create">
          <Button onClick={handleOpenModal}>
            <Plus className="h-4 w-4 me-2" />
            {t.createInvoice}
          </Button>
        </HasPermission>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            placeholder={t.searchPlaceholder}
            className="pl-10 rtl:pl-3 rtl:pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
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

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.noInvoices}</h3>
              <HasPermission permission="finance:create">
                <Button variant="outline" onClick={handleOpenModal}>
                  {t.createFirst}
                </Button>
              </HasPermission>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.invoiceNumber}</TableHead>
                  <TableHead>{t.client}</TableHead>
                  <TableHead>{t.amount}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.issueDate}</TableHead>
                  <TableHead>{t.dueDate}</TableHead>
                  <TableHead className="text-end">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
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
                            <HasPermission permission="finance:edit">
                              <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                <Pencil className="h-4 w-4 me-2" />
                                {t.edit}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? t.edit : t.createInvoice}</DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? "أدخل تفاصيل الفاتورة أدناه" 
                : "Enter invoice details below"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
                  onValueChange={(val) => setFormData({...formData, clientId: val, serviceId: ""})}
                >
                  <SelectTrigger>
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
                <Label>{t.service}</Label>
                <Select 
                  value={formData.serviceId} 
                  onValueChange={(val) => setFormData({...formData, serviceId: val})}
                  disabled={!formData.clientId}
                >
                  <SelectTrigger>
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
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t.items}</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 me-2" />
                  {t.addItem}
                </Button>
              </div>
              
              <div className="space-y-4">
                {formData.items.map((item, index) => (
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

              <div className="flex justify-end items-center gap-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Label>{t.currency}</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(val) => setFormData({...formData, currency: val as Currency})}
                  >
                    <SelectTrigger className="w-[100px]">
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
                <div className="text-lg font-bold">
                  {t.total}: {Number(formData.amount).toLocaleString()} {formData.currency}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                onValueChange={(val) => setFormData({...formData, status: val as any})}
              >
                <SelectTrigger>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSubmit}>
              {t.save}
            </Button>
          </div>
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
                onValueChange={(val) => setMarkPaidData({ ...markPaidData, method: val })}
              >
                <SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMarkPaidModalOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={confirmMarkPaid}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
