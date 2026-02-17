import { Link } from "wouter";
import { Users, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";

export function ClientsWidget() {
  const { language } = useLanguage();
  const { clients, leads, getActiveClients, getClientsWithExpiringServices, getCompletedClientsThisMonth } = useData();

  const activeClients = getActiveClients();
  const expiringClients = getClientsWithExpiringServices(14);
  const completedThisMonth = getCompletedClientsThisMonth();

  const displayClients = activeClients.slice(0, 4).map((client) => {
    const minDaysLeft = client.services
      .filter((s) => s.status === "in_progress")
      .reduce((min, s) => {
        const dueDate = new Date(s.dueDate);
        const today = new Date();
        const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft < min ? daysLeft : min;
      }, 999);

    return {
      id: client.id,
      name: client.name,
      daysLeft: minDaysLeft,
      isExpiring: minDaysLeft <= 14,
    };
  });

  const content = {
    ar: {
      title: "نظرة على العملاء",
      totalClients: "إجمالي العملاء",
      activeClients: "عملاء نشطون",
      totalLeads: "عملاء محتملين",
      expiringSoon: "ينتهي قريباً",
      completedThisMonth: "تم هذا الشهر",
      days: "يوم",
      viewAll: "عرض الكل",
      noClients: "لا يوجد عملاء نشطون",
    },
    en: {
      title: "Clients Overview",
      totalClients: "Total Clients",
      activeClients: "Active Clients",
      totalLeads: "Total Leads",
      expiringSoon: "Expiring Soon",
      completedThisMonth: "Completed This Month",
      days: "days",
      viewAll: "View All",
      noClients: "No active clients",
    },
  };

  const t = content[language];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {t.title}
        </CardTitle>
        <Link href="/clients">
          <Button variant="ghost" size="sm" data-testid="link-clients-view-all">
            {t.viewAll}
            <ArrowRight className="h-3 w-3 ms-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/clients?tab=confirmed">
            <div className="p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer">
              <p className="text-xs text-muted-foreground">{t.totalClients}</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
          </Link>
          <Link href="/clients?tab=leads">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover-elevate cursor-pointer">
              <p className="text-xs text-muted-foreground">{t.totalLeads}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{leads.length}</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Link href="/clients?tab=confirmed&filter=active">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover-elevate cursor-pointer">
              <p className="text-xs text-muted-foreground">{t.activeClients}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeClients.length}</p>
            </div>
          </Link>
          <Link href="/clients?tab=confirmed&filter=expiring">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover-elevate cursor-pointer">
              <p className="text-xs text-muted-foreground">{t.expiringSoon}</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{expiringClients.length}</p>
            </div>
          </Link>
          <Link href="/clients?tab=completed">
            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 hover-elevate cursor-pointer">
              <p className="text-xs text-muted-foreground">{t.completedThisMonth}</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{completedThisMonth.length}</p>
            </div>
          </Link>
        </div>

        <div className="space-y-2">
          {displayClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">{t.noClients}</p>
          ) : (
            displayClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {client.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{client.name}</span>
                </div>
                {client.isExpiring ? (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
                    <AlertCircle className="h-3 w-3 me-1" />
                    {client.daysLeft} {t.days}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {client.daysLeft} {t.days}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
