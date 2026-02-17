import {
  DollarSign,
  Users,
  Target,
  Folder,
  TrendingUp,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { Goal, GoalType, GoalStatus } from "@shared/schema";
import { goalTypeConfigs } from "@shared/schema";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  Users,
  Target,
  Folder,
  TrendingUp,
  Star,
  Phone,
};

const typeColors: Record<GoalType, { bg: string; text: string; border: string }> = {
  financial: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  clients: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  leads: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/20" },
  projects: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  performance: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  custom: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
};

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const { t, language, direction } = useLanguage();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();

  const typeConfig = goalTypeConfigs[goal.type as GoalType];
  const colors = typeColors[goal.type as GoalType] || typeColors.custom;
  const IconComponent = goal.icon
    ? iconMap[goal.icon] || Target
    : iconMap[typeConfig?.defaultIcon] || Target;

  const progress = goal.target > 0 
    ? Math.min(100, Math.round(((goal.current || 0) / goal.target) * 100))
    : 0;

  const getStatusBadge = (status: GoalStatus) => {
    const statusConfig: Record<GoalStatus, { className: string }> = {
      not_started: { className: "bg-muted text-muted-foreground" },
      in_progress: { className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
      achieved: { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
      failed: { className: "bg-red-500/15 text-red-700 dark:text-red-400" },
    };

    const config = statusConfig[status] || statusConfig.not_started;
    return (
      <Badge variant="secondary" className={cn("font-medium", config.className)}>
        {t(`status.${status}`)}
      </Badge>
    );
  };

  const formatValue = (value: number) => {
    if (typeConfig?.isPercentage) {
      return `${value}%`;
    }
    if (typeConfig?.hasCurrency && goal.currency) {
      const convertedValue = convertAmount(value, goal.currency as any, displayCurrency);
      return formatCurrency(convertedValue, displayCurrency);
    }
    return value.toLocaleString(language === "ar" ? "ar-SA" : "en-US");
  };

  return (
    <Card className="hover-elevate group overflow-visible" data-testid={`card-goal-${goal.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl shrink-0", colors.bg)}>
            <IconComponent className={cn("h-6 w-6", colors.text)} />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base truncate">{goal.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {language === "ar" ? typeConfig?.labelAr : typeConfig?.labelEn}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {getStatusBadge(goal.status as GoalStatus)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-goal-menu-${goal.id}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={direction === "rtl" ? "start" : "end"}>
                    <DropdownMenuItem
                      onClick={() => onEdit(goal)}
                      data-testid={`button-edit-goal-${goal.id}`}
                    >
                      <Pencil className="h-4 w-4 me-2" />
                      {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(goal.id)}
                      className="text-destructive focus:text-destructive"
                      data-testid={`button-delete-goal-${goal.id}`}
                    >
                      <Trash2 className="h-4 w-4 me-2" />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatValue(goal.current || 0)} {t("common.of")} {formatValue(goal.target)}
                </span>
                <span className={cn("font-semibold", progress >= 100 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                  {progress}%
                </span>
              </div>
              <Progress 
                value={progress} 
                className={cn(
                  "h-2",
                  progress >= 100 && "[&>div]:bg-emerald-500"
                )}
              />
            </div>

            {goal.notes && (
              <p className="text-sm text-muted-foreground line-clamp-2 pt-1">
                {goal.notes}
              </p>
            )}

            {goal.responsiblePerson && (
              <div className="flex items-center gap-2 pt-1">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {goal.responsiblePerson.charAt(0)}
                </div>
                <span className="text-xs text-muted-foreground">{goal.responsiblePerson}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
