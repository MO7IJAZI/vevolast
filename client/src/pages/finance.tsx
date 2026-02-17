import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DollarSign, TrendingUp, TrendingDown, Wallet, Users, FileText, 
  Plus, RefreshCw, Building, Zap, Megaphone, Wrench, RotateCcw, MoreHorizontal,
  Calendar, ArrowUpRight, ArrowDownRight, CircleDollarSign, ChevronLeft, ChevronRight,
  ChevronDown, Package, CheckCircle2, Circle, Pencil, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Transaction, ClientPayment, PayrollPayment, EmployeeSalary } from "@shared/schema";
import { useCurrency, type Currency, currencies as contextCurrencies } from "@/contexts/CurrencyContext";

// Use constants from CurrencyContext where possible
const CURRENCIES = Object.keys(contextCurrencies) as Currency[];

// Currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = Object.entries(contextCurrencies).reduce((acc, [code, info]) => {
  acc[code] = info.symbol;
  return acc;
}, {} as Record<string, string>);

// Expense categories
const EXPENSE_CATEGORIES = [
  { value: "salaries", labelAr: "الرواتب", labelEn: "Salaries", icon: Wallet },
  { value: "ads", labelAr: "الإعلانات", labelEn: "Advertising", icon: Megaphone },
  { value: "tools", labelAr: "الأدوات والبرمجيات", labelEn: "Tools & Software", icon: Wrench },
  { value: "subscriptions", labelAr: "الاشتراكات", labelEn: "Subscriptions", icon: RefreshCw },
  { value: "refunds", labelAr: "المبالغ المستردة", labelEn: "Refunds", icon: RotateCcw },
  { value: "rent", labelAr: "الإيجار", labelEn: "Rent", icon: Building },
  { value: "utilities", labelAr: "المرافق", labelEn: "Utilities", icon: Zap },
  { value: "other", labelAr: "أخرى", labelEn: "Other", icon: MoreHorizontal },
];

// Month names
const MONTH_NAMES = {
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

// Deliverable labels (bilingual)
const DELIVERABLE_LABELS: Record<string, { ar: string; en: string }> = {
  posts: { ar: "منشورات", en: "Posts" },
  reels: { ar: "ريلز", en: "Reels" },
  stories: { ar: "ستوريز", en: "Stories" },
  monthlyReport: { ar: "تقرير شهري", en: "Monthly Report" },
  logo: { ar: "شعار", en: "Logo" },
  websitePages: { ar: "صفحات الموقع", en: "Website Pages" },
  concepts: { ar: "تصاميم مبدئية", en: "Concepts" },
  revisions: { ar: "تعديلات", en: "Revisions" },
  finalFiles: { ar: "ملفات نهائية", en: "Final Files" },
  requirements: { ar: "المتطلبات", en: "Requirements" },
  design: { ar: "التصميم", en: "Design" },
  development: { ar: "التطوير", en: "Development" },
  content: { ar: "المحتوى", en: "Content" },
  testing: { ar: "الاختبار", en: "Testing" },
  launch: { ar: "الإطلاق", en: "Launch" },
};

import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function FinancePage() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  if (!isAdmin) {
    setLocation("/");
    return null;
  }
  const { language } = useLanguage();
  const { clients, employees } = useData();
  const { convertAmount, formatCurrency, currency: displayCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Selected month (YYYY-MM format)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  
  // Parse selected month
  const [selectedYear, selectedMonthNum] = selectedMonth.split("-").map(Number);
  
  // Modal states
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedPayrollEmployee, setSelectedPayrollEmployee] = useState<string | null>(null);
  const [paymentModalEmployee, setPaymentModalEmployee] = useState<string | null>(null);
  const [clientDetailsSheet, setClientDetailsSheet] = useState<string | null>(null);
  const [transactionEditModalOpen, setTransactionEditModalOpen] = useState(false);
  const [editingClientPayment, setEditingClientPayment] = useState<ClientPayment | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingPayrollPayment, setEditingPayrollPayment] = useState<PayrollPayment | null>(null);
  
  // Form states
  const [incomeForm, setIncomeForm] = useState({
    clientId: "",
    serviceId: "",
    amount: "",
    currency: "USD" as Currency,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  
  const [expenseForm, setExpenseForm] = useState({
    category: "",
    amount: "",
    currency: "USD" as Currency,
    description: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    employeeId: "",
    clientId: "",
    serviceId: "",
  });
  
  const [payrollForm, setPayrollForm] = useState({
    amount: "",
    currency: "TRY" as Currency,
    notes: "",
  });

  const [transactionEditForm, setTransactionEditForm] = useState({
    id: "",
    type: "income" as "income" | "expense",
    category: "",
    amount: "",
    currency: "USD" as Currency,
    description: "",
    date: new Date().toISOString().split("T")[0],
    clientId: "",
    serviceId: "",
  });

  // Translations
  const t = useMemo(() => ({
    ar: {
      title: "المالية",
      displayCurrency: "عملة العرض",
      overview: "نظرة عامة",
      revenues: "الإيرادات",
      expenses: "المصروفات",
      payroll: "الرواتب",
      clientFinance: "مالية العملاء",
      ledger: "سجل المعاملات",
      totalIncome: "إجمالي الإيرادات",
      totalExpenses: "إجمالي المصروفات",
      netProfit: "صافي الربح",
      overdueAmount: "المبالغ المتأخرة",
      payrollRemaining: "الرواتب المتبقية",
      addIncome: "إضافة إيراد",
      addExpense: "إضافة مصروف",
      editIncome: "تعديل إيراد",
      editExpense: "تعديل مصروف",
      editPayroll: "تعديل دفعة راتب",
      editTransaction: "تعديل معاملة",
      recordPayment: "تسجيل دفعة",
      client: "العميل",
      service: "الخدمة",
      amount: "المبلغ",
      originalAmount: "المبلغ الأصلي",
      convertedAmount: "المبلغ المحول",
      category: "الفئة",
      description: "الوصف",
      date: "التاريخ",
      month: "الشهر",
      type: "النوع",
      income: "إيراد",
      expense: "مصروف",
      save: "حفظ",
      cancel: "إلغاء",
      employee: "الموظف",
      selectEmployee: "اختر موظف",
      payType: "نوع الدفع",
      monthly: "شهري",
      perProject: "حسب المشروع",
      salary: "الراتب",
      rate: "المعدل",
      paidThisMonth: "المدفوع هذا الشهر",
      remaining: "المتبقي",
      totalDue: "إجمالي المستحق",
      expectedMonthly: "المتوقع شهرياً",
      paidMonthly: "المدفوع شهرياً",
      due: "المستحق",
      overdue: "متأخر",
      paid: "مدفوع",
      noTransactions: "لا توجد معاملات",
      noEmployees: "لا يوجد موظفين",
      noClients: "لا يوجد عملاء",
      linkedEntity: "الجهة المرتبطة",
      linkedClient: "العميل المرتبط",
      linkedService: "الخدمة المرتبطة",
      selectService: "اختر خدمة",
      status: "الحالة",
      addPayment: "إضافة دفعة",
      serviceDetails: "تفاصيل الخدمات",
      packageProgress: "تقدم الباقة",
      done: "منجز",
      remainingDeliverables: "المتبقي",
      services: "الخدمات",
      noServices: "لا توجد خدمات",
      allEmployees: "جميع الموظفين",
      actions: "الإجراءات",
      edit: "تعديل",
      delete: "حذف",
      confirmDelete: "هل أنت متأكد من الحذف؟",
      payments: "المدفوعات",
    },
    en: {
      title: "Finance",
      displayCurrency: "Display Currency",
      overview: "Overview",
      revenues: "Revenues",
      expenses: "Expenses",
      payroll: "Payroll",
      clientFinance: "Client Finance",
      ledger: "Transactions Ledger",
      totalIncome: "Total Income",
      totalExpenses: "Total Expenses",
      netProfit: "Net Profit",
      overdueAmount: "Overdue Amount",
      payrollRemaining: "Payroll Remaining",
      addIncome: "Add Income",
      addExpense: "Add Expense",
      editIncome: "Edit Income",
      editExpense: "Edit Expense",
      editPayroll: "Edit Payroll Payment",
      editTransaction: "Edit Transaction",
      recordPayment: "Record Payment",
      client: "Client",
      service: "Service",
      amount: "Amount",
      originalAmount: "Original Amount",
      convertedAmount: "Converted Amount",
      category: "Category",
      description: "Description",
      date: "Date",
      month: "Month",
      type: "Type",
      income: "Income",
      expense: "Expense",
      save: "Save",
      cancel: "Cancel",
      employee: "Employee",
      selectEmployee: "Select Employee",
      payType: "Pay Type",
      monthly: "Monthly",
      perProject: "Per Project",
      salary: "Salary",
      rate: "Rate",
      paidThisMonth: "Paid This Month",
      remaining: "Remaining",
      totalDue: "Total Due",
      expectedMonthly: "Expected Monthly",
      paidMonthly: "Paid This Month",
      due: "Due",
      overdue: "Overdue",
      paid: "Paid",
      noTransactions: "No transactions",
      noEmployees: "No employees",
      noClients: "No clients",
      linkedEntity: "Linked Entity",
      linkedClient: "Linked Client",
      linkedService: "Linked Service",
      selectService: "Select Service",
      status: "Status",
      addPayment: "Add Payment",
      serviceDetails: "Service Details",
      packageProgress: "Package Progress",
      done: "Done",
      remainingDeliverables: "Remaining",
      services: "Services",
      noServices: "No services",
      allEmployees: "All Employees",
      actions: "Actions",
      edit: "Edit",
      delete: "Delete",
      confirmDelete: "Are you sure you want to delete this item?",
      payments: "Payments",
    },
  })[language], [language]);

  // Navigate months
  const goToPreviousMonth = () => {
    const date = new Date(selectedYear, selectedMonthNum - 2, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${year}-${month}`);
  };
  
  const goToNextMonth = () => {
    const date = new Date(selectedYear, selectedMonthNum, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${year}-${month}`);
  };
  
  // Format month display
  const formatMonthDisplay = () => {
    const monthName = MONTH_NAMES[language][selectedMonthNum - 1];
    return `${monthName} ${selectedYear}`;
  };

  // Fetch transactions for selected month (with proper query params)
  const { data: transactionsDataRaw = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", { month: selectedMonthNum, year: selectedYear }],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?month=${selectedMonthNum}&year=${selectedYear}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });
  const transactionsData = Array.isArray(transactionsDataRaw) ? transactionsDataRaw : [];

  // Fetch client payments for selected month (with proper query params)
  const { data: clientPaymentsDataRaw = [] } = useQuery<ClientPayment[]>({
    queryKey: ["/api/client-payments", { month: selectedMonthNum, year: selectedYear }],
    queryFn: async () => {
      const res = await fetch(`/api/client-payments?month=${selectedMonthNum}&year=${selectedYear}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch client payments");
      return res.json();
    },
  });
  const clientPaymentsData = Array.isArray(clientPaymentsDataRaw) ? clientPaymentsDataRaw : [];

  // Fetch payroll payments for selected month (with proper query params)
  const { data: payrollPaymentsDataRaw = [] } = useQuery<PayrollPayment[]>({
    queryKey: ["/api/payroll-payments", { month: selectedMonthNum, year: selectedYear }],
    queryFn: async () => {
      const res = await fetch(`/api/payroll-payments?month=${selectedMonthNum}&year=${selectedYear}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payroll payments");
      return res.json();
    },
  });
  const payrollPaymentsData = Array.isArray(payrollPaymentsDataRaw) ? payrollPaymentsDataRaw : [];

  // Fetch employee salaries
  const { data: employeeSalariesDataRaw = [] } = useQuery<EmployeeSalary[]>({
    queryKey: ["/api/employee-salaries"],
  });
  const employeeSalariesData = Array.isArray(employeeSalariesDataRaw) ? employeeSalariesDataRaw : [];

  const resetIncomeForm = () => {
    setIncomeForm({ clientId: "", serviceId: "", amount: "", currency: "USD", date: new Date().toISOString().split("T")[0], notes: "" });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category: "",
      amount: "",
      currency: "USD",
      description: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      employeeId: "",
      clientId: "",
      serviceId: "",
    });
  };

  const resetPayrollForm = () => {
    setPayrollForm({ amount: "", currency: "TRY", notes: "" });
  };

  const resetTransactionEditForm = () => {
    setTransactionEditForm({
      id: "",
      type: "income",
      category: "",
      amount: "",
      currency: "USD",
      description: "",
      date: new Date().toISOString().split("T")[0],
      clientId: "",
      serviceId: "",
    });
  };

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/transactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-payments"] });
      setExpenseModalOpen(false);
      resetExpenseForm();
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم تسجيل المصروف بنجاح" : "Expense recorded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل تسجيل المصروف: ${error.message}` : `Failed to record expense: ${error.message}`,
      });
    }
  });

  // Create client payment mutation
  const createClientPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/client-payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIncomeModalOpen(false);
      resetIncomeForm();
      setEditingClientPayment(null);
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم تسجيل الدفعة بنجاح" : "Payment recorded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل تسجيل الدفعة: ${error.message}` : `Failed to record payment: ${error.message}`,
      });
    }
  });

  // Create payroll payment mutation
  const createPayrollPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/payroll-payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setPaymentModalEmployee(null);
      resetPayrollForm();
      setEditingPayrollPayment(null);
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم تسجيل دفعة الراتب بنجاح" : "Payroll payment recorded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل تسجيل دفعة الراتب: ${error.message}` : `Failed to record payroll payment: ${error.message}`,
      });
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (data: { id: string; payload: any }) => {
      return apiRequest("PATCH", `/api/transactions/${data.id}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-payments"] });
      setExpenseModalOpen(false);
      setTransactionEditModalOpen(false);
      setEditingTransaction(null);
      resetExpenseForm();
      resetTransactionEditForm();
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم تحديث المعاملة بنجاح" : "Transaction updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل تحديث المعاملة: ${error.message}` : `Failed to update transaction: ${error.message}`,
      });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-payments"] });
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم حذف المعاملة بنجاح" : "Transaction deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل حذف المعاملة: ${error.message}` : `Failed to delete transaction: ${error.message}`,
      });
    }
  });

  const updateClientPaymentMutation = useMutation({
    mutationFn: async (data: { id: string; payload: any }) => {
      return apiRequest("PATCH", `/api/client-payments/${data.id}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIncomeModalOpen(false);
      setEditingClientPayment(null);
      resetIncomeForm();
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم تحديث الدفعة بنجاح" : "Payment updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل تحديث الدفعة: ${error.message}` : `Failed to update payment: ${error.message}`,
      });
    }
  });

  const deleteClientPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/client-payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم حذف الدفعة بنجاح" : "Payment deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل حذف الدفعة: ${error.message}` : `Failed to delete payment: ${error.message}`,
      });
    }
  });

  const updatePayrollPaymentMutation = useMutation({
    mutationFn: async (data: { id: string; payload: any }) => {
      return apiRequest("PATCH", `/api/payroll-payments/${data.id}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setPaymentModalEmployee(null);
      setEditingPayrollPayment(null);
      resetPayrollForm();
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم تحديث دفعة الراتب بنجاح" : "Payroll payment updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل تحديث دفعة الراتب: ${error.message}` : `Failed to update payroll payment: ${error.message}`,
      });
    }
  });

  const deletePayrollPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/payroll-payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم حذف دفعة الراتب بنجاح" : "Payroll payment deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? `فشل حذف دفعة الراتب: ${error.message}` : `Failed to delete payroll payment: ${error.message}`,
      });
    }
  });

  const getMonthYearFromDate = (date: string) => {
    const [year, month] = date.split("-").map(Number);
    return { year, month };
  };

  // Handle income submission
  const handleIncomeSubmit = () => {
    if (!incomeForm.clientId) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "تنبيه" : "Warning",
        description: language === "ar" ? "يرجى اختيار العميل" : "Please select a client",
      });
      return;
    }
    if (!incomeForm.amount) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "تنبيه" : "Warning",
        description: language === "ar" ? "يرجى إدخال المبلغ" : "Please enter the amount",
      });
      return;
    }

    const { year, month } = getMonthYearFromDate(incomeForm.date);
    const payload = {
      clientId: incomeForm.clientId,
      serviceId: incomeForm.serviceId || null,
      amount: parseInt(incomeForm.amount),
      currency: incomeForm.currency,
      paymentDate: incomeForm.date,
      month,
      year,
      notes: incomeForm.notes || null,
    };

    if (editingClientPayment) {
      updateClientPaymentMutation.mutate({ id: editingClientPayment.id, payload });
      return;
    }

    createClientPaymentMutation.mutate(payload);
  };

  // Handle expense submission
  const handleExpenseSubmit = () => {
    if (!expenseForm.category) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "تنبيه" : "Warning",
        description: language === "ar" ? "يرجى اختيار القسم" : "Please select a category",
      });
      return;
    }
    if (!expenseForm.amount) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "تنبيه" : "Warning",
        description: language === "ar" ? "يرجى إدخال المبلغ" : "Please enter the amount",
      });
      return;
    }

    const { year, month } = getMonthYearFromDate(expenseForm.date);
    const payload = {
      type: "expense",
      category: expenseForm.category,
      amount: parseInt(expenseForm.amount),
      currency: expenseForm.currency,
      description: expenseForm.description,
      date: expenseForm.date,
      month,
      year,
      notes: expenseForm.notes || null,
      relatedId: expenseForm.employeeId || null,
      relatedType: expenseForm.employeeId ? "salary" : null,
      clientId: expenseForm.clientId || null,
      serviceId: expenseForm.serviceId || null,
    };

    if (editingTransaction) {
      updateTransactionMutation.mutate({ id: editingTransaction.id, payload });
      return;
    }

    createTransactionMutation.mutate(payload);
  };

  // Handle payroll submission
  const handlePayrollSubmit = () => {
    if (!paymentModalEmployee) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "تنبيه" : "Warning",
        description: language === "ar" ? "يرجى اختيار الموظف" : "Please select an employee",
      });
      return;
    }
    if (!payrollForm.amount) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "تنبيه" : "Warning",
        description: language === "ar" ? "يرجى إدخال المبلغ" : "Please enter the amount",
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const payload = {
      employeeId: paymentModalEmployee,
      amount: parseInt(payrollForm.amount),
      currency: payrollForm.currency,
      paymentDate: editingPayrollPayment?.paymentDate || today,
      period: `${selectedYear}-${selectedMonthNum.toString().padStart(2, "0")}`,
      status: "paid",
      notes: payrollForm.notes || null,
    };

    if (editingPayrollPayment) {
      updatePayrollPaymentMutation.mutate({ id: editingPayrollPayment.id, payload });
      return;
    }

    createPayrollPaymentMutation.mutate(payload);
  };

  const handleTransactionEditSubmit = () => {
    if (!transactionEditForm.amount) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "تنبيه" : "Warning",
        description: language === "ar" ? "يرجى إدخال المبلغ" : "Please enter the amount",
      });
      return;
    }
    const payload = {
      category: transactionEditForm.category || "other",
      amount: parseInt(transactionEditForm.amount),
      currency: transactionEditForm.currency,
      description: transactionEditForm.description,
      date: transactionEditForm.date,
      clientId: transactionEditForm.clientId || null,
      serviceId: transactionEditForm.serviceId || null,
    };
    updateTransactionMutation.mutate({ id: transactionEditForm.id, payload });
  };

  // Get client name
  const getClientName = (clientId: string | null): string => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client?.name || clientId;
  };

  // Get employee name
  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find(e => e.id === employeeId);
    return language === "ar" ? employee?.name || employeeId : employee?.nameEn || employee?.name || employeeId;
  };

  // Get category label
  const getCategoryLabel = (category: string): string => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return language === "ar" ? cat?.labelAr || category : cat?.labelEn || category;
  };

  const getServiceName = (serviceId: string | null | undefined): string => {
    if (!serviceId) return "-";
    const service = allServices.find(s => s.id === serviceId);
    if (!service) return serviceId;
    return language === "ar" ? service.serviceName : service.serviceNameEn || service.serviceName;
  };

  const getExpenseEmployeeName = (tx: Transaction): string => {
    if (tx.category !== "salaries" && tx.relatedType !== "salary") return "-";
    const payment = payrollPaymentsData.find(p => p.id === tx.relatedId);
    if (payment) return getEmployeeName(payment.employeeId);
    if (tx.relatedId) return getEmployeeName(tx.relatedId);
    return "-";
  };

  // Backend already filters by month/year via query params, use data directly
  // Income transactions (from client payments converted to transactions OR direct income)
  const incomeTransactions = transactionsData.filter(t => t.type === "income" && t.category !== "client_payment");
  
  // Expense transactions (excluding payroll for separate handling)
  const expenseTransactions = transactionsData.filter(t => t.type === "expense");

  const allServices = useMemo(() => {
    return clients.flatMap(client => {
      return (Array.isArray(client.services) ? client.services : []).map(service => ({
        ...service,
        clientId: client.id,
        clientName: client.name,
      }));
    });
  }, [clients]);

  const isServiceInSelectedMonth = (service: any) => {
    const dates = [service.startDate, service.dueDate, service.completedDate].filter(Boolean) as string[];
    return dates.some((date) => date.startsWith(selectedMonth));
  };

  const payrollData = useMemo(() => {
    return employees.map(emp => {
      const salaryConfig = employeeSalariesData.find(s => s.employeeId === emp.id);
      const paymentsThisMonth = payrollPaymentsData.filter(p => p.employeeId === emp.id && p.period === selectedMonth);
      const payType = emp.salaryType || "monthly";
      const salaryCurrency = (emp.salaryCurrency || salaryConfig?.currency || "USD") as Currency;
      const monthlyAmount = emp.salaryAmount ?? (payType === "monthly" ? (salaryConfig?.amount || 0) : 0);
      const rateAmount = emp.rate ?? (payType === "per_project" ? (salaryConfig?.amount || 0) : 0);
      const assignedServices = allServices.filter(service => (service.serviceAssignees || []).includes(emp.id));
      const assignedServicesThisMonth = assignedServices.filter(isServiceInSelectedMonth);
      const rateUnitsCount = assignedServicesThisMonth.length;
      const expectedBase = payType === "monthly" ? monthlyAmount : rateAmount * rateUnitsCount;
      const totalPaid = paymentsThisMonth.reduce((sum, p) => {
        return sum + convertAmount(p.amount, p.currency as Currency, displayCurrency);
      }, 0);
      const expectedSalary = expectedBase
        ? convertAmount(expectedBase, salaryCurrency, displayCurrency)
        : 0;
      
      const remainingRaw = expectedSalary - totalPaid;
      const remaining = remainingRaw > 0.01 ? remainingRaw : 0;
      
      return {
        employee: emp,
        salaryConfig,
        payType,
        salaryCurrency,
        monthlyAmount,
        rateAmount,
        rateUnitsCount,
        paidThisMonth: totalPaid,
        remaining,
        expectedSalary,
        payments: paymentsThisMonth,
      };
    });
  }, [employees, employeeSalariesData, payrollPaymentsData, displayCurrency, allServices, selectedMonth, convertAmount]);

  // Get selected employee payroll data
  const selectedEmployeePayroll = useMemo(() => {
    if (!selectedPayrollEmployee) return null;
    return payrollData.find(p => p.employee.id === selectedPayrollEmployee);
  }, [selectedPayrollEmployee, payrollData]);

  // Client finance data with services
  const clientFinanceData = useMemo(() => {
    return clients.filter(c => c.status === "active").map(client => {
      const services = Array.isArray(client.services) ? client.services : [];
      const expectedMonthly = services.reduce((sum, svc) => {
        if (svc.price && svc.currency) {
          return sum + convertAmount(svc.price, svc.currency as Currency, displayCurrency);
        }
        return sum;
      }, 0);
      
      const paymentsThisMonth = clientPaymentsData.filter(p => 
        p.clientId === client.id && 
        p.year === selectedYear && 
        p.month === selectedMonthNum
      );
      const paidThisMonth = paymentsThisMonth.reduce((sum, p) => {
        return sum + convertAmount(p.amount, p.currency as Currency, displayCurrency);
      }, 0);
      
      const dueRaw = expectedMonthly - paidThisMonth;
      const due = dueRaw > 0.01 ? dueRaw : 0;
      
      return {
        client,
        services,
        expectedMonthly,
        paidThisMonth,
        due,
        isOverdue: due > 0,
        payments: paymentsThisMonth,
      };
    });
  }, [clients, clientPaymentsData, displayCurrency, convertAmount]);

  const overviewTotals = useMemo(() => {
    const totalIncome = clientPaymentsData.reduce((sum, p) => {
      return sum + convertAmount(p.amount, p.currency as Currency, displayCurrency);
    }, 0) + incomeTransactions.reduce((sum, tx) => {
      return sum + convertAmount(tx.amount, tx.currency as Currency, displayCurrency);
    }, 0);

    const totalExpenses = expenseTransactions.reduce((sum, tx) => {
      return sum + convertAmount(tx.amount, tx.currency as Currency, displayCurrency);
    }, 0);

    const overdueAmount = clientFinanceData.reduce((sum, client) => {
      return client.isOverdue ? sum + client.due : sum;
    }, 0);

    const payrollRemaining = payrollData.reduce((sum, payroll) => {
      return sum + payroll.remaining;
    }, 0);

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      overdueAmount,
      payrollRemaining,
    };
  }, [
    clientPaymentsData,
    incomeTransactions,
    expenseTransactions,
    clientFinanceData,
    payrollData,
    displayCurrency,
    convertAmount,
  ]);

  // Get client details for sheet
  const selectedClientDetails = useMemo(() => {
    if (!clientDetailsSheet) return null;
    return clientFinanceData.find(c => c.client.id === clientDetailsSheet);
  }, [clientDetailsSheet, clientFinanceData]);

  const incomeClientServices = useMemo(() => {
    const client = clients.find(c => c.id === incomeForm.clientId);
    return Array.isArray(client?.services) ? client.services : [];
  }, [clients, incomeForm.clientId]);

  const expenseClientServices = useMemo(() => {
    const client = clients.find(c => c.id === expenseForm.clientId);
    return Array.isArray(client?.services) ? client.services : [];
  }, [clients, expenseForm.clientId]);

  const transactionClientServices = useMemo(() => {
    const client = clients.find(c => c.id === transactionEditForm.clientId);
    return Array.isArray(client?.services) ? client.services : [];
  }, [clients, transactionEditForm.clientId]);

  // Calculate deliverable progress for a service
  // ServiceDeliverable: { key, label, labelEn?, target, completed, isBoolean? }
  const getDeliverableProgress = (service: any) => {
    const deliverables = service.deliverables || [];
    const items: { key: string; label: string; done: number; total: number; isBoolean: boolean }[] = [];
    
    // Handle both array format (correct) and object format (legacy fallback)
    if (Array.isArray(deliverables)) {
      deliverables.forEach((d: any) => {
        const label = language === "ar" ? (d.label || d.key) : (d.labelEn || d.label || d.key);
        items.push({
          key: d.key,
          label,
          done: d.completed || 0,
          total: d.target || (d.isBoolean ? 1 : 0),
          isBoolean: d.isBoolean || false,
        });
      });
    } else if (typeof deliverables === "object") {
      // Legacy object format fallback
      Object.entries(deliverables).forEach(([key, value]: [string, any]) => {
        if (typeof value === "object" && value !== null) {
          const label = DELIVERABLE_LABELS[key] 
            ? (language === "ar" ? DELIVERABLE_LABELS[key].ar : DELIVERABLE_LABELS[key].en)
            : key;
          
          if ("completed" in value && "target" in value) {
            items.push({ key, label, done: value.completed || 0, total: value.target || 0, isBoolean: false });
          } else if ("done" in value && "total" in value) {
            items.push({ key, label, done: value.done || 0, total: value.total || 0, isBoolean: false });
          }
        }
      });
    }
    
    return items;
  };

  // Get linked entity name for a transaction
  const getLinkedEntityName = (tx: Transaction) => {
    if (tx.relatedType === "client_payment" || tx.category === "client_payment") {
      const payment = clientPaymentsData.find(p => p.id === tx.relatedId);
      if (payment) return getClientName(payment.clientId);
      if (tx.clientId) return getClientName(tx.clientId);
      return "-";
    }
    if (tx.relatedType === "salary" || tx.category === "salaries") {
      const payment = payrollPaymentsData.find(p => p.id === tx.relatedId);
      if (payment) return getEmployeeName(payment.employeeId);
      if (tx.relatedId) return getEmployeeName(tx.relatedId);
      return "-";
    }
    if (tx.serviceId) return getServiceName(tx.serviceId);
    if (tx.clientId) return getClientName(tx.clientId);
    return "-";
  };

  const findClientPaymentForTransaction = (tx: Transaction) => {
    if (tx.relatedType === "client_payment" || tx.category === "client_payment") {
      return clientPaymentsData.find(p => p.id === tx.relatedId);
    }
    return undefined;
  };

  const findPayrollPaymentForTransaction = (tx: Transaction) => {
    if (tx.relatedType === "payroll_payment") {
      return payrollPaymentsData.find(p => p.id === tx.relatedId);
    }
    if (tx.category === "salaries" || tx.relatedType === "salary") {
      const byId = payrollPaymentsData.find(p => p.id === tx.relatedId);
      if (byId) return byId;
      return payrollPaymentsData.find(p => p.employeeId === tx.relatedId && p.paymentDate === tx.date && p.amount === tx.amount && p.currency === tx.currency);
    }
    return undefined;
  };

  const openClientPaymentEdit = (payment: ClientPayment) => {
    setEditingClientPayment(payment);
    setIncomeForm({
      clientId: payment.clientId,
      serviceId: (payment as any).serviceId || "",
      amount: String(payment.amount),
      currency: payment.currency as Currency,
      date: payment.paymentDate,
      notes: payment.notes || "",
    });
    setIncomeModalOpen(true);
  };

  const openExpenseEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    const payrollPayment = findPayrollPaymentForTransaction(tx);
    if (payrollPayment) {
      setEditingTransaction(null);
      openPayrollPaymentEdit(payrollPayment);
      return;
    }
    setExpenseForm({
      category: tx.category || "other",
      amount: String(tx.amount),
      currency: tx.currency as Currency,
      description: tx.description || "",
      date: tx.date,
      notes: tx.notes || "",
      employeeId: tx.relatedType === "salary" ? (tx.relatedId || "") : "",
      clientId: tx.clientId || "",
      serviceId: tx.serviceId || "",
    });
    setExpenseModalOpen(true);
  };

  const openTransactionEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTransactionEditForm({
      id: tx.id,
      type: tx.type as "income" | "expense",
      category: tx.category || "",
      amount: String(tx.amount),
      currency: tx.currency as Currency,
      description: tx.description || "",
      date: tx.date,
      clientId: tx.clientId || "",
      serviceId: tx.serviceId || "",
    });
    setTransactionEditModalOpen(true);
  };

  const openPayrollPaymentEdit = (payment: PayrollPayment) => {
    setEditingPayrollPayment(payment);
    setPaymentModalEmployee(payment.employeeId);
    setPayrollForm({
      amount: String(payment.amount),
      currency: payment.currency as Currency,
      notes: payment.notes || "",
    });
  };

  const confirmDelete = (onConfirm: () => void) => {
    if (window.confirm(t.confirmDelete)) {
      onConfirm();
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPreviousMonth}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center font-medium" data-testid="text-selected-month">
              {formatMonthDisplay()}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => setIncomeModalOpen(true)} data-testid="button-add-income">
              <TrendingUp className="h-4 w-4 me-2" />
              {t.addIncome}
            </Button>
            <Button variant="outline" onClick={() => setExpenseModalOpen(true)} data-testid="button-add-expense">
              <TrendingDown className="h-4 w-4 me-2" />
              {t.addExpense}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <DollarSign className="h-4 w-4 me-1 hidden sm:inline" />
            {t.overview}
          </TabsTrigger>
          <TabsTrigger value="revenues" data-testid="tab-revenues">
            <TrendingUp className="h-4 w-4 me-1 hidden sm:inline" />
            {t.revenues}
          </TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">
            <TrendingDown className="h-4 w-4 me-1 hidden sm:inline" />
            {t.expenses}
          </TabsTrigger>
          <TabsTrigger value="payroll" data-testid="tab-payroll">
            <Wallet className="h-4 w-4 me-1 hidden sm:inline" />
            {t.payroll}
          </TabsTrigger>
          <TabsTrigger value="client-finance" data-testid="tab-client-finance">
            <Users className="h-4 w-4 me-1 hidden sm:inline" />
            {t.clientFinance}
          </TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger">
            <FileText className="h-4 w-4 me-1 hidden sm:inline" />
            {t.ledger}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.totalIncome}
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(overviewTotals.totalIncome)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.totalExpenses}
                </CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(overviewTotals.totalExpenses)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.netProfit}
                </CardTitle>
                <CircleDollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${overviewTotals.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(overviewTotals.netProfit)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.overdueAmount}
                </CardTitle>
                <Calendar className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(overviewTotals.overdueAmount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.payrollRemaining}
                </CardTitle>
                <Wallet className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(overviewTotals.payrollRemaining)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenues Tab */}
        <TabsContent value="revenues">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>{t.revenues}</CardTitle>
              <Button size="sm" onClick={() => setIncomeModalOpen(true)} data-testid="button-add-income-tab">
                <Plus className="h-4 w-4 me-1" />
                {t.addIncome}
              </Button>
            </CardHeader>
            <CardContent>
              {incomeTransactions.length === 0 && clientPaymentsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t.noTransactions}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.client}</TableHead>
                      <TableHead>{t.service}</TableHead>
                      <TableHead>{t.originalAmount}</TableHead>
                      <TableHead>{t.convertedAmount}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Show client payments as income */}
                    {clientPaymentsData.map(payment => (
                      <TableRow key={`payment-${payment.id}`} data-testid={`row-income-${payment.id}`}>
                        <TableCell>{getClientName(payment.clientId)}</TableCell>
                        <TableCell>{getServiceName((payment as any).serviceId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatCurrency(payment.amount, payment.currency as Currency)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(convertAmount(payment.amount, payment.currency as Currency, displayCurrency))}
                        </TableCell>
                        <TableCell>{payment.paymentDate}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openClientPaymentEdit(payment)}
                              data-testid={`button-edit-payment-${payment.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => confirmDelete(() => deleteClientPaymentMutation.mutate(payment.id))}
                              data-testid={`button-delete-payment-${payment.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Show direct income transactions */}
                    {incomeTransactions.map(tx => (
                      <TableRow key={tx.id} data-testid={`row-income-${tx.id}`}>
                        <TableCell>{getClientName(tx.clientId || null)}</TableCell>
                        <TableCell>{getServiceName(tx.serviceId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatCurrency(tx.amount, tx.currency as Currency)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                        {formatCurrency(convertAmount(tx.amount, tx.currency as Currency, displayCurrency))}
                      </TableCell>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openTransactionEdit(tx)}
                              data-testid={`button-edit-transaction-${tx.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => confirmDelete(() => deleteTransactionMutation.mutate(tx.id))}
                              data-testid={`button-delete-transaction-${tx.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>{t.expenses}</CardTitle>
              <Button size="sm" onClick={() => setExpenseModalOpen(true)} data-testid="button-add-expense-tab">
                <Plus className="h-4 w-4 me-1" />
                {t.addExpense}
              </Button>
            </CardHeader>
            <CardContent>
              {expenseTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t.noTransactions}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.category}</TableHead>
                      <TableHead>{t.employee}</TableHead>
                      <TableHead>{t.description}</TableHead>
                      <TableHead>{t.originalAmount}</TableHead>
                      <TableHead>{t.convertedAmount}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseTransactions.map(tx => (
                      <TableRow key={tx.id} data-testid={`row-expense-${tx.id}`}>
                        <TableCell>
                          <Badge variant="secondary">{getCategoryLabel(tx.category || "other")}</Badge>
                        </TableCell>
                        <TableCell>{getExpenseEmployeeName(tx)}</TableCell>
                        <TableCell>{tx.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatCurrency(tx.amount, tx.currency as Currency)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                        {formatCurrency(convertAmount(tx.amount, tx.currency as Currency, displayCurrency))}
                      </TableCell>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openExpenseEdit(tx)}
                              data-testid={`button-edit-expense-${tx.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const payrollPayment = findPayrollPaymentForTransaction(tx);
                                confirmDelete(() => {
                                  if (payrollPayment) {
                                    deletePayrollPaymentMutation.mutate(payrollPayment.id);
                                  } else {
                                    deleteTransactionMutation.mutate(tx.id);
                                  }
                                });
                              }}
                              data-testid={`button-delete-expense-${tx.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab - Redesigned with employee selector */}
        <TabsContent value="payroll">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Employee Selector */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>{t.selectEmployee}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {employees.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">{t.noEmployees}</div>
                ) : (
                  <>
                    {/* All employees summary option */}
                    <Button
                      variant={selectedPayrollEmployee === null ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedPayrollEmployee(null)}
                      data-testid="button-all-employees"
                    >
                      <Users className="h-4 w-4 me-2" />
                      {t.allEmployees}
                    </Button>
                    
                    {employees.map(emp => {
                      const empData = payrollData.find(p => p.employee.id === emp.id);
                      return (
                        <Button
                          key={emp.id}
                          variant={selectedPayrollEmployee === emp.id ? "default" : "outline"}
                          className="w-full justify-between"
                          onClick={() => setSelectedPayrollEmployee(emp.id)}
                          data-testid={`button-employee-${emp.id}`}
                        >
                          <span>{language === "ar" ? emp.name : emp.nameEn || emp.name}</span>
                          {empData && empData.remaining > 0 && (
                            <Badge variant="destructive" className="ms-2">
                              {formatCurrency(empData.remaining)}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Employee Details or All Employees Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedPayrollEmployee 
                    ? getEmployeeName(selectedPayrollEmployee)
                    : t.allEmployees
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPayrollEmployee && selectedEmployeePayroll ? (
                  // Single employee details
                  <div className="space-y-6">
                    {/* Pay type and salary info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">{t.payType}</div>
                        <div className="font-medium">
                          <Badge variant="outline">
                            {selectedEmployeePayroll.payType === "per_project" ? t.perProject : t.monthly}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">
                          {selectedEmployeePayroll.payType === "monthly" ? t.salary : t.rate}
                        </div>
                        <div className="font-medium">
                          {selectedEmployeePayroll.payType === "monthly"
                            ? (selectedEmployeePayroll.monthlyAmount
                              ? formatCurrency(selectedEmployeePayroll.monthlyAmount, selectedEmployeePayroll.salaryCurrency)
                              : "-")
                            : (selectedEmployeePayroll.rateAmount
                              ? formatCurrency(selectedEmployeePayroll.rateAmount, selectedEmployeePayroll.salaryCurrency)
                              : "-")}
                        </div>
                        {selectedEmployeePayroll.payType !== "monthly" && (
                          <div className="text-xs text-muted-foreground">
                            {selectedEmployeePayroll.rateUnitsCount} {t.services}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment summary cards */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground mb-1">{t.totalDue}</div>
                        <div className="text-xl font-bold">
                          {formatCurrency(selectedEmployeePayroll.expectedSalary)}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20">
                        <div className="text-sm text-muted-foreground mb-1">{t.paidThisMonth}</div>
                        <div className="text-xl font-bold text-green-600">
                          {formatCurrency(selectedEmployeePayroll.paidThisMonth)}
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg border ${selectedEmployeePayroll.remaining > 0 ? "border-orange-200 bg-orange-50 dark:bg-orange-950/20" : "border-green-200 bg-green-50 dark:bg-green-950/20"}`}>
                        <div className="text-sm text-muted-foreground mb-1">{t.remaining}</div>
                        <div className={`text-xl font-bold ${selectedEmployeePayroll.remaining > 0 ? "text-orange-600" : "text-green-600"}`}>
                          {formatCurrency(selectedEmployeePayroll.remaining)}
                        </div>
                      </div>
                    </div>

                    {/* Record payment button */}
                    {selectedEmployeePayroll.remaining > 0 && (
                      <Button 
                        onClick={() => {
                          setPaymentModalEmployee(selectedPayrollEmployee);
                          const remainingInOriginalCurrency = selectedEmployeePayroll.salaryCurrency === displayCurrency
                            ? selectedEmployeePayroll.remaining
                            : convertAmount(selectedEmployeePayroll.remaining, displayCurrency, selectedEmployeePayroll.salaryCurrency);
                          setPayrollForm({
                            amount: String(Math.round(remainingInOriginalCurrency)),
                            currency: selectedEmployeePayroll.salaryCurrency,
                            notes: "",
                          });
                        }}
                        data-testid="button-record-payment"
                      >
                        <Plus className="h-4 w-4 me-2" />
                        {t.recordPayment}
                      </Button>
                    )}

                    {/* Payment history */}
                    {selectedEmployeePayroll.payments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">{t.paidThisMonth}</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t.date}</TableHead>
                              <TableHead>{t.amount}</TableHead>
                              <TableHead>{t.description}</TableHead>
                              <TableHead>{t.actions}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedEmployeePayroll.payments.map(payment => (
                              <TableRow key={payment.id}>
                                <TableCell>{payment.paymentDate}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {formatCurrency(convertAmount(payment.amount, payment.currency as Currency, displayCurrency))}
                                    </span>
                                    {payment.currency !== displayCurrency && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatCurrency(payment.amount, payment.currency as Currency)}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{payment.notes || "-"}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openPayrollPaymentEdit(payment)}
                                      data-testid={`button-edit-payroll-${payment.id}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => confirmDelete(() => deletePayrollPaymentMutation.mutate(payment.id))}
                                      data-testid={`button-delete-payroll-${payment.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ) : (
                  // All employees table
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.employee}</TableHead>
                        <TableHead>{t.payType}</TableHead>
                        <TableHead>{t.salary}</TableHead>
                        <TableHead>{t.paidThisMonth}</TableHead>
                        <TableHead>{t.remaining}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollData.map(({ employee, payType, monthlyAmount, rateAmount, salaryCurrency, rateUnitsCount, paidThisMonth, remaining }) => (
                        <TableRow key={employee.id} data-testid={`row-payroll-${employee.id}`}>
                          <TableCell className="font-medium">
                            {language === "ar" ? employee.name : employee.nameEn || employee.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payType === "per_project" ? t.perProject : t.monthly}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payType === "monthly"
                              ? (monthlyAmount ? formatCurrency(convertAmount(monthlyAmount, salaryCurrency as Currency, displayCurrency)) : "-")
                              : (rateAmount ? formatCurrency(convertAmount(rateAmount, salaryCurrency as Currency, displayCurrency)) : "-")}
                            {payType !== "monthly" && (
                              <div className="text-xs text-muted-foreground">
                                {rateUnitsCount} {t.services}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(paidThisMonth)}
                          </TableCell>
                          <TableCell className={remaining > 0 ? "text-orange-600" : "text-green-600"}>
                            {formatCurrency(remaining)}
                          </TableCell>
                          <TableCell>
                            {remaining > 0 && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setPaymentModalEmployee(employee.id);
                                  const remainingInOriginalCurrency = salaryCurrency === displayCurrency
                                    ? remaining
                                    : convertAmount(remaining, displayCurrency, salaryCurrency);
                                  setPayrollForm({
                                    amount: String(Math.round(remainingInOriginalCurrency)),
                                    currency: salaryCurrency,
                                    notes: "",
                                  });
                                }}
                                data-testid={`button-pay-${employee.id}`}
                              >
                                <Plus className="h-4 w-4 me-1" />
                                {t.recordPayment}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Client Finance Tab - Enhanced with service details */}
        <TabsContent value="client-finance">
          <Card>
            <CardHeader>
              <CardTitle>{t.clientFinance}</CardTitle>
            </CardHeader>
            <CardContent>
              {clientFinanceData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t.noClients}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.client}</TableHead>
                      <TableHead>{t.expectedMonthly}</TableHead>
                      <TableHead>{t.paidMonthly}</TableHead>
                      <TableHead>{t.due}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientFinanceData.map(({ client, expectedMonthly, paidThisMonth, due, isOverdue, services }) => (
                      <TableRow key={client.id} data-testid={`row-client-finance-${client.id}`}>
                        <TableCell className="font-medium">
                          {client.name}
                        </TableCell>
                        <TableCell>{formatCurrency(expectedMonthly)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(paidThisMonth)}</TableCell>
                        <TableCell className={due > 0 ? "text-orange-600" : "text-green-600"}>
                          {formatCurrency(due)}
                        </TableCell>
                        <TableCell>
                          {isOverdue ? (
                            <Badge variant="destructive">{t.overdue}</Badge>
                          ) : (
                            <Badge variant="secondary">{t.paid}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setClientDetailsSheet(client.id)}
                              data-testid={`button-details-${client.id}`}
                            >
                              <Package className="h-4 w-4 me-1" />
                              {t.serviceDetails}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setIncomeForm({ ...incomeForm, clientId: client.id, serviceId: "" });
                                setIncomeModalOpen(true);
                              }}
                              data-testid={`button-add-payment-${client.id}`}
                            >
                              <Plus className="h-4 w-4 me-1" />
                              {t.addPayment}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Ledger Tab */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>{t.ledger}</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsData.length === 0 && clientPaymentsData.length === 0 && payrollPaymentsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t.noTransactions}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.type}</TableHead>
                      <TableHead>{t.category}</TableHead>
                      <TableHead>{t.linkedEntity}</TableHead>
                      <TableHead>{t.originalAmount}</TableHead>
                      <TableHead>{t.convertedAmount}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* All transactions (including those from client/payroll payments) */}
                    {transactionsData.map(tx => (
                      <TableRow key={tx.id} data-testid={`row-ledger-${tx.id}`}>
                        <TableCell>
                          <Badge variant={tx.type === "income" ? "default" : "destructive"}>
                            {tx.type === "income" ? t.income : t.expense}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.category ? getCategoryLabel(tx.category) : "-"}</TableCell>
                        <TableCell>
                          {getLinkedEntityName(tx)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatCurrency(tx.amount, tx.currency as Currency)}</Badge>
                        </TableCell>
                        <TableCell className={`font-medium ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(convertAmount(tx.amount, tx.currency as Currency, displayCurrency))}
                        </TableCell>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const clientPayment = findClientPaymentForTransaction(tx);
                                const payrollPayment = findPayrollPaymentForTransaction(tx);
                                if (clientPayment) {
                                  openClientPaymentEdit(clientPayment);
                                } else if (payrollPayment) {
                                  openPayrollPaymentEdit(payrollPayment);
                                } else {
                                  openTransactionEdit(tx);
                                }
                              }}
                              data-testid={`button-edit-ledger-${tx.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const clientPayment = findClientPaymentForTransaction(tx);
                                const payrollPayment = findPayrollPaymentForTransaction(tx);
                                confirmDelete(() => {
                                  if (clientPayment) {
                                    deleteClientPaymentMutation.mutate(clientPayment.id);
                                  } else if (payrollPayment) {
                                    deletePayrollPaymentMutation.mutate(payrollPayment.id);
                                  } else {
                                    deleteTransactionMutation.mutate(tx.id);
                                  }
                                });
                              }}
                              data-testid={`button-delete-ledger-${tx.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Client Service Details Sheet */}
      <Sheet open={!!clientDetailsSheet} onOpenChange={(open) => !open && setClientDetailsSheet(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t.serviceDetails}</SheetTitle>
            <SheetDescription>
              {selectedClientDetails?.client.name}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {!Array.isArray(selectedClientDetails?.services) || selectedClientDetails?.services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t.noServices}</div>
            ) : (
              selectedClientDetails.services.map((service, idx) => {
                const progress = getDeliverableProgress(service);
                const totalDone = progress.reduce((sum, p) => sum + p.done, 0);
                const totalTotal = progress.reduce((sum, p) => sum + p.total, 0);
                const overallProgress = totalTotal > 0 ? Math.round((totalDone / totalTotal) * 100) : 0;
                
                return (
                  <Collapsible key={idx} defaultOpen={idx === 0}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {language === "ar" ? service.serviceName : service.serviceNameEn || service.serviceName}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge>
                              {formatCurrency(
                                convertAmount(service.price || 0, (service.currency || "USD") as Currency, displayCurrency),
                                displayCurrency
                              )}
                            </Badge>
                            <Badge variant="outline">
                              {formatCurrency(service.price || 0, (service.currency || "USD") as Currency)}
                            </Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {/* Overall progress */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{t.packageProgress}</span>
                              <span>{overallProgress}%</span>
                            </div>
                            <Progress value={overallProgress} className="h-2" />
                          </div>
                          
                          {/* Deliverables breakdown */}
                          {Array.isArray(progress) && progress.length > 0 ? (
                              <div className="space-y-3">
                                {progress.map(({ key, label, done, total, isBoolean }) => (
                                <div key={key} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {isBoolean ? (
                                      done === 1 ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground" />
                                      )
                                    ) : null}
                                    <span className="text-sm">{label}</span>
                                  </div>
                                  {isBoolean ? (
                                    <Badge variant={done === 1 ? "default" : "outline"}>
                                      {done === 1 ? t.done : t.remainingDeliverables}
                                    </Badge>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">
                                        {done}/{total}
                                      </span>
                                      <Progress value={(done / total) * 100} className="w-16 h-2" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground text-center py-2">
                              {language === "ar" ? "لا توجد تفاصيل" : "No details available"}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })
            )}
            {selectedClientDetails?.payments.length ? (
              <div className="pt-2">
                <h4 className="font-medium mb-3">{t.payments}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.amount}</TableHead>
                      <TableHead>{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedClientDetails.payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.paymentDate}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatCurrency(convertAmount(payment.amount, payment.currency as Currency, displayCurrency))}
                            </span>
                            {payment.currency !== displayCurrency && (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(payment.amount, payment.currency as Currency)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openClientPaymentEdit(payment)}
                              data-testid={`button-edit-client-payment-${payment.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => confirmDelete(() => deleteClientPaymentMutation.mutate(payment.id))}
                              data-testid={`button-delete-client-payment-${payment.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Income Modal */}
      <Dialog
        open={incomeModalOpen}
        onOpenChange={(open) => {
          setIncomeModalOpen(open);
          if (!open) {
            setEditingClientPayment(null);
            resetIncomeForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClientPayment ? t.editIncome : t.addIncome}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "سجل إيراد جديد من عميل" : "Record a new income from a client"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.client}</Label>
              <Select value={incomeForm.clientId} onValueChange={v => setIncomeForm({ ...incomeForm, clientId: v, serviceId: "" })}>
                <SelectTrigger data-testid="select-income-client">
                  <SelectValue placeholder={t.client} />
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
            <div className="space-y-2">
              <Label>{t.service}</Label>
              <Select value={incomeForm.serviceId} onValueChange={v => setIncomeForm({ ...incomeForm, serviceId: v })}>
                <SelectTrigger
                  data-testid="select-income-service"
                  disabled={!incomeForm.clientId || incomeClientServices.length === 0}
                >
                  <SelectValue placeholder={t.selectService} />
                </SelectTrigger>
                <SelectContent>
                  {incomeClientServices.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {language === "ar" ? service.serviceName : service.serviceNameEn || service.serviceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.amount}</Label>
                <Input 
                  type="number" 
                  value={incomeForm.amount}
                  onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  placeholder="0"
                  data-testid="input-income-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={incomeForm.currency} onValueChange={v => setIncomeForm({ ...incomeForm, currency: v as Currency })}>
                  <SelectTrigger data-testid="select-income-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.date}</Label>
              <DateInput 
                value={incomeForm.date}
                onChange={(date) => setIncomeForm({ ...incomeForm, date })}
                data-testid="input-income-date"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.description}</Label>
              <Textarea 
                value={incomeForm.notes}
                onChange={e => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                placeholder={t.description}
                data-testid="input-income-notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIncomeModalOpen(false)}>{t.cancel}</Button>
            <Button 
              onClick={handleIncomeSubmit} 
              disabled={createClientPaymentMutation.isPending || updateClientPaymentMutation.isPending}
              data-testid="button-save-income"
            >
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog
        open={expenseModalOpen}
        onOpenChange={(open) => {
          setExpenseModalOpen(open);
          if (!open) {
            setEditingTransaction(null);
            resetExpenseForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTransaction ? t.editExpense : t.addExpense}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "سجل مصروف جديد" : "Record a new expense"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.category}</Label>
              <Select value={expenseForm.category} onValueChange={v => setExpenseForm({ ...expenseForm, category: v, employeeId: v === "salaries" ? expenseForm.employeeId : "" })}>
                <SelectTrigger data-testid="select-expense-category">
                  <SelectValue placeholder={t.category} />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {language === "ar" ? cat.labelAr : cat.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {expenseForm.category === "salaries" && (
              <div className="space-y-2">
                <Label>{t.employee}</Label>
                <Select value={expenseForm.employeeId} onValueChange={v => setExpenseForm({ ...expenseForm, employeeId: v })}>
                  <SelectTrigger data-testid="select-expense-employee">
                    <SelectValue placeholder={t.selectEmployee} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {language === "ar" ? emp.name : emp.nameEn || emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.amount}</Label>
                <Input 
                  type="number" 
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0"
                  data-testid="input-expense-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={expenseForm.currency} onValueChange={v => setExpenseForm({ ...expenseForm, currency: v as Currency })}>
                  <SelectTrigger data-testid="select-expense-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.linkedClient}</Label>
              <Select value={expenseForm.clientId} onValueChange={v => setExpenseForm({ ...expenseForm, clientId: v, serviceId: "" })}>
                <SelectTrigger data-testid="select-expense-client">
                  <SelectValue placeholder={t.client} />
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
            <div className="space-y-2">
              <Label>{t.linkedService}</Label>
              <Select value={expenseForm.serviceId} onValueChange={v => setExpenseForm({ ...expenseForm, serviceId: v })}>
                <SelectTrigger
                  data-testid="select-expense-service"
                  disabled={!expenseForm.clientId || expenseClientServices.length === 0}
                >
                  <SelectValue placeholder={t.selectService} />
                </SelectTrigger>
                <SelectContent>
                  {expenseClientServices.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {language === "ar" ? service.serviceName : service.serviceNameEn || service.serviceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.description}</Label>
              <Input 
                value={expenseForm.description}
                onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder={t.description}
                data-testid="input-expense-description"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.date}</Label>
              <DateInput 
                value={expenseForm.date}
                onChange={(date) => setExpenseForm({ ...expenseForm, date })}
                data-testid="input-expense-date"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExpenseModalOpen(false)}>{t.cancel}</Button>
            <Button 
              onClick={handleExpenseSubmit} 
              disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
              data-testid="button-save-expense"
            >
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payroll Payment Modal */}
      <Dialog
        open={!!paymentModalEmployee}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentModalEmployee(null);
            setEditingPayrollPayment(null);
            resetPayrollForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPayrollPayment ? t.editPayroll : t.recordPayment}</DialogTitle>
            <DialogDescription>
              {paymentModalEmployee && getEmployeeName(paymentModalEmployee)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.amount}</Label>
                <Input 
                  type="number" 
                  value={payrollForm.amount}
                  onChange={e => setPayrollForm({ ...payrollForm, amount: e.target.value })}
                  placeholder="0"
                  data-testid="input-payroll-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={payrollForm.currency} onValueChange={v => setPayrollForm({ ...payrollForm, currency: v as Currency })}>
                  <SelectTrigger data-testid="select-payroll-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.description}</Label>
              <Textarea 
                value={payrollForm.notes}
                onChange={e => setPayrollForm({ ...payrollForm, notes: e.target.value })}
                placeholder={t.description}
                data-testid="input-payroll-notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPaymentModalEmployee(null)}>{t.cancel}</Button>
            <Button 
              onClick={handlePayrollSubmit} 
              disabled={createPayrollPaymentMutation.isPending || updatePayrollPaymentMutation.isPending}
              data-testid="button-save-payroll"
            >
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={transactionEditModalOpen}
        onOpenChange={(open) => {
          setTransactionEditModalOpen(open);
          if (!open) {
            setEditingTransaction(null);
            resetTransactionEditForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editTransaction}</DialogTitle>
            <DialogDescription>
              {transactionEditForm.type === "income" ? t.income : t.expense}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.type}</Label>
              <Badge variant={transactionEditForm.type === "income" ? "default" : "destructive"}>
                {transactionEditForm.type === "income" ? t.income : t.expense}
              </Badge>
            </div>
            {transactionEditForm.type === "expense" ? (
              <div className="space-y-2">
                <Label>{t.category}</Label>
                <Select
                  value={transactionEditForm.category}
                  onValueChange={v => setTransactionEditForm({ ...transactionEditForm, category: v })}
                >
                  <SelectTrigger data-testid="select-transaction-category">
                    <SelectValue placeholder={t.category} />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {language === "ar" ? cat.labelAr : cat.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t.category}</Label>
                <Input
                  value={transactionEditForm.category}
                  onChange={e => setTransactionEditForm({ ...transactionEditForm, category: e.target.value })}
                  placeholder={t.category}
                  data-testid="input-transaction-category"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.amount}</Label>
                <Input
                  type="number"
                  value={transactionEditForm.amount}
                  onChange={e => setTransactionEditForm({ ...transactionEditForm, amount: e.target.value })}
                  placeholder="0"
                  data-testid="input-transaction-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={transactionEditForm.currency}
                  onValueChange={v => setTransactionEditForm({ ...transactionEditForm, currency: v as Currency })}
                >
                  <SelectTrigger data-testid="select-transaction-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr} value={curr}>
                        {CURRENCY_SYMBOLS[curr]} {curr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.linkedClient}</Label>
              <Select
                value={transactionEditForm.clientId}
                onValueChange={v => setTransactionEditForm({ ...transactionEditForm, clientId: v, serviceId: "" })}
              >
                <SelectTrigger data-testid="select-transaction-client">
                  <SelectValue placeholder={t.client} />
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
            <div className="space-y-2">
              <Label>{t.linkedService}</Label>
              <Select
                value={transactionEditForm.serviceId}
                onValueChange={v => setTransactionEditForm({ ...transactionEditForm, serviceId: v })}
              >
                <SelectTrigger
                  data-testid="select-transaction-service"
                  disabled={!transactionEditForm.clientId || transactionClientServices.length === 0}
                >
                  <SelectValue placeholder={t.selectService} />
                </SelectTrigger>
                <SelectContent>
                  {transactionClientServices.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {language === "ar" ? service.serviceName : service.serviceNameEn || service.serviceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.description}</Label>
              <Input
                value={transactionEditForm.description}
                onChange={e => setTransactionEditForm({ ...transactionEditForm, description: e.target.value })}
                placeholder={t.description}
                data-testid="input-transaction-description"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.date}</Label>
              <DateInput
                value={transactionEditForm.date}
                onChange={(date) => setTransactionEditForm({ ...transactionEditForm, date })}
                data-testid="input-transaction-date"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTransactionEditModalOpen(false)}>{t.cancel}</Button>
            <Button
              onClick={handleTransactionEditSubmit}
              disabled={updateTransactionMutation.isPending}
              data-testid="button-save-transaction"
            >
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
