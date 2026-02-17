import { Link } from "wouter";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useData } from "@/contexts/DataContext";
import { KPICard } from "@/components/dashboard/kpi-card";
import { IncomeChart } from "@/components/dashboard/income-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ClientsWidget } from "@/components/dashboard/clients-widget";
import { InvoicesWidget } from "@/components/dashboard/invoices-widget";
import { TopPerformers } from "@/components/dashboard/top-performers";
import { PackagesWidget } from "@/components/dashboard/packages-widget";
import { WorkTrackingWidget } from "@/components/dashboard/work-tracking-widget";
import { TimeTrackerWidget } from "@/components/dashboard/time-tracker-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const { t, language } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const {
    getTotalIncome,
    getTotalExpenses,
    getNetProfit,
    goals,
    getGoalCompletionRate,
    getTodayEvents,
    getUpcomingDeadlines,
    employees,
  } = useData();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const totalIncome = getTotalIncome(currentMonth, currentYear);
  const totalExpenses = getTotalExpenses(currentMonth, currentYear);
  const netProfit = getNetProfit(currentMonth, currentYear);
  const balance = totalIncome - totalExpenses;

  const currentMonthGoals = goals.filter(
    (g) => g.month === currentMonth && g.year === currentYear
  );
  const achievedGoals = currentMonthGoals.filter((g) => g.status === "achieved").length;
  const goalCompletionRate = getGoalCompletionRate(currentMonth, currentYear);

  const todayEvents = getTodayEvents();
  const upcomingDeadlines = getUpcomingDeadlines(7);

  const activeEmployees = employees.filter((e) => e.isActive);
  const totalSalaries = activeEmployees.reduce((sum, e) => {
    return sum + convertAmount(e.salaryAmount || 0, e.salaryCurrency, displayCurrency);
  }, 0);

  const content = {
    ar: {
      welcome: "مرحباً بك، أسامة",
      currentBalance: "الرصيد الحالي",
      totalIncome: "إجمالي الإيرادات",
      totalExpenses: "إجمالي المصروفات",
      netProfit: "صافي الربح",
      vsLastMonth: "من الشهر الماضي",
      goalsTitle: "أهداف الشهر",
      total: "إجمالي",
      achieved: "محققة",
      inProgress: "قيد التنفيذ",
      completionRate: "نسبة الإنجاز",
      viewAll: "عرض الكل",
      calendarTitle: "أحداث اليوم",
      upcomingDeadlines: "مواعيد قادمة",
      noEvents: "لا توجد أحداث اليوم",
      employeesTitle: "فريق العمل",
      activeEmployees: "موظف نشط",
      totalSalaries: "إجمالي الرواتب",
    },
    en: {
      welcome: "Welcome back, Osama",
      currentBalance: "Current Balance",
      totalIncome: "Total Income",
      totalExpenses: "Total Expenses",
      netProfit: "Net Profit",
      vsLastMonth: "vs last month",
      goalsTitle: "Monthly Goals",
      total: "Total",
      achieved: "Achieved",
      inProgress: "In Progress",
      completionRate: "Completion Rate",
      viewAll: "View All",
      calendarTitle: "Today's Events",
      upcomingDeadlines: "Upcoming Deadlines",
      noEvents: "No events today",
      employeesTitle: "Team",
      activeEmployees: "active employees",
      totalSalaries: "Total Salaries",
    },
  };

  const txt = content[language];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
            {txt.welcome}
          </h1>
          <p className="text-muted-foreground">
            {t("month." + currentMonth)} {currentYear}
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/finance">
            <KPICard
              title={txt.currentBalance}
              value={formatCurrency(balance)}
              trend={0}
              trendLabel={txt.vsLastMonth}
              icon={<Wallet className="h-6 w-6 text-primary" />}
              iconBgColor="bg-primary/10"
              clickable
            />
          </Link>
          <Link href="/finance?filter=income">
            <KPICard
              title={txt.totalIncome}
              value={formatCurrency(totalIncome)}
              trend={0}
              trendLabel={txt.vsLastMonth}
              icon={<TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
              iconBgColor="bg-emerald-500/10"
              clickable
            />
          </Link>
          <Link href="/finance?filter=expense">
            <KPICard
              title={txt.totalExpenses}
              value={formatCurrency(totalExpenses)}
              trend={0}
              trendLabel={txt.vsLastMonth}
              icon={<TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />}
              iconBgColor="bg-red-500/10"
              clickable
            />
          </Link>
          <Link href="/finance">
            <KPICard
              title={txt.netProfit}
              value={formatCurrency(netProfit)}
              trend={0}
              trendLabel={txt.vsLastMonth}
              icon={<DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
              iconBgColor="bg-blue-500/10"
              clickable
            />
          </Link>
        </div>
      )}

      {isAdmin && (
        <div className="grid lg:grid-cols-3 gap-6">
          <IncomeChart />
          <RevenueChart />
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ClientsWidget />
        {isAdmin && <InvoicesWidget />}
        <PackagesWidget />
        <TopPerformers />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <WorkTrackingWidget />
        <TimeTrackerWidget />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {txt.goalsTitle}
            </CardTitle>
            <Link href="/goals">
              <Button variant="ghost" size="sm" data-testid="link-goals-view-all">
                {txt.viewAll}
                <ArrowRight className="h-3 w-3 ms-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{currentMonthGoals.length}</p>
                <p className="text-xs text-muted-foreground">{txt.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{achievedGoals}</p>
                <p className="text-xs text-muted-foreground">{txt.achieved}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {currentMonthGoals.length - achievedGoals}
                </p>
                <p className="text-xs text-muted-foreground">{txt.inProgress}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{txt.completionRate}</span>
                <span className="font-medium">{goalCompletionRate}%</span>
              </div>
              <Progress value={goalCompletionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {txt.calendarTitle}
            </CardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" data-testid="link-calendar-view-all">
                {txt.viewAll}
                <ArrowRight className="h-3 w-3 ms-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{txt.noEvents}</p>
            ) : (
              todayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {language === "ar" ? event.titleAr : event.titleEn || event.titleAr}
                    </p>
                    {event.time && (
                      <p className="text-xs text-muted-foreground">{event.time}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {event.eventType}
                  </Badge>
                </div>
              ))
            )}
            {upcomingDeadlines.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">{txt.upcomingDeadlines}</p>
                {upcomingDeadlines.slice(0, 2).map((deadline) => (
                  <div
                    key={deadline.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">
                      {language === "ar" ? deadline.titleAr : deadline.titleEn || deadline.titleAr}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {deadline.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {txt.employeesTitle}
            </CardTitle>
            <Link href="/employees">
              <Button variant="ghost" size="sm" data-testid="link-employees-view-all">
                {txt.viewAll}
                <ArrowRight className="h-3 w-3 ms-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{activeEmployees.length}</p>
                <p className="text-xs text-muted-foreground">{txt.activeEmployees}</p>
              </div>
              {isAdmin && (
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(totalSalaries)}
                  </p>
                  <p className="text-xs text-muted-foreground">{txt.totalSalaries}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {activeEmployees.slice(0, 3).map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm truncate">{emp.name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {emp.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
