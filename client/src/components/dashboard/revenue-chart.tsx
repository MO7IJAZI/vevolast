import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";

interface RevenueChartProps {
  filterMonth?: number;
  filterYear?: number;
}

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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {language === "ar" ? "الإيرادات حسب الخدمة" : "Revenue by Service"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] relative" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}>
          <ResponsiveContainer width="100%" height="100%">
            {data.length > 0 ? (
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, _name: string, entry: any) => {
                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                    const item = entry?.payload;
                    const label = language === "ar" ? item?.nameAr : item?.name;
                    return [
                      <div className="flex flex-col gap-0.5">
                        <span>{formatCurrency(value)}</span>
                        <span className="text-xs opacity-70">{percent}%</span>
                      </div>,
                      label,
                    ];
                  }}
                />
              </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {language === "ar" ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-3xl font-bold">{formatCurrency(total)}</p>
              <p className="text-sm font-medium text-muted-foreground">
                {language === "ar" ? "الإجمالي" : "Total"}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground truncate">
                {language === "ar" ? item.nameAr : item.name}
                {total > 0 && ` (${((item.value / total) * 100).toFixed(0)}%)`}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
