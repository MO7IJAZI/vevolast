import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency, type Currency, currencies as contextCurrencies } from "@/contexts/CurrencyContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Users,
  DollarSign,
  Target,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Edit,
  Phone,
  Mail,
  Building2,
  Calendar,
  Medal,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesTarget {
  employeeId: string;
  month: number;
  year: number;
  targetClients: number;
  targetLeads: number;
  targetRevenue: number;
  targetCurrency: Currency;
}

export default function SalesPage() {
  const { isAdmin } = useAuth();
  const { language } = useLanguage();
  const { currency: selectedCurrency, formatCurrency, convertAmount } = useCurrency();
  const { clients, leads, employees, invoices } = useData();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [viewCurrency, setViewCurrency] = useState<Currency | "all">(selectedCurrency);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);

  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([
    { employeeId: "emp-1", month: 1, year: 2026, targetClients: 5, targetLeads: 15, targetRevenue: 25000, targetCurrency: "USD" },
    { employeeId: "emp-2", month: 1, year: 2026, targetClients: 4, targetLeads: 12, targetRevenue: 20000, targetCurrency: "USD" },
    { employeeId: "emp-4", month: 1, year: 2026, targetClients: 3, targetLeads: 10, targetRevenue: 15000, targetCurrency: "USD" },
    { employeeId: "emp-1", month: 12, year: 2025, targetClients: 4, targetLeads: 10, targetRevenue: 20000, targetCurrency: "USD" },
    { employeeId: "emp-2", month: 12, year: 2025, targetClients: 3, targetLeads: 8, targetRevenue: 18000, targetCurrency: "USD" },
    { employeeId: "emp-4", month: 12, year: 2025, targetClients: 2, targetLeads: 6, targetRevenue: 12000, targetCurrency: "USD" },
  ]);

  const [targetForm, setTargetForm] = useState<SalesTarget>({
    employeeId: "",
    month: selectedMonth,
    year: selectedYear,
    targetClients: 0,
    targetLeads: 0,
    targetRevenue: 0,
    targetCurrency: "USD",
  });

  const t = useMemo(() => ({
    title: language === "ar" ? "المبيعات" : "Sales",
    subtitle: language === "ar" ? "تتبع أداء فريق المبيعات والترتيب الشهري" : "Track sales team performance and monthly rankings",
    thisMonth: language === "ar" ? "هذا الشهر" : "This Month",
    totalRevenue: language === "ar" ? "إجمالي الإيرادات" : "Total Revenue",
    newClients: language === "ar" ? "عملاء جدد" : "New Clients",
    newLeads: language === "ar" ? "عملاء محتملين" : "New Leads",
    conversionRate: language === "ar" ? "نسبة التحويل" : "Conversion Rate",
    leaderboard: language === "ar" ? "ترتيب المبيعات" : "Sales Leaderboard",
    employee: language === "ar" ? "الموظف" : "Employee",
    target: language === "ar" ? "الهدف" : "Target",
    confirmed: language === "ar" ? "مؤكدين" : "Confirmed",
    leadsAssigned: language === "ar" ? "العملاء المحتملين" : "Leads",
    revenue: language === "ar" ? "الإيرادات" : "Revenue",
    conversion: language === "ar" ? "التحويل" : "Conversion",
    rank: language === "ar" ? "الترتيب" : "Rank",
    topSales: language === "ar" ? "أفضل مندوب مبيعات" : "Top Sales",
    setTargets: language === "ar" ? "تحديد الأهداف" : "Set Targets",
    vsLastMonth: language === "ar" ? "مقارنة بالشهر الماضي" : "vs Last Month",
    lastMonth: language === "ar" ? "الشهر الماضي" : "Last Month",
    growth: language === "ar" ? "النمو" : "Growth",
    improved: language === "ar" ? "تحسن" : "Improved",
    declined: language === "ar" ? "تراجع" : "Declined",
    noChange: language === "ar" ? "بدون تغيير" : "No Change",
    details: language === "ar" ? "التفاصيل" : "Details",
    clientsList: language === "ar" ? "قائمة العملاء" : "Clients List",
    leadsList: language === "ar" ? "قائمة العملاء المحتملين" : "Leads List",
    progressToTarget: language === "ar" ? "التقدم نحو الهدف" : "Progress to Target",
    clients: language === "ar" ? "العملاء" : "Clients",
    save: language === "ar" ? "حفظ" : "Save",
    cancel: language === "ar" ? "إلغاء" : "Cancel",
    targetClients: language === "ar" ? "هدف العملاء" : "Target Clients",
    targetLeads: language === "ar" ? "هدف العملاء المحتملين" : "Target Leads",
    targetRevenue: language === "ar" ? "هدف الإيرادات" : "Target Revenue",
    currency: language === "ar" ? "العملة" : "Currency",
    selectEmployee: language === "ar" ? "اختر الموظف" : "Select Employee",
    noSalesEmployees: language === "ar" ? "لا يوجد موظفي مبيعات" : "No sales employees",
    addSalesEmployees: language === "ar" ? "أضف موظفين بدور المبيعات" : "Add employees with sales role",
    monthFilter: language === "ar" ? "الشهر" : "Month",
    yearFilter: language === "ar" ? "السنة" : "Year",
    currencyView: language === "ar" ? "عرض العملة" : "Currency View",
    allCurrencies: language === "ar" ? "جميع العملات" : "All Currencies",
  }), [language]);

  const months = [
    { value: 1, label: language === "ar" ? "يناير" : "January" },
    { value: 2, label: language === "ar" ? "فبراير" : "February" },
    { value: 3, label: language === "ar" ? "مارس" : "March" },
    { value: 4, label: language === "ar" ? "أبريل" : "April" },
    { value: 5, label: language === "ar" ? "مايو" : "May" },
    { value: 6, label: language === "ar" ? "يونيو" : "June" },
    { value: 7, label: language === "ar" ? "يوليو" : "July" },
    { value: 8, label: language === "ar" ? "أغسطس" : "August" },
    { value: 9, label: language === "ar" ? "سبتمبر" : "September" },
    { value: 10, label: language === "ar" ? "أكتوبر" : "October" },
    { value: 11, label: language === "ar" ? "نوفمبر" : "November" },
    { value: 12, label: language === "ar" ? "ديسمبر" : "December" },
  ];

  const years = [2024, 2025, 2026, 2027];

  const salesEmployees = useMemo(() => {
    return employees.filter(e => e.department === "sales" && e.isActive);
  }, [employees]);

  const getEmployeeName = (employeeId: string | undefined) => {
    if (!employeeId) return "";
    const emp = employees.find(e => e.id === employeeId);
    return emp ? (language === "ar" ? emp.name : (emp.nameEn || emp.name)) : "";
  };

  const isInMonth = (dateStr: string, month: number, year: number) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  };

  const activeCurrency = viewCurrency === "all" ? selectedCurrency : viewCurrency;

  useEffect(() => {
    if (viewCurrency !== "all" && viewCurrency !== selectedCurrency) {
      setViewCurrency(selectedCurrency);
    }
  }, [selectedCurrency, viewCurrency]);

  const getEmployeeStats = useMemo(() => {
    return (employeeId: string, month: number, year: number) => {
      const confirmedClients = clients.filter(c => 
        c.salesOwnerId === employeeId && 
        isInMonth(c.createdAt, month, year) &&
        c.status !== "archived"
      );

      // Get active leads created in this month
      const activeLeads = leads.filter(l => 
        (l.negotiatorId === employeeId) && 
        isInMonth(l.createdAt, month, year)
      );

      // Get converted clients that were leads created in this month
      // This ensures we don't lose stats for converted leads (since they are deleted from leads table)
      const convertedLeads = clients.filter(c => 
        c.salesOwnerId === employeeId && 
        c.convertedFromLeadId && 
        isInMonth(c.leadCreatedAt || c.createdAt, month, year)
      );

      // Total leads = Active Leads + Converted Leads
      const totalLeadsCount = activeLeads.length + convertedLeads.length;

      // Map converted clients to a Lead-compatible structure for the list
      const convertedLeadsAsLeads = convertedLeads.map(c => ({
        ...c,
        stage: "won",
        dealValue: c.services.length > 0 ? c.services[0].price : 0,
        dealCurrency: c.services.length > 0 ? c.services[0].currency : "USD",
      }));

      const totalLeadsList = [...activeLeads, ...convertedLeadsAsLeads]; // Note: types might mismatch if we try to display them together, but for count it's fine

      // Won leads = Active Leads marked 'won' + All Converted Leads
      const activeWonLeads = activeLeads.filter(l => l.stage === "won");
      const totalWonCount = activeWonLeads.length + convertedLeads.length;

      let revenue = 0;
      const revenueByCurrency: Record<string, number> = {};
      Object.keys(contextCurrencies).forEach(curr => {
        revenueByCurrency[curr] = 0;
      });
      
      if (isAdmin) {
        confirmedClients.forEach(client => {
          client.services.forEach(service => {
            if (service.price) {
              const curr = service.currency || "USD";
              if (revenueByCurrency[curr] !== undefined) {
                revenueByCurrency[curr] += service.price;
              }
              revenue += convertAmount(service.price, curr as Currency, activeCurrency);
            }
          });
        });

        const paidInvoices = invoices.filter(inv => 
          inv.status === "paid" && 
          inv.paidDate && 
          isInMonth(inv.paidDate, month, year) &&
          clients.some(c => c.id === inv.clientId && c.salesOwnerId === employeeId)
        );
        paidInvoices.forEach(inv => {
          const curr = inv.currency || "USD";
          if (revenueByCurrency[curr] !== undefined) {
            revenueByCurrency[curr] += inv.amount;
          }
          revenue += convertAmount(inv.amount, curr as Currency, activeCurrency);
        });
      }

      return {
        confirmedClients: confirmedClients.length,
        clients: confirmedClients,
        leads: totalLeadsCount,
        leadsList: totalLeadsList,
        revenue,
        revenueByCurrency,
        conversionRate: totalLeadsCount > 0 
          ? Math.round((totalWonCount / totalLeadsCount) * 100) 
          : 0,
      };
    };
  }, [clients, leads, invoices, viewCurrency, selectedCurrency, convertAmount, activeCurrency]);

  const getEmployeeTarget = (employeeId: string, month: number, year: number): SalesTarget | undefined => {
    return salesTargets.find(t => 
      t.employeeId === employeeId && 
      t.month === month && 
      t.year === year
    );
  };

  const leaderboardData = useMemo(() => {
    const data = salesEmployees.map(emp => {
      const stats = getEmployeeStats(emp.id, selectedMonth, selectedYear);
      const lastMonthStats = getEmployeeStats(
        emp.id, 
        selectedMonth === 1 ? 12 : selectedMonth - 1, 
        selectedMonth === 1 ? selectedYear - 1 : selectedYear
      );
      const target = getEmployeeTarget(emp.id, selectedMonth, selectedYear);

      return {
        employee: emp,
        ...stats,
        lastMonth: lastMonthStats,
        target,
        revenueGrowth: lastMonthStats.revenue > 0 
          ? Math.round(((stats.revenue - lastMonthStats.revenue) / lastMonthStats.revenue) * 100)
          : stats.revenue > 0 ? 100 : 0,
        clientsGrowth: lastMonthStats.confirmedClients > 0
          ? Math.round(((stats.confirmedClients - lastMonthStats.confirmedClients) / lastMonthStats.confirmedClients) * 100)
          : stats.confirmedClients > 0 ? 100 : 0,
      };
    });

    data.sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.confirmedClients !== a.confirmedClients) return b.confirmedClients - a.confirmedClients;
      return b.conversionRate - a.conversionRate;
    });

    return data.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [salesEmployees, selectedMonth, selectedYear, getEmployeeStats, salesTargets]);

  const kpiData = useMemo(() => {
    const totalRevenue = leaderboardData.reduce((sum, d) => sum + d.revenue, 0);
    const totalClients = leaderboardData.reduce((sum, d) => sum + d.confirmedClients, 0);
    const totalLeads = leaderboardData.reduce((sum, d) => sum + d.leads, 0);
    const avgConversion = leaderboardData.length > 0
      ? Math.round(leaderboardData.reduce((sum, d) => sum + d.conversionRate, 0) / leaderboardData.length)
      : 0;

    const lastMonthRevenue = leaderboardData.reduce((sum, d) => sum + d.lastMonth.revenue, 0);
    const lastMonthClients = leaderboardData.reduce((sum, d) => sum + d.lastMonth.confirmedClients, 0);
    const lastMonthLeads = leaderboardData.reduce((sum, d) => sum + d.lastMonth.leads, 0);

    const totalByCurrency: Record<string, number> = {};
    Object.keys(contextCurrencies).forEach(curr => {
      totalByCurrency[curr] = 0;
    });

    leaderboardData.forEach(d => {
      if (d.revenueByCurrency) {
        (Object.keys(d.revenueByCurrency)).forEach(curr => {
          if (totalByCurrency[curr] !== undefined) {
            totalByCurrency[curr] += d.revenueByCurrency[curr];
          }
        });
      }
    });

    return {
      totalRevenue,
      totalClients,
      totalLeads,
      avgConversion,
      totalByCurrency,
      revenueChange: lastMonthRevenue > 0 ? Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0,
      clientsChange: lastMonthClients > 0 ? Math.round(((totalClients - lastMonthClients) / lastMonthClients) * 100) : 0,
      leadsChange: lastMonthLeads > 0 ? Math.round(((totalLeads - lastMonthLeads) / lastMonthLeads) * 100) : 0,
    };
  }, [leaderboardData]);

  const handleSaveTarget = () => {
    if (!targetForm.employeeId) return;

    setSalesTargets(prev => {
      const existing = prev.findIndex(t => 
        t.employeeId === targetForm.employeeId && 
        t.month === targetForm.month && 
        t.year === targetForm.year
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = targetForm;
        return updated;
      }
      return [...prev, targetForm];
    });
    setTargetDialogOpen(false);
    setTargetForm({
      employeeId: "",
      month: selectedMonth,
      year: selectedYear,
      targetClients: 0,
      targetLeads: 0,
      targetRevenue: 0,
      targetCurrency: "USD",
    });
  };

  const openTargetDialog = (employeeId?: string) => {
    const existingTarget = employeeId 
      ? getEmployeeTarget(employeeId, selectedMonth, selectedYear)
      : undefined;

    setTargetForm(existingTarget || {
      employeeId: employeeId || "",
      month: selectedMonth,
      year: selectedYear,
      targetClients: 0,
      targetLeads: 0,
      targetRevenue: 0,
      targetCurrency: "USD",
    });
    setTargetDialogOpen(true);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
          <Trophy className="h-3 w-3 me-1" />
          {t.topSales}
        </Badge>
      );
    }
    if (rank === 2) {
      return (
        <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700">
          <Medal className="h-3 w-3 me-1" />
          2nd
        </Badge>
      );
    }
    if (rank === 3) {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30">
          <Medal className="h-3 w-3 me-1" />
          3rd
        </Badge>
      );
    }
    return <span className="text-muted-foreground">#{rank}</span>;
  };

  const getGrowthIndicator = (growth: number) => {
    if (growth > 0) {
      return (
        <span className="flex items-center text-green-600 dark:text-green-400 text-sm">
          <ArrowUpRight className="h-3 w-3 me-1" />
          +{growth}%
        </span>
      );
    }
    if (growth < 0) {
      return (
        <span className="flex items-center text-red-600 dark:text-red-400 text-sm">
          <ArrowDownRight className="h-3 w-3 me-1" />
          {growth}%
        </span>
      );
    }
    return <span className="text-muted-foreground text-sm">0%</span>;
  };

  if (salesEmployees.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <TrendingUp className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t.noSalesEmployees}</h2>
            <p className="text-muted-foreground text-center max-w-md">{t.addSalesEmployees}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]" data-testid="filter-month">
              <SelectValue placeholder={t.monthFilter} />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]" data-testid="filter-year">
              <SelectValue placeholder={t.yearFilter} />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={viewCurrency} onValueChange={(v) => setViewCurrency(v as Currency | "all")}>
            <SelectTrigger className="w-[120px]" data-testid="filter-currency">
              <SelectValue placeholder={t.currencyView} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allCurrencies}</SelectItem>
              <SelectItem value="TRY">TRY</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="SAR">SAR</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openTargetDialog()} data-testid="button-set-targets">
                <Target className="h-4 w-4 me-2" />
                {t.setTargets}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t.setTargets}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>{t.selectEmployee}</Label>
                  <Select value={targetForm.employeeId} onValueChange={(v) => setTargetForm(prev => ({ ...prev, employeeId: v }))}>
                    <SelectTrigger data-testid="select-target-employee">
                      <SelectValue placeholder={t.selectEmployee} />
                    </SelectTrigger>
                    <SelectContent>
                      {salesEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {language === "ar" ? emp.name : (emp.nameEn || emp.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t.targetClients}</Label>
                    <Input
                      type="number"
                      value={targetForm.targetClients}
                      onChange={(e) => setTargetForm(prev => ({ ...prev, targetClients: parseInt(e.target.value) || 0 }))}
                      data-testid="input-target-clients"
                    />
                  </div>
                  <div>
                    <Label>{t.targetLeads}</Label>
                    <Input
                      type="number"
                      value={targetForm.targetLeads}
                      onChange={(e) => setTargetForm(prev => ({ ...prev, targetLeads: parseInt(e.target.value) || 0 }))}
                      data-testid="input-target-leads"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {isAdmin && (
                    <div>
                      <Label>{t.targetRevenue}</Label>
                      <Input
                        type="number"
                        value={targetForm.targetRevenue}
                        onChange={(e) => setTargetForm(prev => ({ ...prev, targetRevenue: parseInt(e.target.value) || 0 }))}
                        data-testid="input-target-revenue"
                      />
                    </div>
                  )}
                  <div>
                    <Label>{t.currency}</Label>
                    <Select value={targetForm.targetCurrency} onValueChange={(v) => setTargetForm(prev => ({ ...prev, targetCurrency: v as Currency }))}>
                      <SelectTrigger data-testid="select-target-currency">
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
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setTargetDialogOpen(false)}>{t.cancel}</Button>
                  <Button onClick={handleSaveTarget} data-testid="button-save-target">{t.save}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && (
          <Card data-testid="kpi-revenue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">{t.totalRevenue}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(kpiData.totalRevenue, activeCurrency)}
              </div>
              {viewCurrency === "all" && (
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                  {(Object.entries(kpiData.totalByCurrency) as [Currency, number][])
                    .filter(([_, v]) => v > 0)
                    .map(([curr, val]) => (
                      <span key={curr}>{formatCurrency(val, curr)}</span>
                    ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {getGrowthIndicator(kpiData.revenueChange)}
                <span className="text-xs text-muted-foreground">{t.vsLastMonth}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="kpi-clients">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t.newClients}</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalClients}</div>
            <div className="flex items-center gap-2 mt-1">
              {getGrowthIndicator(kpiData.clientsChange)}
              <span className="text-xs text-muted-foreground">{t.vsLastMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-leads">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t.newLeads}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalLeads}</div>
            <div className="flex items-center gap-2 mt-1">
              {getGrowthIndicator(kpiData.leadsChange)}
              <span className="text-xs text-muted-foreground">{t.vsLastMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-conversion">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t.conversionRate}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.avgConversion}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.confirmed} / {t.leadsAssigned}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-leaderboard">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {t.leaderboard}
          </CardTitle>
          <CardDescription>
            {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaderboardData.map((data) => (
              <Collapsible
                key={data.employee.id}
                open={expandedEmployee === data.employee.id}
                onOpenChange={(open) => setExpandedEmployee(open ? data.employee.id : null)}
              >
                <Card className={cn(
                  "transition-all",
                  data.rank === 1 && "border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10"
                )} data-testid={`card-employee-${data.employee.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                          <span className="font-bold text-primary">#{data.rank}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold" data-testid={`text-employee-name-${data.employee.id}`}>
                              {language === "ar" ? data.employee.name : (data.employee.nameEn || data.employee.name)}
                            </h3>
                            {getRankBadge(data.rank)}
                          </div>
                          <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">{t.clients}</div>
                          <div className="font-semibold" data-testid={`text-clients-${data.employee.id}`}>
                            {data.confirmedClients}
                            {data.target && <span className="text-muted-foreground">/{data.target.targetClients}</span>}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">{t.leadsAssigned}</div>
                          <div className="font-semibold" data-testid={`text-leads-${data.employee.id}`}>
                            {data.leads}
                            {data.target && <span className="text-muted-foreground">/{data.target.targetLeads}</span>}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">{t.revenue}</div>
                            <div className="font-semibold" data-testid={`text-revenue-${data.employee.id}`}>
                              {formatCurrency(data.revenue, activeCurrency)}
                            </div>
                            {viewCurrency === "all" && data.revenueByCurrency && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {(Object.entries(data.revenueByCurrency) as [Currency, number][])
                                  .filter(([_, v]) => v > 0)
                                  .map(([curr]) => curr)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">{t.conversion}</div>
                          <div className="font-semibold">{data.conversionRate}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">{t.growth}</div>
                          {getGrowthIndicator(data.revenueGrowth)}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); openTargetDialog(data.employee.id); }}
                            data-testid={`button-edit-target-${data.employee.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-expand-${data.employee.id}`}>
                              {expandedEmployee === data.employee.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </div>

                    {data.target && isAdmin && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.progressToTarget}</span>
                          <span>
                            {(() => {
                              const targetInCurrency = convertAmount(data.target!.targetRevenue, data.target!.targetCurrency, activeCurrency);
                              const progress = targetInCurrency > 0 ? Math.min(100, Math.round((data.revenue / targetInCurrency) * 100)) : 0;
                              return `${progress}%`;
                            })()}
                          </span>
                        </div>
                        <Progress 
                          value={(() => {
                            const targetInCurrency = convertAmount(data.target!.targetRevenue, data.target!.targetCurrency, activeCurrency);
                            return targetInCurrency > 0 ? Math.min(100, Math.round((data.revenue / targetInCurrency) * 100)) : 0;
                          })()}
                          className="h-2" 
                        />
                        <div className="text-xs text-muted-foreground text-end">
                          {t.target}: {formatCurrency(convertAmount(data.target.targetRevenue, data.target.targetCurrency, activeCurrency), activeCurrency)}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CollapsibleContent>
                    <CardContent className="pt-0 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t.clientsList} ({data.confirmedClients})
                          </h4>
                          {data.clients.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{language === "ar" ? "لا يوجد عملاء" : "No clients"}</p>
                          ) : (
                            <div className="space-y-2">
                              {data.clients.map((client) => (
                                <div key={client.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{client.name}</div>
                                    {client.company && (
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {client.company}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency(
                                      client.services.reduce((sum, s) => {
                                        return sum + convertAmount(s.price || 0, (s.currency || "USD") as Currency, activeCurrency);
                                      }, 0),
                                      activeCurrency
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {t.leadsList} ({data.leads})
                          </h4>
                          {data.leadsList.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{language === "ar" ? "لا يوجد عملاء محتملين" : "No leads"}</p>
                          ) : (
                            <div className="space-y-2">
                              {data.leadsList.map((lead) => (
                                <div key={lead.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{lead.name}</div>
                                    <div className="text-xs text-muted-foreground">{lead.stage}</div>
                                  </div>
                                  {lead.dealValue && isAdmin && (
                                    <div className="text-sm text-muted-foreground">
                                      {formatCurrency(
                                        convertAmount(lead.dealValue, (lead.dealCurrency || "USD") as Currency, activeCurrency),
                                        activeCurrency
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t">
                        <h4 className="font-medium mb-3">{t.vsLastMonth}</h4>
                        <div className="grid grid-cols-3 gap-4">
                          {isAdmin && (
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                              <div className="text-sm text-muted-foreground">{t.revenue}</div>
                              <div className="font-medium">
                                {formatCurrency(data.lastMonth.revenue, activeCurrency)}
                              </div>
                              {getGrowthIndicator(data.revenueGrowth)}
                            </div>
                          )}
                          <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className="text-sm text-muted-foreground">{t.clients}</div>
                            <div className="font-medium">{data.lastMonth.confirmedClients}</div>
                            {getGrowthIndicator(data.clientsGrowth)}
                          </div>
                          <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className="text-sm text-muted-foreground">{t.leadsAssigned}</div>
                            <div className="font-medium">{data.lastMonth.leads}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
