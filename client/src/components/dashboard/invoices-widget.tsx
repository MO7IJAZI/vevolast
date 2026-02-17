import { Link } from "wouter";
import { FileText, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useData } from "@/contexts/DataContext";

export function InvoicesWidget() {
  const { language } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const { invoices, getOverdueInvoices, getUpcomingInvoices } = useData();

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const unpaidInvoices = invoices.filter((i) => i.status === "sent" || i.status === "draft");
  const overdueInvoices = getOverdueInvoices();

  const paidTotal = paidInvoices.reduce((sum, i) => sum + convertAmount(i.amount, i.currency, displayCurrency), 0);
  const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + convertAmount(i.amount, i.currency, displayCurrency), 0);
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + convertAmount(i.amount, i.currency, displayCurrency), 0);

  const content = {
    ar: {
      title: "ملخص الفواتير",
      paid: "مدفوعة",
      unpaid: "غير مدفوعة",
      overdue: "متأخرة",
      invoice: "فاتورة",
      invoices: "فواتير",
      viewAll: "عرض الكل",
    },
    en: {
      title: "Invoices Summary",
      paid: "Paid",
      unpaid: "Unpaid",
      overdue: "Overdue",
      invoice: "invoice",
      invoices: "invoices",
      viewAll: "View All",
    },
  };

  const t = content[language];

  const items = [
    {
      key: "paid",
      label: t.paid,
      count: paidInvoices.length,
      amount: paidTotal,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      filter: "paid",
    },
    {
      key: "unpaid",
      label: t.unpaid,
      count: unpaidInvoices.length,
      amount: unpaidTotal,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      filter: "unpaid",
    },
    {
      key: "overdue",
      label: t.overdue,
      count: overdueInvoices.length,
      amount: overdueTotal,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
      filter: "overdue",
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {t.title}
        </CardTitle>
        <Link href="/invoices">
          <Button variant="ghost" size="sm" data-testid="link-invoices-view-all">
            {t.viewAll}
            <ArrowRight className="h-3 w-3 ms-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <Link key={item.key} href={`/invoices?filter=${item.filter}`}>
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} {item.count === 1 ? t.invoice : t.invoices}
                  </p>
                </div>
              </div>
              <span className="font-semibold">{formatCurrency(item.amount)}</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
