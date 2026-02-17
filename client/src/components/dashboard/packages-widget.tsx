import { Link } from "wouter";
import { Package, Plus, ArrowRight, Layers, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";

export function PackagesWidget() {
  const { language } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const { mainPackages, subPackages } = useData();
  const { isAdmin } = useAuth();
  
  const activeMainPackages = mainPackages.filter((mp) => mp.isActive);
  const activeSubPackages = subPackages.filter((sp) => sp.isActive);

  const content = {
    ar: {
      title: "نظرة على الباقات",
      categories: "الفئات",
      totalPackages: "إجمالي الباقات",
      activePackages: "الباقات النشطة",
      recentPackages: "أحدث الباقات",
      addPackage: "إضافة باقة",
      viewAll: "عرض الكل",
      packages: "باقات",
    },
    en: {
      title: "Packages Overview",
      categories: "Categories",
      totalPackages: "Total Packages",
      activePackages: "Active Packages",
      recentPackages: "Recent Packages",
      addPackage: "Add Package",
      viewAll: "View All",
      packages: "packages",
    },
  };

  const t = content[language];

  const getMainPackageName = (mainPackageId: string) => {
    const mp = mainPackages.find((m) => m.id === mainPackageId);
    return mp ? (language === "ar" ? mp.name : (mp.nameEn || mp.name)) : "";
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <Link href="/packages">
          <Button variant="ghost" size="sm" data-testid="link-packages-view-all">
            {t.viewAll}
            <ArrowRight className="h-3 w-3 ms-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Link href="/packages">
            <div className="p-3 rounded-lg bg-primary/10 hover-elevate cursor-pointer">
              <p className="text-xs text-muted-foreground">{t.categories}</p>
              <p className="text-2xl font-bold">{activeMainPackages.length}</p>
            </div>
          </Link>
          <Link href="/packages">
            <div className="p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer">
              <p className="text-xs text-muted-foreground">{t.totalPackages}</p>
              <p className="text-2xl font-bold">{subPackages.length}</p>
            </div>
          </Link>
          <Link href="/packages?filter=active">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover-elevate cursor-pointer">
              <p className="text-xs text-muted-foreground">{t.activePackages}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeSubPackages.length}</p>
            </div>
          </Link>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">{t.recentPackages}</p>
          <div className="space-y-2">
            {activeSubPackages.slice(0, 3).map((sp) => (
              <div
                key={sp.id}
                className="flex items-center justify-between p-2 rounded-lg border bg-background"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Layers className="h-3 w-3 me-1" />
                    {getMainPackageName(sp.mainPackageId)}
                  </Badge>
                  <span className="text-sm truncate">
                    {language === "ar" ? sp.name : (sp.nameEn || sp.name)}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium">
                      {formatCurrency(
                        convertAmount(sp.price, sp.currency as any, displayCurrency),
                        displayCurrency
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Link href="/packages">
          <Button variant="outline" className="w-full" size="sm" data-testid="button-add-package">
            <Plus className="h-4 w-4 me-2" />
            {t.addPackage}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
