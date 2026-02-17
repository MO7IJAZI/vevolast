import { Link } from "wouter";
import { Trophy, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";

export function TopPerformers() {
  const { language } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const { clients } = useData();
  const { isAdmin } = useAuth();

  const clientRevenues = clients.map((client) => {
    const totalRevenue = client.services.reduce((sum, service) => {
      return sum + convertAmount(service.price || 0, service.currency || "USD", displayCurrency);
    }, 0);
    const completedServices = client.services.filter((s) => s.status === "completed").length;
    const totalServices = client.services.length;
    const completionRate = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

    return {
      id: client.id,
      name: client.name,
      revenue: totalRevenue,
      currency: displayCurrency,
      completionRate,
    };
  });

  const topClients = clientRevenues
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  const maxRevenue = topClients.length > 0 ? topClients[0].revenue : 1;

  const content = {
    ar: {
      title: "أفضل العملاء",
      viewAll: "عرض الكل",
      noClients: "لا يوجد عملاء بعد",
    },
    en: {
      title: "Top Clients",
      viewAll: "View All",
      noClients: "No clients yet",
    },
  };

  const t = content[language];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          {t.title}
        </CardTitle>
        <Link href="/clients?tab=confirmed">
          <Button variant="ghost" size="sm" data-testid="link-top-performers-view-all">
            {t.viewAll}
            <ArrowRight className="h-3 w-3 ms-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {topClients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t.noClients}</p>
        ) : (
          topClients.map((client, index) => (
            <div key={client.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {index + 1}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    {isAdmin && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(client.revenue, client.currency as Currency)}
                      </p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    {Math.round((client.revenue / maxRevenue) * 100)}%
                  </span>
                )}
              </div>
              {isAdmin && (
                <Progress value={(client.revenue / maxRevenue) * 100} className="h-1.5" />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
