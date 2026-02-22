import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useData } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks, isSameMonth, isSameWeek, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

type Period = "weekly" | "monthly";

export function IncomeChart() {
  const { language, direction } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const { transactions } = useData();
  const [period, setPeriod] = useState<Period>("monthly");

  const data = useMemo(() => {
    const now = new Date();
    
    if (period === "monthly") {
      // Last 6 months
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const monthTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= monthStart && tDate <= monthEnd;
        });

        const income = monthTransactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + convertAmount(t.amount, t.currency, displayCurrency), 0);
          
        const expenses = monthTransactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + convertAmount(t.amount, t.currency, displayCurrency), 0);

        result.push({
          month: format(date, "MMM", { locale: enUS }),
          monthAr: format(date, "MMM", { locale: arSA }),
          income,
          expenses
        });
      }
      return result;
    } else {
      // Last 4 weeks
      const result = [];
      for (let i = 3; i >= 0; i--) {
        const date = subWeeks(now, i);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        
        const weekTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= weekStart && tDate <= weekEnd;
        });

        const income = weekTransactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + convertAmount(t.amount, t.currency, displayCurrency), 0);
          
        const expenses = weekTransactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + convertAmount(t.amount, t.currency, displayCurrency), 0);

        result.push({
          month: `Week ${4-i}`,
          monthAr: `الأسبوع ${4-i}`,
          income,
          expenses
        });
      }
      return result;
    }
  }, [period, transactions, convertAmount, displayCurrency]);

  const periods: { value: Period; labelEn: string; labelAr: string }[] = [
    { value: "weekly", labelEn: "Weekly", labelAr: "أسبوعي" },
    { value: "monthly", labelEn: "Monthly", labelAr: "شهري" },
  ];

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-lg font-semibold">
          {language === "ar" ? "الإيرادات والمصروفات" : "Income vs Expenses"}
        </CardTitle>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant="ghost"
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "text-xs px-3 h-7",
                period === p.value && "bg-background shadow-sm"
              )}
              data-testid={`button-period-${p.value}`}
            >
              {language === "ar" ? p.labelAr : p.labelEn}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey={language === "ar" ? "monthAr" : "month"}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                reversed={direction === "rtl"}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${value / 1000}k`}
                orientation={direction === "rtl" ? "right" : "left"}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(convertAmount(value, "USD", displayCurrency), displayCurrency),
                  name === "income"
                    ? language === "ar" ? "الإيرادات" : "Income"
                    : language === "ar" ? "المصروفات" : "Expenses",
                ]}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="hsl(262, 83%, 58%)"
                strokeWidth={2}
                fill="url(#incomeGradient)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={2}
                fill="url(#expenseGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">
              {language === "ar" ? "الإيرادات" : "Income"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-muted-foreground">
              {language === "ar" ? "المصروفات" : "Expenses"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
