import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";

interface RevenueChartProps {
  filterMonth?: number;
  filterYear?: number;
}

type RevenueTooltipEntry = {
  payload?: {
    name?: string;
    nameAr?: string;
  };
};

const packageColors: Record<string, string> = {
  "main-pkg-1": "hsl(262, 83%, 58%)", // Social Media
  "main-pkg-2": "hsl(217, 91%, 60%)", // Websites
  "main-pkg-3": "hsl(239, 84%, 67%)", // Logo / Branding
  "main-pkg-4": "hsl(25, 95%, 53%)",  // AI
  "main-pkg-5": "hsl(172, 66%, 50%)", // Apps
  "main-pkg-6": "hsl(142, 76%, 36%)", // Custom
};

export function RevenueChart({ filterMonth, filterYear }: RevenueChartProps) {
  const { language } = useLanguage();
  const { formatCurrency, currency } = useCurrency();

  const { data: financeSummary } = useQuery<{
    servicesBreakdown: { packageName: string; packageNameAr: string; revenue: number }[];
  }>({
    queryKey: ["/api/finance-summary", { month: filterMonth, year: filterYear, displayCurrency: currency }],
    queryFn: async () => {
      let url = "/api/finance-summary";
      const params = new URLSearchParams();
      if (filterMonth !== undefined) params.set("month", String(filterMonth));
      if (filterYear !== undefined) params.set("year", String(filterYear));
      params.set("displayCurrency", currency);
      url += "?" + params.toString();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch finance summary");
      return res.json();
    },
  });

  const data = (financeSummary?.servicesBreakdown || [])
    .map((item, index) => ({
      name: item.packageName,
      nameAr: item.packageNameAr,
      value: item.revenue,
      color: packageColors[`main-pkg-${index + 1}`] || packageColors["main-pkg-6"],
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg font-semibold">
          {language === "ar" ? "الإيرادات حسب الخدمة" : "Revenue by Service"}
        </CardTitle>
        {data.length > 0 && (
          <div className="flex flex-col items-end gap-0.5 text-end">
            <span className="text-base font-bold text-primary sm:text-lg md:text-xl break-all">
              {formatCurrency(total)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {language === "ar" ? "الإجمالي" : "Total"}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative h-[240px] w-full sm:h-[280px] md:h-[320px]" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}>
          <ResponsiveContainer width="100%" height="100%">
            {data.length > 0 ? (
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    maxWidth: "240px",
                  }}
                  formatter={(value: number, _name: string, entry: RevenueTooltipEntry) => {
                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                    const item = entry?.payload;
                    const label = language === "ar" ? item?.nameAr : item?.name;
                    return [
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold">{formatCurrency(value)}</span>
                        <span className="text-xs opacity-70">{percent}%</span>
                      </div>,
                      <span className="truncate block max-w-[180px]">{label}</span>,
                    ];
                  }}
                />
              </PieChart>
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span>{language === "ar" ? "لا توجد بيانات للعرض في الفترة المحددة" : "No data available for the selected period"}</span>
                </div>
              </div>
            )}
          </ResponsiveContainer>
        </div>
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 overflow-x-hidden sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
            {data.map((item) => {
              const share = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.name} className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 p-2.5">
                  <div
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {language === "ar" ? item.nameAr : item.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-bold">
                      {formatCurrency(item.value)}
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${share}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
