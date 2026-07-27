import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DollarSign, TrendingUp, TrendingDown, Wallet, Users, FileText, 
  Plus, RefreshCw, Building, Zap, Megaphone, Wrench, RotateCcw, MoreHorizontal,
  Calendar, ArrowUpRight, ArrowDownRight, CircleDollarSign, ChevronLeft, ChevronRight,
  ChevronDown, Package, CheckCircle2, Circle, Pencil, Trash2, Sparkles, Filter, BarChart3
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { HasPermission } from "@/components/permissions";
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

const PACKAGE_COLORS: Record<string, string> = {
  "main-pkg-1": "hsl(262, 83%, 58%)",
  "main-pkg-2": "hsl(217, 91%, 60%)",
  "main-pkg-3": "hsl(239, 84%, 67%)",
  "main-pkg-4": "hsl(25, 95%, 53%)",
  "main-pkg-5": "hsl(172, 66%, 50%)",
  "main-pkg-6": "hsl(142, 76%, 36%)",
};

const CHART_PALETTE = [
  "hsl(262, 83%, 58%)",
  "hsl(217, 91%, 60%)",
  "hsl(172, 66%, 50%)",
  "hsl(25, 95%, 53%)",
  "hsl(338, 82%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(45, 93%, 47%)",
  "hsl(198, 93%, 60%)",
];

const PANEL_CARD_CLASS = "border-border/60 bg-background/95 shadow-sm backdrop-blur";
const FILTER_BAR_CLASS = "flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3";

const normalizeFinanceLabel = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, "")
    .trim();

type FinanceSummaryResponse = {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  overdueAmount: number;
  payrollRemaining: number;
  expectedRevenue: number;
  servicesBreakdown: { packageName: string; packageNameAr: string; revenue: number }[];
  expenseBreakdown: { key: string; label: string; labelAr: string; amount: number }[];
  displayCurrency: string;
};

type FinanceLedgerEntry = {
  id: string;
  recordId: string;
  source: "transaction" | "client_payment" | "payroll_payment" | "service_completion";
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  currency: Currency;
  convertedAmount: number;
  date: string;
  relatedId: string | null;
  relatedType: string | null;
  status: string;
  notes: string | null;
  clientId: string | null;
  serviceId: string | null;
  employeeId: string | null;
  isSystemManaged: boolean;
  canEdit: boolean;
  canDelete: boolean;
  lockedReason: string | null;
  displayCurrency: string;
};

type FinancePayrollReportItem = {
  employeeId: string;
  payType: string;
  salaryCurrency: Currency;
  monthlyAmount: number;
  rateAmount: number;
  rateUnitsCount: number;
  paidThisPeriod: number;
  remaining: number;
  expectedSalary: number;
  payments: PayrollPayment[];
};

type FinanceClientReportItem = {
  clientId: string;
  expectedMonthly: number;
  expectedOneTime: number;
  paidThisPeriod: number;
  oneTimePaidThisPeriod: number;
  due: number;
  isOverdue: boolean;
  payments: ClientPayment[];
};

import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function FinancePage() {
  const { isAdmin, hasResourcePermission, hasPermission } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const canFinance = isAdmin || hasResourcePermission("finance");
  const canManageSalaries = isAdmin || hasPermission("employees:manage_salaries");

  if (!canFinance) {
    setLocation("/");
    return null;
  }
  const { language } = useLanguage();
  const { clients, employees, subPackages, mainPackages } = useData();
  const { convertAmount, formatCurrency, currency: displayCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  
  const now = new Date();
  
  const [filterPeriod, setFilterPeriod] = useState("all");
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  
  const [selectedFilterYear, setSelectedFilterYear] = useState(() => now.getFullYear());
  
  const [selectedYear, selectedMonthNum] = selectedMonth.split("-").map(Number);
  
  // Resolve actual filter values based on period
  const effectiveMonth = filterPeriod === "specific-month" ? selectedMonthNum : undefined;
  const effectiveYear = filterPeriod === "all" ? undefined : (filterPeriod === "specific-year" ? selectedFilterYear : selectedYear);
  
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
    incomeType: "client_payment" as "client_payment" | "external",
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

  const [revenueTypeFilter, setRevenueTypeFilter] = useState("all");
  const [revenueClientFilter, setRevenueClientFilter] = useState("all");
  const [revenueServiceFilter, setRevenueServiceFilter] = useState("all");
  const [revenueCurrencyFilter, setRevenueCurrencyFilter] = useState("all");

  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseClientFilter, setExpenseClientFilter] = useState("all");
  const [expenseServiceFilter, setExpenseServiceFilter] = useState("all");
  const [expenseCurrencyFilter, setExpenseCurrencyFilter] = useState("all");

  const [payrollEmployeeFilter, setPayrollEmployeeFilter] = useState("all");
  const [payrollPayTypeFilter, setPayrollPayTypeFilter] = useState("all");
  const [payrollCurrencyFilter, setPayrollCurrencyFilter] = useState("all");

  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState("all");
  const [ledgerClientFilter, setLedgerClientFilter] = useState("all");
  const [ledgerEmployeeFilter, setLedgerEmployeeFilter] = useState("all");
  const [ledgerCurrencyFilter, setLedgerCurrencyFilter] = useState("all");

  const [clientFinanceClientFilter, setClientFinanceClientFilter] = useState("all");
  const [clientFinanceStatusFilter, setClientFinanceStatusFilter] = useState("all");

  const resetRevenueFilters = () => {
    setRevenueTypeFilter("all");
    setRevenueClientFilter("all");
    setRevenueServiceFilter("all");
    setRevenueCurrencyFilter("all");
  };

  const resetExpenseFilters = () => {
    setExpenseCategoryFilter("all");
    setExpenseClientFilter("all");
    setExpenseServiceFilter("all");
    setExpenseCurrencyFilter("all");
  };

  const resetPayrollFilters = () => {
    setPayrollEmployeeFilter("all");
    setPayrollPayTypeFilter("all");
    setPayrollCurrencyFilter("all");
  };

  const resetLedgerFilters = () => {
    setLedgerTypeFilter("all");
    setLedgerCategoryFilter("all");
    setLedgerClientFilter("all");
    setLedgerEmployeeFilter("all");
    setLedgerCurrencyFilter("all");
  };

  const resetClientFinanceFilters = () => {
    setClientFinanceClientFilter("all");
    setClientFinanceStatusFilter("all");
  };

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
      expectedRevenue: "الإيرادات المتوقعة",
      revenueByService: "الإيرادات حسب الخدمة",
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
      year: "السنة",
      type: "النوع",
      income: "إيراد",
      expense: "مصروف",
      externalIncome: "إيراد خارجي",
      directTransaction: "معاملة مباشرة",
      incomeType: "نوع الإيراد",
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
      clientPayment: "دفعة عميل",
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
      expectedRevenue: "Expected Revenue",
      revenueByService: "Revenue by Service",
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
      year: "Year",
      type: "Type",
      income: "Income",
      expense: "Expense",
      externalIncome: "External Income",
      directTransaction: "Direct Transaction",
      incomeType: "Income Type",
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
      clientPayment: "Client Payment",
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

  // Fetch transactions
  const { data: transactionsDataRaw = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", { month: effectiveMonth, year: effectiveYear }],
    queryFn: async () => {
      let url = "/api/transactions";
      const params = new URLSearchParams();
      if (effectiveMonth !== undefined) params.set("month", String(effectiveMonth));
      if (effectiveYear !== undefined) params.set("year", String(effectiveYear));
      if (params.toString()) url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    enabled: canFinance,
  });
  const transactionsData = Array.isArray(transactionsDataRaw) ? transactionsDataRaw : [];

  // Fetch client payments
  const { data: clientPaymentsDataRaw = [] } = useQuery<ClientPayment[]>({
    queryKey: ["/api/client-payments", { month: effectiveMonth, year: effectiveYear }],
    queryFn: async () => {
      let url = "/api/client-payments";
      const params = new URLSearchParams();
      if (effectiveMonth !== undefined) params.set("month", String(effectiveMonth));
      if (effectiveYear !== undefined) params.set("year", String(effectiveYear));
      if (params.toString()) url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch client payments");
      return res.json();
    },
    enabled: canFinance,
  });
  const clientPaymentsData = Array.isArray(clientPaymentsDataRaw) ? clientPaymentsDataRaw : [];

  // Fetch payroll payments
  const { data: payrollPaymentsDataRaw = [] } = useQuery<PayrollPayment[]>({
    queryKey: ["/api/payroll-payments", { month: effectiveMonth, year: effectiveYear }],
    queryFn: async () => {
      let url = "/api/payroll-payments";
      const params = new URLSearchParams();
      if (effectiveMonth !== undefined) params.set("month", String(effectiveMonth));
      if (effectiveYear !== undefined) params.set("year", String(effectiveYear));
      if (params.toString()) url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payroll payments");
      return res.json();
    },
    enabled: canFinance,
  });
  const payrollPaymentsData = Array.isArray(payrollPaymentsDataRaw) ? payrollPaymentsDataRaw : [];

  // Fetch employee salaries
  const { data: employeeSalariesDataRaw = [] } = useQuery<EmployeeSalary[]>({
    queryKey: ["/api/employee-salaries"],
    enabled: canManageSalaries,
  });
  const employeeSalariesData = Array.isArray(employeeSalariesDataRaw) ? employeeSalariesDataRaw : [];

  // Fetch finance summary
  const { data: financeSummary } = useQuery<FinanceSummaryResponse>({
    queryKey: ["/api/finance-summary", { month: effectiveMonth, year: effectiveYear, displayCurrency }],
    queryFn: async () => {
      let url = "/api/finance-summary";
      const params = new URLSearchParams();
      if (effectiveMonth !== undefined) params.set("month", String(effectiveMonth));
      if (effectiveYear !== undefined) params.set("year", String(effectiveYear));
      params.set("displayCurrency", displayCurrency);
      url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch finance summary");
      return res.json();
    },
    enabled: canFinance,
  });

  const { data: financeLedgerRaw = [] } = useQuery<FinanceLedgerEntry[]>({
    queryKey: ["/api/finance-ledger", { month: effectiveMonth, year: effectiveYear, displayCurrency }],
    queryFn: async () => {
      let url = "/api/finance-ledger";
      const params = new URLSearchParams();
      if (effectiveMonth !== undefined) params.set("month", String(effectiveMonth));
      if (effectiveYear !== undefined) params.set("year", String(effectiveYear));
      params.set("displayCurrency", displayCurrency);
      url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch finance ledger");
      return res.json();
    },
    enabled: canFinance,
  });
  const financeLedger = Array.isArray(financeLedgerRaw) ? financeLedgerRaw : [];

  const { data: financePayrollReportRaw = [] } = useQuery<FinancePayrollReportItem[]>({
    queryKey: ["/api/finance-payroll-report", { month: effectiveMonth, year: effectiveYear, displayCurrency }],
    queryFn: async () => {
      let url = "/api/finance-payroll-report";
      const params = new URLSearchParams();
      if (effectiveMonth !== undefined) params.set("month", String(effectiveMonth));
      if (effectiveYear !== undefined) params.set("year", String(effectiveYear));
      params.set("displayCurrency", displayCurrency);
      url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch finance payroll report");
      return res.json();
    },
    enabled: canFinance,
  });
  const financePayrollReport = Array.isArray(financePayrollReportRaw) ? financePayrollReportRaw : [];

  const { data: financeClientReportRaw = [] } = useQuery<FinanceClientReportItem[]>({
    queryKey: ["/api/finance-client-report", { month: effectiveMonth, year: effectiveYear, displayCurrency }],
    queryFn: async () => {
      let url = "/api/finance-client-report";
      const params = new URLSearchParams();
      if (effectiveMonth !== undefined) params.set("month", String(effectiveMonth));
      if (effectiveYear !== undefined) params.set("year", String(effectiveYear));
      params.set("displayCurrency", displayCurrency);
      url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch finance client report");
      return res.json();
    },
    enabled: canFinance,
  });
  const financeClientReport = Array.isArray(financeClientReportRaw) ? financeClientReportRaw : [];

  const invalidateFinanceReports = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey)
        && typeof query.queryKey[0] === "string"
        && query.queryKey[0].startsWith("/api/finance-"),
    });
  };

  const resetIncomeForm = () => {
    setIncomeForm({ clientId: "", serviceId: "", amount: "", currency: "USD", date: new Date().toISOString().split("T")[0], notes: "", incomeType: "client_payment" });
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
      invalidateFinanceReports();
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
      invalidateFinanceReports();
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
      invalidateFinanceReports();
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
      invalidateFinanceReports();
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
      invalidateFinanceReports();
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
      invalidateFinanceReports();
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
      invalidateFinanceReports();
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
      invalidateFinanceReports();
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
      invalidateFinanceReports();
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
    if (incomeForm.incomeType === "external") {
      if (!incomeForm.notes) {
        toast({
          variant: "destructive",
          title: language === "ar" ? "تنبيه" : "Warning",
          description: language === "ar" ? "يرجى إدخال الوصف" : "Please enter a description",
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
        type: "income",
        category: "other",
        amount: Math.round(Number(incomeForm.amount)),
        currency: incomeForm.currency,
        description: incomeForm.notes,
        date: incomeForm.date,
        month,
        year,
        notes: null,
        relatedId: null,
        relatedType: null,
        clientId: null,
        serviceId: null,
      };

      createTransactionMutation.mutate(payload, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          invalidateFinanceReports();
          setIncomeModalOpen(false);
          resetIncomeForm();
          toast({
            title: language === "ar" ? "تم بنجاح" : "Success",
            description: language === "ar" ? "تم تسجيل الإيراد الخارجي بنجاح" : "External income recorded successfully",
          });
        },
        onError: (error: Error) => {
          toast({
            variant: "destructive",
            title: language === "ar" ? "خطأ" : "Error",
            description: language === "ar" ? `فشل تسجيل الإيراد الخارجي: ${error.message}` : `Failed to record external income: ${error.message}`,
          });
        }
      });
      return;
    }

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

    // Check for incomplete deliverables if a service is selected
    if (incomeForm.serviceId) {
      const selectedClient = clients.find(c => c.id === incomeForm.clientId);
      const selectedService = selectedClient?.services.find(s => s.id === incomeForm.serviceId);
      
      if (selectedService && selectedService.deliverables && selectedService.deliverables.length > 0) {
        const incompleteDeliverables = selectedService.deliverables.filter((d: any) => d.completed < d.target);
        
        if (incompleteDeliverables.length > 0) {
          const confirmMessage = language === "ar" 
            ? `تنبيه: هذه الخدمة تحتوي على ${incompleteDeliverables.length} تسليمات غير مكتملة. هل أنت متأكد من تسجيل الدفعة؟` 
            : `Warning: This service has ${incompleteDeliverables.length} incomplete deliverables. Are you sure you want to record payment?`;
            
          if (!window.confirm(confirmMessage)) {
            return;
          }
        }
      }
    }

    const { year, month } = getMonthYearFromDate(incomeForm.date);
    const payload = {
      clientId: incomeForm.clientId,
      serviceId: incomeForm.serviceId || null,
      amount: Math.round(Number(incomeForm.amount)),
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
      amount: Math.round(Number(expenseForm.amount)),
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
    const paymentPeriod = filterPeriod === "specific-month"
      ? `${selectedYear}-${selectedMonthNum.toString().padStart(2, "0")}`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const payload = {
      employeeId: paymentModalEmployee,
      amount: Math.round(Number(payrollForm.amount)),
      currency: payrollForm.currency,
      paymentDate: editingPayrollPayment?.paymentDate || today,
      period: paymentPeriod,
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
      amount: Math.round(Number(transactionEditForm.amount)),
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
  const transactionsById = useMemo(() => new Map(transactionsData.map((tx) => [tx.id, tx])), [transactionsData]);
  const clientPaymentsById = useMemo(() => new Map(clientPaymentsData.map((payment) => [payment.id, payment])), [clientPaymentsData]);
  const payrollPaymentsById = useMemo(() => new Map(payrollPaymentsData.map((payment) => [payment.id, payment])), [payrollPaymentsData]);
  const allServices = useMemo(
    () => clients.flatMap((client) => (Array.isArray(client.services) ? client.services : [])),
    [clients]
  );

  const payrollData = financePayrollReport;

  const selectedEmployeePayroll = useMemo(() => {
    if (!selectedPayrollEmployee) return null;
    const item = payrollData.find((entry) => entry.employeeId === selectedPayrollEmployee);
    return item ? { ...item, paidThisMonth: item.paidThisPeriod } : null;
  }, [selectedPayrollEmployee, payrollData]);

  const clientFinanceData = financeClientReport;

   const overviewTotals = useMemo(() => {
     if (financeSummary) {
       return {
         totalIncome: financeSummary.totalIncome,
         totalExpenses: financeSummary.totalExpenses,
         netProfit: financeSummary.netProfit,
         overdueAmount: financeSummary.overdueAmount,
         payrollRemaining: financeSummary.payrollRemaining,
         expectedRevenue: financeSummary.expectedRevenue,
         servicesBreakdown: financeSummary.servicesBreakdown || [],
       };
     }

     const totalIncome = financeLedger
       .filter((entry) => entry.type === "income")
       .reduce((sum, entry) => sum + entry.convertedAmount, 0);
     const totalExpenses = financeLedger
       .filter((entry) => entry.type === "expense")
       .reduce((sum, entry) => sum + entry.convertedAmount, 0);

     return {
       totalIncome,
       totalExpenses,
       netProfit: totalIncome - totalExpenses,
       overdueAmount: 0,
       payrollRemaining: 0,
       expectedRevenue: 0,
       servicesBreakdown: [],
     };
    }, [financeSummary, financeLedger]);

   const filteredRevenues = useMemo(() => {
     return financeLedger
       .filter((entry) => {
         if (entry.type !== "income") return false;
         if (revenueTypeFilter === "client_payment" && entry.source !== "client_payment") return false;
         if (revenueTypeFilter === "transaction" && entry.source !== "transaction") return false;
         if (revenueClientFilter !== "all" && entry.clientId !== revenueClientFilter) return false;
         if (revenueServiceFilter !== "all" && entry.serviceId !== revenueServiceFilter) return false;
         if (revenueCurrencyFilter !== "all" && entry.currency !== revenueCurrencyFilter) return false;
         return true;
       })
       .map((entry) => ({
         id: entry.id,
         recordId: entry.recordId,
         source: entry.source,
         canEdit: entry.canEdit,
         canDelete: entry.canDelete,
         lockedReason: entry.lockedReason,
         clientName: getClientName(entry.clientId),
         serviceName: getServiceName(entry.serviceId),
         originalAmount: entry.amount,
         originalCurrency: entry.currency as Currency,
         convertedAmount: entry.convertedAmount,
         date: entry.date,
       }));
   }, [financeLedger, revenueTypeFilter, revenueClientFilter, revenueServiceFilter, revenueCurrencyFilter]);

   const filteredExpenses = useMemo(() => {
     return financeLedger
       .filter((entry) => {
         if (entry.type !== "expense") return false;
         if (expenseCategoryFilter !== "all" && entry.category !== expenseCategoryFilter) return false;
         if (expenseClientFilter !== "all" && entry.clientId !== expenseClientFilter) return false;
         if (expenseServiceFilter !== "all" && entry.serviceId !== expenseServiceFilter) return false;
         if (expenseCurrencyFilter !== "all" && entry.currency !== expenseCurrencyFilter) return false;
         return true;
       })
       .map((entry) => ({
         id: entry.id,
         recordId: entry.recordId,
         source: entry.source,
         canEdit: entry.canEdit,
         canDelete: entry.canDelete,
         lockedReason: entry.lockedReason,
         category: entry.category || "other",
         employeeName: entry.employeeId ? getEmployeeName(entry.employeeId) : "-",
         description: entry.description || "-",
         originalAmount: entry.amount,
         originalCurrency: entry.currency as Currency,
         convertedAmount: entry.convertedAmount,
         date: entry.date,
       }));
   }, [financeLedger, expenseCategoryFilter, expenseClientFilter, expenseServiceFilter, expenseCurrencyFilter]);

   const filteredPayrollData = useMemo(() => {
     return payrollData
       .filter(item => {
         if (payrollEmployeeFilter !== "all" && item.employeeId !== payrollEmployeeFilter) return false;
         if (payrollPayTypeFilter !== "all" && item.payType !== payrollPayTypeFilter) return false;
         if (payrollCurrencyFilter !== "all" && item.salaryCurrency !== payrollCurrencyFilter) return false;
         return true;
       })
       .map(item => {
         const employee = employees.find((emp) => emp.id === item.employeeId);
         if (!employee) return null;
         return {
         employee,
         payType: item.payType,
         salaryCurrency: item.salaryCurrency,
         monthlyAmount: item.monthlyAmount,
         rateAmount: item.rateAmount,
         rateUnitsCount: item.rateUnitsCount,
         paidThisMonth: item.paidThisPeriod,
         remaining: item.remaining,
         expectedSalary: item.expectedSalary,
         payments: item.payments,
       };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
   }, [payrollData, payrollEmployeeFilter, payrollPayTypeFilter, payrollCurrencyFilter, employees]);

   const filteredLedger = useMemo(() => {
     return financeLedger
       .filter((entry) => {
         if (ledgerTypeFilter !== "all" && entry.type !== ledgerTypeFilter) return false;
         if (ledgerCategoryFilter !== "all" && entry.category !== ledgerCategoryFilter) return false;
         if (ledgerClientFilter !== "all" && entry.clientId !== ledgerClientFilter) return false;
         if (ledgerEmployeeFilter !== "all" && entry.employeeId !== ledgerEmployeeFilter) return false;
         if (ledgerCurrencyFilter !== "all" && entry.currency !== ledgerCurrencyFilter) return false;
         return true;
       })
       .map((entry) => ({
         ...entry,
         linkedEntity: entry.employeeId
           ? getEmployeeName(entry.employeeId)
           : entry.serviceId
             ? getServiceName(entry.serviceId)
             : entry.clientId
               ? getClientName(entry.clientId)
               : "-",
       }));
   }, [financeLedger, ledgerTypeFilter, ledgerCategoryFilter, ledgerClientFilter, ledgerEmployeeFilter, ledgerCurrencyFilter]);

   const ledgerCategoryOptions = useMemo(() => {
     return Array.from(new Set(financeLedger.map((entry) => entry.category).filter(Boolean)))
       .sort((a, b) => a.localeCompare(b))
       .map((category) => ({
         value: category,
         label: getCategoryLabel(category),
       }));
   }, [financeLedger, language]);

   const filteredClientFinanceData = useMemo(() => {
     return clientFinanceData
       .filter(item => {
         if (clientFinanceClientFilter !== "all" && item.clientId !== clientFinanceClientFilter) return false;
         if (clientFinanceStatusFilter === "overdue" && !item.isOverdue) return false;
         if (clientFinanceStatusFilter === "paid" && (item.isOverdue || item.due > 0 || item.expectedOneTime > 0)) return false;
         return true;
       })
       .map(item => {
         const client = clients.find((entry) => entry.id === item.clientId);
         if (!client) return null;
         return {
         client,
         expectedMonthly: item.expectedMonthly,
         expectedOneTime: item.expectedOneTime,
         paidThisMonth: item.paidThisPeriod,
         due: item.due,
         isOverdue: item.isOverdue,
         isSettled: item.due <= 0 && item.expectedOneTime <= 0,
         services: Array.isArray(client.services) ? client.services : [],
         payments: item.payments,
       };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }, [clientFinanceData, clientFinanceClientFilter, clientFinanceStatusFilter, clients]);

   const overviewRevenueByPackage = useMemo(() => {
     const normalizedPackages = mainPackages.map((pkg) => ({
       ...pkg,
       normalizedId: normalizeFinanceLabel(pkg.id),
       normalizedName: normalizeFinanceLabel(pkg.name),
       normalizedNameEn: normalizeFinanceLabel(pkg.nameEn),
     }));

     const baseItems = (financeSummary?.servicesBreakdown || [])
       .map((item, index) => {
         const normalizedArabicName = normalizeFinanceLabel(item.packageNameAr);
         const normalizedEnglishName = normalizeFinanceLabel(item.packageName);
         const matchedPackage = normalizedPackages.find((pkg) =>
           pkg.normalizedName === normalizedArabicName
           || pkg.normalizedNameEn === normalizedEnglishName
           || pkg.normalizedName === normalizedEnglishName
           || pkg.normalizedNameEn === normalizedArabicName
           || normalizedArabicName.includes(pkg.normalizedName)
           || normalizedEnglishName.includes(pkg.normalizedNameEn)
         );

         return {
           key: matchedPackage?.id || `package-${index}`,
           name: item.packageName,
           nameAr: item.packageNameAr,
           value: item.revenue,
           color: matchedPackage?.id
             ? PACKAGE_COLORS[matchedPackage.id] || CHART_PALETTE[index % CHART_PALETTE.length]
             : CHART_PALETTE[index % CHART_PALETTE.length],
         };
       })
       .filter((item) => item.value > 0)
       .sort((a, b) => b.value - a.value);

     const total = baseItems.reduce((sum, item) => sum + item.value, 0);
     return baseItems.map((item) => ({
       ...item,
       share: total > 0 ? (item.value / total) * 100 : 0,
     }));
   }, [financeSummary, mainPackages]);

    const overviewExpenseByCategory = useMemo(() => {
     const categoryIcons: Record<string, string> = {
       salaries: "hsl(38, 92%, 50%)",
       ads: "hsl(217, 91%, 55%)",
       tools: "hsl(280, 65%, 60%)",
       subscriptions: "hsl(172, 66%, 50%)",
       refunds: "hsl(0, 84%, 60%)",
       rent: "hsl(262, 83%, 58%)",
       utilities: "hsl(25, 95%, 53%)",
       other: "hsl(0, 0%, 60%)",
     };

     return (financeSummary?.expenseBreakdown || [])
       .map((item) => ({
         key: item.key,
         name: language === "ar" ? item.labelAr : item.label,
         value: item.amount,
         color: categoryIcons[item.key] || "hsl(0, 0%, 60%)",
       }))
       .filter(item => item.value > 0)
       .sort((a, b) => b.value - a.value)
       .map((item, _index, items) => {
         const total = items.reduce((sum, entry) => sum + entry.value, 0);
         return {
           ...item,
           share: total > 0 ? (item.value / total) * 100 : 0,
         };
       });
    }, [financeSummary, language]);

   const selectedClientDetails = useMemo(() => {
    if (!clientDetailsSheet) return null;
    const client = clients.find((entry) => entry.id === clientDetailsSheet);
    const report = clientFinanceData.find((entry) => entry.clientId === clientDetailsSheet);
    if (!client || !report) return null;
    return {
      client,
      services: Array.isArray(client.services) ? client.services : [],
      payments: report.payments,
    };
  }, [clientDetailsSheet, clientFinanceData, clients]);

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
      incomeType: "client_payment",
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
    <div className="mx-auto max-w-[1600px] space-y-6 overflow-x-hidden p-4 md:p-6">
      <section className="rounded-[28px] border border-border/60 bg-gradient-to-br from-primary/10 via-background to-purple-500/5 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {language === "ar" ? "لوحة مالية موحدة وحديثة" : "Modern unified finance workspace"}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {language === "ar"
                  ? "متابعة الإيرادات والمصروفات والرواتب ومالية العملاء من مصدر موحد، مع رسوم أوضح وفلاتر أسهل في الاستخدام."
                  : "Track revenue, expenses, payroll, and client finance from one source of truth with clearer charts and cleaner filters."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <HasPermission permission="finance:create">
              <Button className="shadow-sm" onClick={() => setIncomeModalOpen(true)} data-testid="button-add-income">
                <TrendingUp className="h-4 w-4 me-2" />
                {t.addIncome}
              </Button>
            </HasPermission>
            <HasPermission permission="finance:create">
              <Button variant="outline" className="bg-background/80 shadow-sm" onClick={() => setExpenseModalOpen(true)} data-testid="button-add-expense">
                <TrendingDown className="h-4 w-4 me-2" />
                {t.addExpense}
              </Button>
            </HasPermission>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-border/60 bg-background/80 p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium">
              <Filter className="h-4 w-4 text-primary" />
              {language === "ar" ? "الفترة الزمنية" : "Time range"}
            </div>

            <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v)}>
              <SelectTrigger className="w-[170px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === "ar" ? "كل الأوقات" : "All Time"}
                </SelectItem>
                <SelectItem value="specific-month">
                  {language === "ar" ? "شهر محدد" : "Specific Month"}
                </SelectItem>
                <SelectItem value="specific-year">
                  {language === "ar" ? "سنة محددة" : "Specific Year"}
                </SelectItem>
              </SelectContent>
            </Select>

            {filterPeriod === "specific-month" && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-2 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousMonth}
                  data-testid="button-prev-month"
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-0 rotate-180" />
                </Button>
                <Select
                  value={String(selectedMonthNum)}
                  onValueChange={(monthStr) => {
                    const month = Number(monthStr);
                    setSelectedMonth(`${selectedYear}-${String(month).padStart(2, "0")}`);
                  }}
                >
                  <SelectTrigger className="w-[140px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {MONTH_NAMES[language][i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(yearStr) => {
                    setSelectedMonth(`${yearStr}-${String(selectedMonthNum).padStart(2, "0")}`);
                  }}
                >
                  <SelectTrigger className="w-[110px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {Array.from({ length: 10 }, (_, i) => {
                      const y = now.getFullYear() - 5 + i;
                      return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  data-testid="button-next-month"
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-0 rotate-180" />
                </Button>
                <div className="rounded-xl bg-background px-3 py-2 text-sm font-medium text-foreground" data-testid="text-selected-month">
                  {formatMonthDisplay()}
                </div>
              </div>
            )}

            {filterPeriod === "specific-year" && (
              <Select
                value={String(selectedFilterYear)}
                onValueChange={(yearStr) => setSelectedFilterYear(Number(yearStr))}
              >
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {Array.from({ length: 10 }, (_, i) => {
                    const y = now.getFullYear() - 5 + i;
                    return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-border/60 bg-muted/30 p-2">
          <TabsTrigger value="overview" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-overview">
            <DollarSign className="h-4 w-4 me-1 hidden sm:inline" />
            {t.overview}
          </TabsTrigger>
          <TabsTrigger value="revenues" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-revenues">
            <TrendingUp className="h-4 w-4 me-1 hidden sm:inline" />
            {t.revenues}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-expenses">
            <TrendingDown className="h-4 w-4 me-1 hidden sm:inline" />
            {t.expenses}
          </TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-payroll">
            <Wallet className="h-4 w-4 me-1 hidden sm:inline" />
            {t.payroll}
          </TabsTrigger>
          <TabsTrigger value="client-finance" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-client-finance">
            <Users className="h-4 w-4 me-1 hidden sm:inline" />
            {t.clientFinance}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-ledger">
            <FileText className="h-4 w-4 me-1 hidden sm:inline" />
            {t.ledger}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Card className={PANEL_CARD_CLASS}>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {language === "ar" ? "كل الإيرادات المحسوبة من السجل الموحد" : "All income from the unified ledger"}
                </p>
              </CardContent>
            </Card>

            <Card className={PANEL_CARD_CLASS}>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {language === "ar" ? "تشمل الرواتب والمصروفات التشغيلية" : "Includes payroll and operating expenses"}
                </p>
              </CardContent>
            </Card>

            <Card className={PANEL_CARD_CLASS}>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {language === "ar" ? "صافي الفرق بين الإيراد والمصروف" : "Net difference between income and expense"}
                </p>
              </CardContent>
            </Card>

            <Card className={PANEL_CARD_CLASS}>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {language === "ar" ? "إجمالي المستحقات المتأخرة على العملاء" : "Total overdue client receivables"}
                </p>
              </CardContent>
            </Card>

            <Card className={PANEL_CARD_CLASS}>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {language === "ar" ? "المتبقي صرفه للموظفين في الفترة المحددة" : "Remaining payroll in the selected period"}
                </p>
              </CardContent>
            </Card>

            <Card className={PANEL_CARD_CLASS}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.expectedRevenue}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(overviewTotals.expectedRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "من الخدمات المنجزة غير المدفوعة" : "From completed unpaid services"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className={PANEL_CARD_CLASS}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {language === "ar" ? "الإيرادات حسب الباقة" : "Revenue by Package"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "توزيع أوضح للإيرادات مع نسب كل باقة." : "Clearer package revenue distribution with share percentages."}
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  <BarChart3 className="me-1 h-3.5 w-3.5" />
                  {overviewRevenueByPackage.length}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex justify-center">
                  <div className="h-[300px] w-full max-w-[460px] sm:h-[340px] lg:h-[380px]">
                  {overviewRevenueByPackage.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overviewRevenueByPackage}
                          cx="50%"
                          cy="50%"
                          innerRadius="52%"
                          outerRadius="82%"
                          paddingAngle={4}
                          cornerRadius={10}
                          dataKey="value"
                          labelLine={false}
                        >
                          {overviewRevenueByPackage.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={4} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number, _name, item: any) => [
                            formatCurrency(Number(value)),
                            item?.payload?.nameAr || item?.payload?.name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {t.noTransactions}
                    </div>
                  )}
                </div>
                </div>
                <div className="grid auto-rows-max gap-3 2xl:max-h-[380px] 2xl:overflow-y-auto 2xl:pe-1">
                  {overviewRevenueByPackage.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <div className="min-w-0">
                            <p className="break-words font-medium">{language === "ar" ? item.nameAr || item.name : item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.share.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right font-semibold">{formatCurrency(item.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={PANEL_CARD_CLASS}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {language === "ar" ? "المصروفات حسب الفئة" : "Expenses by Category"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "عرض أدق للفئات الأعلى صرفًا خلال الفترة." : "A clearer view of the highest spending categories."}
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {overviewExpenseByCategory.length}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex justify-center">
                  <div className="h-[300px] w-full max-w-[460px] sm:h-[340px] lg:h-[380px]">
                  {overviewExpenseByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overviewExpenseByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius="52%"
                          outerRadius="82%"
                          paddingAngle={4}
                          cornerRadius={10}
                          dataKey="value"
                          labelLine={false}
                        >
                          {overviewExpenseByCategory.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={4} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number, _name, item: any) => [
                            formatCurrency(Number(value)),
                            item?.payload?.name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {t.noTransactions}
                    </div>
                  )}
                </div>
                </div>
                <div className="grid auto-rows-max gap-3 2xl:max-h-[380px] 2xl:overflow-y-auto 2xl:pe-1">
                  {overviewExpenseByCategory.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <div className="min-w-0">
                            <p className="break-words font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.share.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right font-semibold">{formatCurrency(item.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenues Tab */}
        <TabsContent value="revenues">
          <Card className={PANEL_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="space-y-1">
                <CardTitle>{t.revenues}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "عرض تفصيلي للإيرادات مع فلاتر أوضح وإجمالي مباشر." : "Detailed revenue view with cleaner filters and direct totals."}
                </p>
              </div>
              <HasPermission permission="finance:create">
                <Button size="sm" onClick={() => setIncomeModalOpen(true)} data-testid="button-add-income-tab">
                  <Plus className="h-4 w-4 me-1" />
                  {t.addIncome}
                </Button>
              </HasPermission>
            </CardHeader>
            <CardContent>
              <div className={`${FILTER_BAR_CLASS} mb-4`}>
                <Select value={revenueTypeFilter} onValueChange={setRevenueTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={t.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.type}</SelectItem>
                    <SelectItem value="client_payment">{t.clientPayment}</SelectItem>
                    <SelectItem value="transaction">{t.directTransaction}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={revenueClientFilter} onValueChange={setRevenueClientFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.client} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={revenueServiceFilter} onValueChange={setRevenueServiceFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.service} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {allServices.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {language === "ar" ? service.serviceName : service.serviceNameEn || service.serviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={revenueCurrencyFilter} onValueChange={setRevenueCurrencyFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" className="ms-auto" onClick={resetRevenueFilters}>
                  {language === "ar" ? "إعادة ضبط الفلاتر" : "Reset Filters"}
                </Button>
              </div>
              {filteredRevenues.length === 0 ? (
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
                    {filteredRevenues.map(item => {
                      const isClientPayment = item.source === "client_payment";
                      const directTransaction = transactionsById.get(item.recordId);
                      const clientPayment = clientPaymentsById.get(item.recordId);
                      return (
                        <TableRow key={item.id} data-testid={`row-income-${item.id}`}>
                          <TableCell>{item.clientName}</TableCell>
                          <TableCell>{item.serviceName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatCurrency(item.originalAmount, item.originalCurrency)}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(item.convertedAmount)}
                          </TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>
                            <HasPermission permission="finance:edit">
                            <div className="flex gap-1">
                              {isClientPayment ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => clientPayment && openClientPaymentEdit(clientPayment)}
                                    disabled={!item.canEdit || !clientPayment}
                                    title={item.lockedReason || undefined}
                                    data-testid={`button-edit-payment-${item.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => clientPayment && confirmDelete(() => deleteClientPaymentMutation.mutate(clientPayment.id))}
                                    disabled={!item.canDelete || !clientPayment}
                                    title={item.lockedReason || undefined}
                                    data-testid={`button-delete-payment-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => directTransaction && openTransactionEdit(directTransaction)}
                                    disabled={!item.canEdit || !directTransaction}
                                    title={item.lockedReason || undefined}
                                    data-testid={`button-edit-transaction-${item.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => directTransaction && confirmDelete(() => deleteTransactionMutation.mutate(directTransaction.id))}
                                    disabled={!item.canDelete || !directTransaction}
                                    title={item.lockedReason || undefined}
                                    data-testid={`button-delete-transaction-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                            </div>
                            </HasPermission>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={3} className="text-right">{language === "ar" ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(filteredRevenues.reduce((sum, item) => sum + item.convertedAmount, 0))}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card className={PANEL_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="space-y-1">
                <CardTitle>{t.expenses}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "فصل أوضح للمصروفات حسب الفئة والعملة والجهة المرتبطة." : "A clearer expense breakdown by category, currency, and linked entities."}
                </p>
              </div>
              <HasPermission permission="finance:create">
                <Button size="sm" onClick={() => setExpenseModalOpen(true)} data-testid="button-add-expense-tab">
                  <Plus className="h-4 w-4 me-1" />
                  {t.addExpense}
                </Button>
              </HasPermission>
            </CardHeader>
            <CardContent>
              <div className={`${FILTER_BAR_CLASS} mb-4`}>
                <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.category} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.category}</SelectItem>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {language === "ar" ? cat.labelAr : cat.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={expenseClientFilter} onValueChange={setExpenseClientFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.client} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={expenseServiceFilter} onValueChange={setExpenseServiceFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.service} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {allServices.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {language === "ar" ? service.serviceName : service.serviceNameEn || service.serviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={expenseCurrencyFilter} onValueChange={setExpenseCurrencyFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" className="ms-auto" onClick={resetExpenseFilters}>
                  {language === "ar" ? "إعادة ضبط الفلاتر" : "Reset Filters"}
                </Button>
              </div>
              {filteredExpenses.length === 0 ? (
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
                    {filteredExpenses.map(tx => (
                      <TableRow key={tx.id} data-testid={`row-expense-${tx.id}`}>
                        <TableCell>
                          <Badge variant="secondary">{getCategoryLabel(tx.category)}</Badge>
                        </TableCell>
                        <TableCell>{tx.employeeName}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatCurrency(tx.originalAmount, tx.originalCurrency)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                        {formatCurrency(tx.convertedAmount)}
                      </TableCell>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>
                          <HasPermission permission="finance:edit">
                          <div className="flex gap-1">
                            {(() => {
                              const directTransaction = transactionsById.get(tx.recordId);
                              const payrollPayment = payrollPaymentsById.get(tx.recordId);
                              return (
                                <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (tx.source === "payroll_payment") {
                                  payrollPayment && openPayrollPaymentEdit(payrollPayment);
                                  return;
                                }
                                directTransaction && openExpenseEdit(directTransaction);
                              }}
                              disabled={!tx.canEdit || (tx.source === "payroll_payment" ? !payrollPayment : !directTransaction)}
                              title={tx.lockedReason || undefined}
                              data-testid={`button-edit-expense-${tx.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                confirmDelete(() => {
                                  if (tx.source === "payroll_payment" && payrollPayment) {
                                    deletePayrollPaymentMutation.mutate(payrollPayment.id);
                                  } else if (directTransaction) {
                                    deleteTransactionMutation.mutate(directTransaction.id);
                                  }
                                });
                              }}
                              disabled={!tx.canDelete || (tx.source === "payroll_payment" ? !payrollPayment : !directTransaction)}
                              title={tx.lockedReason || undefined}
                              data-testid={`button-delete-expense-${tx.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                                </>
                              );
                            })()}
                          </div>
                          </HasPermission>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={3} className="text-right">{language === "ar" ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell colSpan={1}></TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(filteredExpenses.reduce((sum, tx) => sum + tx.convertedAmount, 0))}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
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
            <Card className={`lg:col-span-1 ${PANEL_CARD_CLASS}`}>
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
                      const empData = payrollData.find(p => p.employeeId === emp.id);
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
            <Card className={`lg:col-span-2 ${PANEL_CARD_CLASS}`}>
              <CardHeader>
                <CardTitle>
                  {selectedPayrollEmployee 
                    ? getEmployeeName(selectedPayrollEmployee)
                    : t.allEmployees
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPayrollEmployee && selectedEmployeePayroll && (
                  <>
                    {/* Single employee details */}
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
                                  <HasPermission permission="finance:edit">
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
                                  </HasPermission>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    </div>
                  </>
                )}
                {(!selectedPayrollEmployee || !selectedEmployeePayroll) && (
                  <>
                    {/* All employees table */}
                    <div className={`${FILTER_BAR_CLASS} mb-4`}>
                    <Select value={payrollEmployeeFilter} onValueChange={setPayrollEmployeeFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t.employee} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {language === "ar" ? emp.name : emp.nameEn || emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={payrollPayTypeFilter} onValueChange={setPayrollPayTypeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder={t.payType} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.payType}</SelectItem>
                        <SelectItem value="monthly">{t.monthly}</SelectItem>
                        <SelectItem value="per_project">{t.perProject}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={payrollCurrencyFilter} onValueChange={setPayrollCurrencyFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                        {CURRENCIES.map(curr => (
                          <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" className="ms-auto" onClick={resetPayrollFilters}>
                      {language === "ar" ? "إعادة ضبط الفلاتر" : "Reset Filters"}
                    </Button>
                  </div>
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
                      {filteredPayrollData.map(({ employee, payType, monthlyAmount, rateAmount, salaryCurrency, rateUnitsCount, paidThisMonth, remaining }) => (
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
                              <HasPermission permission="finance:create">
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
                              </HasPermission>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={3} className="text-right">{language === "ar" ? "الإجمالي" : "Total"}</TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(filteredPayrollData.reduce((sum, item) => sum + item.paidThisMonth, 0))}
                        </TableCell>
                        <TableCell className={filteredPayrollData.reduce((sum, item) => sum + item.remaining, 0) > 0 ? "text-orange-600" : "text-green-600"}>
                          {formatCurrency(filteredPayrollData.reduce((sum, item) => sum + item.remaining, 0))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Client Finance Tab - Enhanced with service details */}
        <TabsContent value="client-finance">
          <Card className={PANEL_CARD_CLASS}>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle>{t.clientFinance}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "متابعة المبالغ المتوقعة والمدفوعة والمتأخرة لكل عميل." : "Track expected, paid, and overdue amounts for each client."}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${FILTER_BAR_CLASS} mb-4`}>
                <Select value={clientFinanceClientFilter} onValueChange={setClientFinanceClientFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t.client} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={clientFinanceStatusFilter} onValueChange={setClientFinanceStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.status}</SelectItem>
                    <SelectItem value="overdue">{t.overdue}</SelectItem>
                    <SelectItem value="paid">{t.paid}</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" className="ms-auto" onClick={resetClientFinanceFilters}>
                  {language === "ar" ? "إعادة ضبط الفلاتر" : "Reset Filters"}
                </Button>
              </div>
              {filteredClientFinanceData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t.noClients}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.client}</TableHead>
                      <TableHead>{t.expectedMonthly}</TableHead>
                      <TableHead>{language === "ar" ? "خدمات منجزة" : "Completed"}</TableHead>
                      <TableHead>{t.paidMonthly}</TableHead>
                      <TableHead>{t.due}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientFinanceData.map(({ client, expectedMonthly, expectedOneTime, paidThisMonth, due, isOverdue, isSettled, services }) => (
                      <TableRow key={client.id} data-testid={`row-client-finance-${client.id}`}>
                        <TableCell className="font-medium">
                          {client.name}
                        </TableCell>
                        <TableCell>{formatCurrency(expectedMonthly)}</TableCell>
                        <TableCell className="text-purple-600">{formatCurrency(expectedOneTime)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(paidThisMonth)}</TableCell>
                        <TableCell className={due > 0 ? "text-orange-600" : "text-green-600"}>
                          {formatCurrency(due)}
                        </TableCell>
                        <TableCell>
                          {isOverdue ? (
                            <Badge variant="destructive">{t.overdue}</Badge>
                          ) : isSettled ? (
                            <Badge variant="secondary">{t.paid}</Badge>
                          ) : (
                            <Badge variant="outline">
                              {language === "ar" ? "قيد التحصيل" : "Outstanding"}
                            </Badge>
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
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={3} className="text-right">{language === "ar" ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(filteredClientFinanceData.reduce((sum, item) => sum + item.paidThisMonth, 0))}
                      </TableCell>
                      <TableCell className={filteredClientFinanceData.reduce((sum, item) => sum + item.due, 0) > 0 ? "text-orange-600" : "text-green-600"}>
                        {formatCurrency(filteredClientFinanceData.reduce((sum, item) => sum + item.due, 0))}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Ledger Tab */}
        <TabsContent value="ledger">
          <Card className={PANEL_CARD_CLASS}>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle>{t.ledger}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "السجل المالي الموحد لكل المعاملات والمصادر المشتقة." : "Unified financial ledger for all direct and derived transactions."}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${FILTER_BAR_CLASS} mb-4`}>
                <Select value={ledgerTypeFilter} onValueChange={setLedgerTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.type}</SelectItem>
                    <SelectItem value="income">{t.income}</SelectItem>
                    <SelectItem value="expense">{t.expense}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ledgerCategoryFilter} onValueChange={setLedgerCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.category} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.category}</SelectItem>
                    {ledgerCategoryOptions.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ledgerClientFilter} onValueChange={setLedgerClientFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.linkedClient} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ledgerEmployeeFilter} onValueChange={setLedgerEmployeeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.employee} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {language === "ar" ? emp.name : emp.nameEn || emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ledgerCurrencyFilter} onValueChange={setLedgerCurrencyFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" className="ms-auto" onClick={resetLedgerFilters}>
                  {language === "ar" ? "إعادة ضبط الفلاتر" : "Reset Filters"}
                </Button>
              </div>
              {filteredLedger.length === 0 ? (
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
                    {filteredLedger.map(tx => (
                      <TableRow key={tx.id} data-testid={`row-ledger-${tx.id}`}>
                        <TableCell>
                          <Badge variant={tx.type === "income" ? "default" : "destructive"}>
                            {tx.type === "income" ? t.income : t.expense}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.category ? getCategoryLabel(tx.category) : "-"}</TableCell>
                        <TableCell>
                          {tx.linkedEntity}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatCurrency(tx.amount, tx.currency as Currency)}</Badge>
                        </TableCell>
                        <TableCell className={`font-medium ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.convertedAmount)}
                        </TableCell>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(() => {
                              const directTransaction = transactionsById.get(tx.recordId);
                              const clientPayment = clientPaymentsById.get(tx.recordId);
                              const payrollPayment = payrollPaymentsById.get(tx.recordId);
                              return (
                                <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (tx.source === "client_payment" && clientPayment) {
                                  openClientPaymentEdit(clientPayment);
                                } else if (tx.source === "payroll_payment" && payrollPayment) {
                                  openPayrollPaymentEdit(payrollPayment);
                                } else if (directTransaction) {
                                  openTransactionEdit(directTransaction);
                                }
                              }}
                              disabled={!tx.canEdit || (tx.source === "client_payment" ? !clientPayment : tx.source === "payroll_payment" ? !payrollPayment : !directTransaction)}
                              title={tx.lockedReason || undefined}
                              data-testid={`button-edit-ledger-${tx.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                confirmDelete(() => {
                                  if (tx.source === "client_payment" && clientPayment) {
                                    deleteClientPaymentMutation.mutate(clientPayment.id);
                                  } else if (tx.source === "payroll_payment" && payrollPayment) {
                                    deletePayrollPaymentMutation.mutate(payrollPayment.id);
                                  } else if (directTransaction) {
                                    deleteTransactionMutation.mutate(directTransaction.id);
                                  }
                                });
                              }}
                              disabled={!tx.canDelete || (tx.source === "client_payment" ? !clientPayment : tx.source === "payroll_payment" ? !payrollPayment : !directTransaction)}
                              title={tx.lockedReason || undefined}
                              data-testid={`button-delete-ledger-${tx.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={3} className="text-right">{language === "ar" ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell colSpan={1}></TableCell>
                      <TableCell className={filteredLedger.reduce((sum, tx) => sum + (tx.type === "income" ? tx.convertedAmount : -tx.convertedAmount), 0) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(filteredLedger.reduce((sum, tx) => sum + (tx.type === "income" ? tx.convertedAmount : -tx.convertedAmount), 0))}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
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
              {language === "ar" ? "سجل إيراد جديد" : "Record a new income"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.incomeType}</Label>
              <Select 
                value={incomeForm.incomeType} 
                onValueChange={(v: "client_payment" | "external") => setIncomeForm({ ...incomeForm, incomeType: v })}
              >
                <SelectTrigger data-testid="select-income-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_payment">{t.clientPayment}</SelectItem>
                  <SelectItem value="external">{t.externalIncome}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {incomeForm.incomeType === "client_payment" && (
              <>
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
              </>
            )}
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
              disabled={createClientPaymentMutation.isPending || updateClientPaymentMutation.isPending || createTransactionMutation.isPending}
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
