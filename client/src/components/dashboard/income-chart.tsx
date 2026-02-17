import { useState } from "react";
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

const monthlyData = [
  { month: "Jan", monthAr: "يناير", income: 42000, expenses: 28000 },
  { month: "Feb", monthAr: "فبراير", income: 38000, expenses: 25000 },
  { month: "Mar", monthAr: "مارس", income: 55000, expenses: 32000 },
  { month: "Apr", monthAr: "أبريل", income: 48000, expenses: 30000 },
  { month: "May", monthAr: "مايو", income: 62000, expenses: 35000 },
  { month: "Jun", monthAr: "يونيو", income: 58000, expenses: 38000 },
];

const weeklyData = [
  { month: "Week 1", monthAr: "الأسبوع 1", income: 12000, expenses: 8000 },
  { month: "Week 2", monthAr: "الأسبوع 2", income: 15000, expenses: 9500 },
  { month: "Week 3", monthAr: "الأسبوع 3", income: 18000, expenses: 11000 },
  { month: "Week 4", monthAr: "الأسبوع 4", income: 13000, expenses: 9000 },
];

type Period = "weekly" | "monthly";

export function IncomeChart() {
  const { language, direction } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const [period, setPeriod] = useState<Period>("monthly");

  const data = period === "weekly" ? weeklyData : monthlyData;

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
