import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { MonthYearSelector } from "@/components/goals/month-year-selector";
import { GoalSummaryCards } from "@/components/goals/goal-summary-cards";
import { GoalCard } from "@/components/goals/goal-card";
import { AddGoalModal } from "@/components/goals/add-goal-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Goal, GoalFormData } from "@shared/schema";

export default function GoalsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const { data: goals = [], isLoading, error } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const filteredGoals = useMemo(() => {
    return goals.filter(
      (goal) => goal.month === selectedMonth && goal.year === selectedYear
    );
  }, [goals, selectedMonth, selectedYear]);

  const summary = useMemo(() => {
    const total = filteredGoals.length;
    const achieved = filteredGoals.filter((g) => g.status === "achieved").length;
    const inProgress = filteredGoals.filter((g) => g.status === "in_progress").length;
    const completionRate = total > 0 ? Math.round((achieved / total) * 100) : 0;
    return { total, achieved, inProgress, completionRate };
  }, [filteredGoals]);

  const createMutation = useMutation({
    mutationFn: (data: GoalFormData) => apiRequest("POST", "/api/goals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsModalOpen(false);
      toast({
        title: t("goals.addGoal"),
        description: "Goal created successfully",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to create goal",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalFormData }) =>
      apiRequest("PATCH", `/api/goals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsModalOpen(false);
      setEditingGoal(null);
      toast({
        title: t("common.edit"),
        description: "Goal updated successfully",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to update goal",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: t("common.delete"),
        description: "Goal deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to delete goal",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: GoalFormData) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleOpenModal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{t("common.error")}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/goals"] })}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {t("goals.title")}
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            {t("goals.subtitle")}
          </p>
        </div>
        <Button onClick={handleOpenModal} data-testid="button-add-goal">
          <Plus className="h-4 w-4 me-2" />
          {t("goals.addGoal")}
        </Button>
      </div>

      <MonthYearSelector
        month={selectedMonth}
        year={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <GoalSummaryCards
          total={summary.total}
          achieved={summary.achieved}
          inProgress={summary.inProgress}
          completionRate={summary.completionRate}
        />
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 bg-muted/30 rounded-lg">
            <div className="p-4 rounded-full bg-muted">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">{t("goals.noGoals")}</p>
              <Button
                variant="ghost"
                onClick={handleOpenModal}
                className="mt-2 text-primary"
                data-testid="button-add-first-goal"
              >
                {t("goals.addFirstGoal")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <AddGoalModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingGoal(null);
        }}
        onSubmit={handleSubmit}
        editingGoal={editingGoal}
        defaultMonth={selectedMonth}
        defaultYear={selectedYear}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
