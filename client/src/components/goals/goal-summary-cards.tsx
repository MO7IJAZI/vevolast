import { Target, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface GoalSummaryCardsProps {
  total: number;
  achieved: number;
  inProgress: number;
  completionRate: number;
}

export function GoalSummaryCards({
  total,
  achieved,
  inProgress,
  completionRate,
}: GoalSummaryCardsProps) {
  const { t } = useLanguage();

  const cards = [
    {
      title: t("goals.totalGoals"),
      value: total,
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
      gradient: "from-primary/5 to-transparent",
    },
    {
      title: t("goals.achieved"),
      value: achieved,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      gradient: "from-emerald-500/5 to-transparent",
    },
    {
      title: t("goals.inProgress"),
      value: inProgress,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      gradient: "from-amber-500/5 to-transparent",
    },
    {
      title: t("goals.completionRate"),
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      gradient: "from-blue-500/5 to-transparent",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.title} 
          className={cn("hover-elevate overflow-hidden relative")}
          data-testid={`card-summary-${card.title}`}
        >
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br pointer-events-none",
            card.gradient
          )} />
          <CardContent className="p-5 flex items-center gap-4 relative">
            <div className={cn("p-3 rounded-xl", card.bgColor)}>
              <card.icon className={cn("h-6 w-6", card.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
              <p className="text-2xl font-bold mt-0.5">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
