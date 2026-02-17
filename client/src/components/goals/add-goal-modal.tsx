import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DollarSign,
  Users,
  Target,
  Folder,
  TrendingUp,
  Star,
  Phone,
  BarChart3,
  Settings,
  Globe,
  Percent,
  Briefcase,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { MonthYearSelector } from "./month-year-selector";
import {
  goalFormSchema,
  goalTypeConfigs,
  type GoalFormData,
  type GoalType,
  type Goal,
} from "@shared/schema";
import { cn } from "@/lib/utils";

const availableIcons = [
  { name: "DollarSign", icon: DollarSign },
  { name: "Users", icon: Users },
  { name: "Target", icon: Target },
  { name: "Folder", icon: Folder },
  { name: "TrendingUp", icon: TrendingUp },
  { name: "Star", icon: Star },
  { name: "Phone", icon: Phone },
  { name: "BarChart3", icon: BarChart3 },
  { name: "Settings", icon: Settings },
  { name: "Globe", icon: Globe },
  { name: "Percent", icon: Percent },
  { name: "Briefcase", icon: Briefcase },
];

const currencies = [
  { value: "TRY", label: "TRY - Turkish Lira", labelAr: "TRY - ليرة تركية" },
  { value: "USD", label: "USD - US Dollar", labelAr: "USD - دولار أمريكي" },
  { value: "EUR", label: "EUR - Euro", labelAr: "EUR - يورو" },
  { value: "SAR", label: "SAR - Saudi Riyal", labelAr: "SAR - ريال سعودي" },
];

const goalStatuses = [
  { value: "not_started", labelKey: "status.not_started" },
  { value: "in_progress", labelKey: "status.in_progress" },
  { value: "achieved", labelKey: "status.achieved" },
  { value: "failed", labelKey: "status.failed" },
];

interface AddGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GoalFormData) => void;
  editingGoal?: Goal | null;
  defaultMonth: number;
  defaultYear: number;
  isPending?: boolean;
}

export function AddGoalModal({
  open,
  onOpenChange,
  onSubmit,
  editingGoal,
  defaultMonth,
  defaultYear,
  isPending,
}: AddGoalModalProps) {
  const { t, language, direction } = useLanguage();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: "",
      type: "financial",
      month: defaultMonth,
      year: defaultYear,
      target: 0,
      current: 0,
      currency: undefined,
      icon: undefined,
      notes: "",
      status: "not_started",
      responsiblePerson: "",
      country: "",
    },
  });

  useEffect(() => {
    if (editingGoal) {
      form.reset({
        name: editingGoal.name,
        type: editingGoal.type as GoalType,
        month: editingGoal.month,
        year: editingGoal.year,
        target: editingGoal.target,
        current: editingGoal.current || 0,
        currency: editingGoal.currency as any,
        icon: editingGoal.icon || undefined,
        notes: editingGoal.notes || "",
        status: editingGoal.status as any,
        responsiblePerson: editingGoal.responsiblePerson || "",
        country: editingGoal.country || "",
      });
    } else {
      form.reset({
        name: "",
        type: "financial",
        month: defaultMonth,
        year: defaultYear,
        target: 0,
        current: 0,
        currency: undefined,
        icon: undefined,
        notes: "",
        status: "not_started",
        responsiblePerson: "",
        country: "",
      });
    }
  }, [editingGoal, defaultMonth, defaultYear, form, open]);

  const watchedType = form.watch("type");
  const typeConfig = goalTypeConfigs[watchedType];
  const selectedIcon = form.watch("icon");

  const handleSubmit = (data: GoalFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {editingGoal ? t("common.edit") : t("goals.addGoal")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormLabel>{t("form.month")} / {t("form.year")}</FormLabel>
              <MonthYearSelector
                month={form.watch("month")}
                year={form.watch("year")}
                onMonthChange={(m) => form.setValue("month", m)}
                onYearChange={(y) => form.setValue("year", y)}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.goalType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-goal-type">
                        <SelectValue placeholder={t("form.selectType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(goalTypeConfigs).map(([key, config]) => (
                        <SelectItem key={key} value={key} data-testid={`option-type-${key}`}>
                          {language === "ar" ? config.labelAr : config.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.goalName")}</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-goal-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.target")}
                      {typeConfig?.isPercentage && " (%)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-target"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.current")} {t("form.optional")}
                      {typeConfig?.isPercentage && " (%)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-current"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {typeConfig?.hasCurrency && (
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.currency")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue placeholder={t("form.selectCurrency")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {language === "ar" ? curr.labelAr : curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {typeConfig?.hasCountry && (
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.country")} {t("form.optional")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder={t("form.selectStatus")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {goalStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {t(status.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.icon")} {t("form.optional")}</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {availableIcons.map((iconItem) => {
                      const IconComp = iconItem.icon;
                      const isSelected = selectedIcon === iconItem.name;
                      return (
                        <Button
                          key={iconItem.name}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="icon"
                          onClick={() => field.onChange(isSelected ? undefined : iconItem.name)}
                          className={cn(
                            "transition-all",
                            !isSelected && "text-muted-foreground"
                          )}
                          data-testid={`button-icon-${iconItem.name}`}
                        >
                          <IconComp className="h-4 w-4" />
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsiblePerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.responsiblePerson")} {t("form.optional")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-responsible" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.notes")} {t("form.optional")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      className="resize-none"
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                {t("form.cancel")}
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save">
                {isPending ? t("common.loading") : t("form.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
