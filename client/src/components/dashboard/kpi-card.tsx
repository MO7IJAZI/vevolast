import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  clickable?: boolean;
}

export function KPICard({
  title,
  value,
  trend,
  trendLabel,
  icon,
  iconBgColor = "bg-primary/10",
  clickable = false,
}: KPICardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <Card className={cn("hover-elevate", clickable && "cursor-pointer")} data-testid={`card-kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold tracking-tight" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1.5">
                {isPositive && (
                  <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <TrendingUp className="h-3 w-3" />
                    +{trend}%
                  </span>
                )}
                {isNegative && (
                  <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 text-xs font-medium">
                    <TrendingDown className="h-3 w-3" />
                    {trend}%
                  </span>
                )}
                {trend === 0 && (
                  <span className="text-muted-foreground text-xs font-medium">0%</span>
                )}
                {trendLabel && (
                  <span className="text-muted-foreground text-xs">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-xl shrink-0", iconBgColor)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
