import { useMemo } from "react";
import { Moon, Sun, Globe, Bell, Search, DollarSign, LogOut, Clock, Package, Wallet, CreditCard, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCurrency, currencies, type Currency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";

// Generate notifications from real data
function generateNotifications(
  clients: any[],
  employees: any[],
  salaries: any[],
  clientPayments: any[],
  payrollPayments: any[],
  language: "ar" | "en"
) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const notifications: {
    id: string;
    type: string;
    titleAr: string;
    titleEn: string;
    messageAr?: string;
    messageEn?: string;
    date: string;
    severity: "info" | "warning" | "danger";
    clientId?: string;
    employeeId?: string;
    link?: string;
  }[] = [];

  // Check for overdue/upcoming service deliveries
  clients.forEach((client) => {
    if (client.services && client.services.length > 0) {
      client.services.forEach((service: any) => {
        if (service.dueDate && service.status !== "completed") {
          const dueDate = new Date(service.dueDate);
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) {
            // Overdue
            notifications.push({
              id: `overdue-${service.id}`,
              type: "overdue_delivery",
              titleAr: `تأخر في التسليم`,
              titleEn: `Overdue Delivery`,
              messageAr: `${service.serviceName} للعميل ${client.name}`,
              messageEn: `${service.serviceNameEn || service.serviceName} for ${client.name}`,
              date: service.dueDate,
              severity: "danger",
              clientId: client.id,
              link: "/work-tracking",
            });
          } else if (diffDays <= 3) {
            // Due soon
            notifications.push({
              id: `due-${service.id}`,
              type: "delivery_due",
              titleAr: `موعد تسليم قريب`,
              titleEn: `Delivery Due Soon`,
              messageAr: `${service.serviceName} - متبقي ${diffDays} أيام`,
              messageEn: `${service.serviceNameEn || service.serviceName} - ${diffDays} days left`,
              date: service.dueDate,
              severity: diffDays === 0 ? "warning" : "info",
              clientId: client.id,
              link: "/work-tracking",
            });
          }
        }

        // Package ending soon
        if (service.dueDate && service.status !== "completed") {
          const endDate = new Date(service.dueDate);
          const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0 && diffDays <= 7 && diffDays > 3) {
            notifications.push({
              id: `package-${service.id}`,
              type: "package_ending",
              titleAr: `باقة ستنتهي قريباً`,
              titleEn: `Package Ending Soon`,
              messageAr: `${client.name} - متبقي ${diffDays} أيام`,
              messageEn: `${client.name} - ${diffDays} days remaining`,
              date: service.dueDate,
              severity: "info",
              clientId: client.id,
              link: "/clients",
            });
          }
        }
      });
    }
  });

  // Check for payroll due
  const payrollDay = 28;
  const payrollDate = new Date(now.getFullYear(), now.getMonth(), payrollDay);
  const payrollDateStr = payrollDate.toISOString().split("T")[0];
  const diffToPayroll = Math.ceil((payrollDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  employees.forEach((emp: any) => {
    const salary = salaries.find((s: any) => s.employeeId === emp.id);
    if (salary && salary.type === "monthly" && salary.amount) {
      const paidThisMonth = payrollPayments.some(
        (p: any) =>
          p.employeeId === emp.id &&
          p.month === now.getMonth() + 1 &&
          p.year === now.getFullYear()
      );

      if (!paidThisMonth) {
        if (diffToPayroll < 0) {
          // Overdue payroll
          notifications.push({
            id: `payroll-overdue-${emp.id}`,
            type: "payroll_due",
            titleAr: `راتب متأخر`,
            titleEn: `Payroll Overdue`,
            messageAr: `${emp.name} - ${salary.amount} ${salary.currency}`,
            messageEn: `${emp.nameEn || emp.name} - ${salary.amount} ${salary.currency}`,
            date: payrollDateStr,
            severity: "danger",
            employeeId: emp.id,
            link: "/finance",
          });
        } else if (diffToPayroll <= 3) {
          // Payroll due soon
          notifications.push({
            id: `payroll-${emp.id}`,
            type: "payroll_due",
            titleAr: `موعد راتب قريب`,
            titleEn: `Payroll Due Soon`,
            messageAr: `${emp.name} - ${diffToPayroll === 0 ? "اليوم" : `متبقي ${diffToPayroll} أيام`}`,
            messageEn: `${emp.nameEn || emp.name} - ${diffToPayroll === 0 ? "Today" : `${diffToPayroll} days left`}`,
            date: payrollDateStr,
            severity: diffToPayroll === 0 ? "warning" : "info",
            employeeId: emp.id,
            link: "/finance",
          });
        }
      }
    }
  });

  // Check for client payment due
  clients
    .filter((c) => c.status === "active" && c.services?.length > 0)
    .forEach((client) => {
      const monthlyTotal = client.services.reduce((sum: number, s: any) => {
        if (s.price && s.status !== "completed") return sum + s.price;
        return sum;
      }, 0);

      if (monthlyTotal > 0) {
        const paidThisMonth = clientPayments.some(
          (p: any) =>
            p.clientId === client.id &&
            p.month === now.getMonth() + 1 &&
            p.year === now.getFullYear()
        );

        if (!paidThisMonth) {
          const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            notifications.push({
              id: `payment-overdue-${client.id}`,
              type: "client_payment_due",
              titleAr: `دفعة متأخرة`,
              titleEn: `Payment Overdue`,
              messageAr: `${client.name}`,
              messageEn: `${client.name}`,
              date: dueDate.toISOString().split("T")[0],
              severity: "danger",
              clientId: client.id,
              link: "/finance",
            });
          } else if (diffDays <= 3) {
            notifications.push({
              id: `payment-${client.id}`,
              type: "client_payment_due",
              titleAr: `دفعة مستحقة`,
              titleEn: `Payment Due`,
              messageAr: `${client.name} - ${diffDays === 0 ? "اليوم" : `متبقي ${diffDays} أيام`}`,
              messageEn: `${client.name} - ${diffDays === 0 ? "Today" : `${diffDays} days left`}`,
              date: dueDate.toISOString().split("T")[0],
              severity: diffDays === 0 ? "warning" : "info",
              clientId: client.id,
              link: "/finance",
            });
          }
        }
      }
    });

  // Sort by severity (danger first, then warning, then info)
  const severityOrder = { danger: 0, warning: 1, info: 2 };
  notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return notifications;
}

export function Header() {
  const { language, setLanguage, direction, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { user, logout } = useAuth();
  const { clients, employees } = useData();
  const [, navigate] = useLocation();

  // Fetch salaries and payments for notifications
  const { data: salaries = [] } = useQuery({
    queryKey: ["/api/employee-salaries"],
  });

  const now = new Date();
  const { data: clientPayments = [] } = useQuery({
    queryKey: ["/api/client-payments", { month: now.getMonth() + 1, year: now.getFullYear() }],
    queryFn: async () => {
      const res = await fetch(`/api/client-payments?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (!res.ok) throw new Error("Failed to fetch client payments");
      return res.json();
    },
  });

  const { data: payrollPayments = [] } = useQuery({
    queryKey: ["/api/payroll-payments", { month: now.getMonth() + 1, year: now.getFullYear() }],
    queryFn: async () => {
      const res = await fetch(`/api/payroll-payments?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (!res.ok) throw new Error("Failed to fetch payroll payments");
      return res.json();
    },
  });

  // Generate notifications from real data
  const notifications = useMemo(() => {
    return generateNotifications(
      clients,
      employees,
      salaries as any[],
      clientPayments as any[],
      payrollPayments as any[],
      language
    );
  }, [clients, employees, salaries, clientPayments, payrollPayments, language]);

  const unreadCount = notifications.length;

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handleNotificationClick = (link?: string) => {
    if (link) {
      navigate(link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payroll_due":
        return <Wallet className="h-4 w-4" />;
      case "client_payment_due":
        return <CreditCard className="h-4 w-4" />;
      case "package_ending":
        return <Package className="h-4 w-4" />;
      case "delivery_due":
      case "overdue_delivery":
        return <Clock className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "danger":
        return "text-destructive bg-destructive/10";
      case "warning":
        return "text-orange-500 bg-orange-500/10";
      default:
        return "text-primary bg-primary/10";
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <SidebarTrigger data-testid="button-sidebar-toggle" className="lg:hidden" />
        
        <div className="hidden md:flex relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={language === "ar" ? "بحث..." : "Search..."}
            className="w-64 ps-9 bg-muted/50 border-0"
            data-testid="input-search"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  className={cn(
                    "absolute -top-0.5 -end-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]",
                    notifications.some(n => n.severity === "danger") && "bg-destructive"
                  )}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={direction === "rtl" ? "start" : "end"} className="w-80">
            <div className="px-3 py-2 font-semibold flex items-center justify-between">
              <span>{language === "ar" ? "الإشعارات" : "Notifications"}</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {language === "ar" ? "لا توجد إشعارات" : "No notifications"}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                {notifications.slice(0, 10).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex items-start gap-3 p-3 cursor-pointer"
                    onClick={() => handleNotificationClick(notification.link)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className={cn("p-2 rounded-full shrink-0", getSeverityColor(notification.severity))}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {language === "ar" ? notification.titleAr : notification.titleEn}
                      </p>
                      {(notification.messageAr || notification.messageEn) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {language === "ar" ? notification.messageAr : notification.messageEn}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
                {notifications.length > 10 && (
                  <div className="px-3 py-2 text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate("/calendar")}
                    >
                      {language === "ar" ? "عرض الكل" : "View All"}
                    </Button>
                  </div>
                )}
              </ScrollArea>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-primary cursor-pointer"
              onClick={() => navigate("/calendar")}
            >
              <Calendar className="h-4 w-4 me-2" />
              {language === "ar" ? "فتح التقويم" : "Open Calendar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-currency">
              <DollarSign className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={direction === "rtl" ? "start" : "end"}>
            {(Object.keys(currencies) as Currency[]).map((curr) => (
              <DropdownMenuItem
                key={curr}
                onClick={() => setCurrency(curr)}
                className="flex items-center gap-3"
                data-testid={`option-currency-${curr}`}
              >
                <span className={cn(
                  "w-5 flex justify-center shrink-0",
                  direction === "rtl" ? "order-first" : "order-last"
                )}>
                  {currency === curr && "✓"}
                </span>
                <span className="flex-1">
                  {currencies[curr].symbol} {curr} - {language === "ar" ? currencies[curr].nameAr : currencies[curr].name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-language">
              <Globe className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={direction === "rtl" ? "start" : "end"}>
            <DropdownMenuItem
              onClick={() => setLanguage("ar")}
              className="flex items-center gap-3"
              data-testid="option-arabic"
            >
              <span className={cn(
                "w-5 flex justify-center shrink-0",
                direction === "rtl" ? "order-first" : "order-last"
              )}>
                {language === "ar" && "✓"}
              </span>
              <span className="flex-1">العربية</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("en")}
              className="flex items-center gap-3"
              data-testid="option-english"
            >
              <span className={cn(
                "w-5 flex justify-center shrink-0",
                direction === "rtl" ? "order-first" : "order-last"
              )}>
                {language === "en" && "✓"}
              </span>
              <span className="flex-1">English</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="button-theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {language === "ar" ? "أ" : "O"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={direction === "rtl" ? "start" : "end"} className="w-48">
            <div className="px-3 py-2">
              <p className="font-semibold">{language === "ar" ? user?.name : user?.nameEn || user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role === "admin" ? (language === "ar" ? "مدير" : "Admin") : user?.role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t("nav.settings")}</DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive cursor-pointer" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 me-2" />
              {language === "ar" ? "تسجيل الخروج" : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
