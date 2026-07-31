import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { cn } from "@/lib/utils";

type Period = "weekly" | "monthly";

interface IncomeChartProps {
  filterMonth?: number;
  filterYear?: number;
}

export function IncomeChart({ filterMonth, filterYear }: IncomeChartProps) {
  const { language, direction } = useLanguage();
  const { formatCurrency, currency: displayCurrency } = useCurrency();
  const [period, setPeriod] = useState<Period>("monthly");

  const { data: trendDataRaw = [] } = useQuery<Array<{
    key: string;
    label: string;
    labelAr: string;
    income: number;
    expenses: number;
  }>>({
    queryKey: ["/api/finance-trend", { month: filterMonth, year: filterYear, displayCurrency, groupBy: period }],
    queryFn: async () => {
      let url = "/api/finance-trend";
      const params = new URLSearchParams();
      if (filterMonth !== undefined) params.set("month", String(filterMonth));
      if (filterYear !== undefined) params.set("year", String(filterYear));
      params.set("displayCurrency", displayCurrency);
      params.set("groupBy", period);
      url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch finance trend");
      return res.json();
    },
  });

  const data = Array.isArray(trendDataRaw)
    ? trendDataRaw.map((point) => ({
        month: point.label,
        monthAr: point.labelAr,
        income: point.income,
        expenses: point.expenses,
      }))
    : [];

  const periods: { value: Period; labelEn: string; labelAr: string }[] = [
    { value: "weekly", labelEn: "Weekly", labelAr: "أسبوعي" },
    { value: "monthly", labelEn: "Monthly", labelAr: "شهري" },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 flex-wrap">
        <CardTitle className="text-base sm:text-lg font-semibold">
          {language === "ar" ? "الإيرادات والمصروفات" : "Income vs Expenses"}
        </CardTitle>
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-full sm:w-auto">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant="ghost"
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "text-xs px-2 sm:px-3 h-7 flex-1 sm:flex-none min-w-0",
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
        <div className="h-[240px] sm:h-[280px] md:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                reversed={direction === "rtl"}
                interval={0}
                angle={-35}
                textAnchor={direction === "rtl" ? "end" : "start"}
                height={50}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(value) => `${value / 1000}k`}
                orientation={direction === "rtl" ? "right" : "left"}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  maxWidth: "260px",
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value, displayCurrency),
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
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 shrink-0 rounded-full bg-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {language === "ar" ? "الإيرادات" : "Income"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 shrink-0 rounded-full bg-orange-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {language === "ar" ? "المصروفات" : "Expenses"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
