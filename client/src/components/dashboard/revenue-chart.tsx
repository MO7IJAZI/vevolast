import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useData } from "@/contexts/DataContext";

const packageColors: Record<string, string> = {
  "main-pkg-1": "hsl(262, 83%, 58%)", // Social Media
  "main-pkg-2": "hsl(217, 91%, 60%)", // Websites
  "main-pkg-3": "hsl(239, 84%, 67%)", // Logo / Branding
  "main-pkg-4": "hsl(25, 95%, 53%)",  // AI
  "main-pkg-5": "hsl(172, 66%, 50%)", // Apps
  "main-pkg-6": "hsl(142, 76%, 36%)", // Custom
};

const packageNames: Record<string, { en: string; ar: string }> = {
  "main-pkg-1": { en: "Social Media", ar: "وسائل التواصل" },
  "main-pkg-2": { en: "Websites", ar: "المواقع" },
  "main-pkg-3": { en: "Logo", ar: "الشعارات" },
  "main-pkg-4": { en: "AI", ar: "الذكاء الاصطناعي" },
  "main-pkg-5": { en: "Apps", ar: "التطبيقات" },
  "main-pkg-6": { en: "Custom", ar: "مخصص" },
};

export function RevenueChart() {
  const { language } = useLanguage();
  const { formatCurrency, convertAmount, currency } = useCurrency();
  const { clients } = useData();

  const data = useMemo(() => {
    const revenueByPackage: Record<string, number> = {};

    clients.forEach((client) => {
      client.services.forEach((service) => {
        const pkgId = service.mainPackageId || "main-pkg-6";
        const amount = convertAmount(service.price || 0, service.currency || "USD", currency);
        
        revenueByPackage[pkgId] = (revenueByPackage[pkgId] || 0) + amount;
      });
    });

    const result = Object.entries(revenueByPackage)
      .map(([key, value]) => ({
        name: packageNames[key]?.en || "Unknown",
        nameAr: packageNames[key]?.ar || "غير معروف",
        value: value,
        color: packageColors[key] || "hsl(0, 0%, 50%)",
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
      
    // If no data, use empty array
    return result;
  }, [clients, convertAmount, currency]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {language === "ar" ? "الإيرادات حسب الخدمة" : "Revenue by Service"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            {data.length > 0 ? (
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    data.find((d) => d.name === name)?.[language === "ar" ? "nameAr" : "name"],
                  ]}
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
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">
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
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
