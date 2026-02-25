import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings,
  Globe,
  Moon,
  Sun,
  DollarSign,
  Target,
  Users,
  FileText,
  UserCircle,
  Bell,
  Palette,
  Shield,
  Building2,
  Calendar,
  Clock,
  Percent,
  Hash,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Check,
  Monitor,
  Play,
  RefreshCw,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCurrency, currencies, type Currency } from "@/contexts/CurrencyContext";
import { useData } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { safeJsonParse } from "../utils/safeJson";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeAvatar } from "@/components/employee-avatar";

interface SettingsSection {
  id: string;
  icon: React.ElementType;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

const sections: SettingsSection[] = [
  { id: "general", icon: Building2, titleAr: "الإعدادات العامة", titleEn: "General Settings", descAr: "إعدادات الشركة والنظام", descEn: "Company and system settings" },
  { id: "financial", icon: DollarSign, titleAr: "الإعدادات المالية", titleEn: "Financial Settings", descAr: "إعدادات العملات والضرائب", descEn: "Currency and tax settings" },
  { id: "goals", icon: Target, titleAr: "إعدادات الأهداف", titleEn: "Goals Settings", descAr: "إعدادات أنواع وسلوك الأهداف", descEn: "Goal types and behavior settings" },
  { id: "clients", icon: Users, titleAr: "إعدادات العملاء", titleEn: "Clients Settings", descAr: "إعدادات دورة حياة العملاء", descEn: "Client lifecycle settings" },
  { id: "invoices", icon: FileText, titleAr: "إعدادات الفواتير", titleEn: "Invoices Settings", descAr: "إعدادات تنسيق وسلوك الفواتير", descEn: "Invoice format and behavior settings" },
  { id: "team", icon: UserCircle, titleAr: "الفريق والصلاحيات", titleEn: "Team & Permissions", descAr: "إدارة الأدوار والصلاحيات", descEn: "Manage roles and permissions" },
  { id: "timetracking", icon: Clock, titleAr: "متابعة ساعات العمل", titleEn: "Time Tracking", descAr: "مراجعة ساعات عمل الموظفين", descEn: "View employee work hours" },
  { id: "notifications", icon: Bell, titleAr: "إعدادات الإشعارات", titleEn: "Notifications Settings", descAr: "إعدادات التنبيهات والتذكيرات", descEn: "Alerts and reminders settings" },
  { id: "appearance", icon: Palette, titleAr: "المظهر والواجهة", titleEn: "UI & Appearance", descAr: "تخصيص مظهر لوحة التحكم", descEn: "Customize dashboard appearance" },
  { id: "data", icon: Shield, titleAr: "البيانات والأمان", titleEn: "Data & Safety", descAr: "تصدير البيانات وإعادة التعيين", descEn: "Export data and reset options" },
];

interface WorkSession {
  id: string;
  employeeId: string;
  date: string;
  status: "not_started" | "working" | "on_break" | "ended";
  startAt: string | null;
  endAt: string | null;
  segments: string;
  totals: string;
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { employees } = useData();
  const { toast } = useToast();
  const [openSections, setOpenSections] = useState<string[]>(["general"]);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    companyName: "Vevoline",
    dateFormat: "DD/MM/YYYY",
    timezone: "Asia/Istanbul",
    // Financial
    defaultGoalCurrency: "TRY" as Currency,
    defaultInvoiceCurrency: "TRY" as Currency,
    enableMultiCurrency: true,
    defaultTaxRate: 18,
    enableTaxPerInvoice: true,
    currencySymbolPosition: "before",
    // Goals
    enabledGoalTypes: ["financial", "clients", "leads", "projects", "performance", "custom"],
    defaultGoalStatus: "in_progress",
    allowManualProgress: true,
    enableGoalCarryOver: false,
    // Clients
    clientStatuses: ["active", "on_hold", "expired"],
    defaultClientStatus: "active",
    enableExpirationReminders: true,
    reminderDays: 7,
    allowMultiplePackages: true,
    // Invoices
    invoiceFormat: "INV-0001",
    defaultDueDays: 14,
    allowEditPaidInvoices: false,
    invoiceFooter: "",
    enablePdfExport: true,
    // Team
    roles: ["admin", "manager", "staff"],
    defaultRole: "staff",
    allowSelfEdit: true,
    // Notifications
    notifyExpiringClients: true,
    notifyOverdueInvoices: true,
    notifyGoalsBehind: true,
    notificationDelivery: "in_app",
    // Appearance
    sidebarMode: "expanded",
    enableAnimations: true,
    density: "comfortable",
    // Data
    confirmDeletes: true,
  });

  // Fetch settings from API
  const { data: serverSettings, isLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/system-settings"],
  });

  // Fetch work sessions for time tracking audit
  const { data: workSessions, isLoading: sessionsLoading, refetch: refetchWorkSessions } = useQuery<WorkSession[]>({
    queryKey: ["/api/work-sessions"],
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const res = await apiRequest("POST", "/api/system-settings", newSettings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      toast({
        title: language === "ar" ? "تم الحفظ" : "Saved",
        description: language === "ar" ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "فشل حفظ الإعدادات" : `Failed to save settings: ${error.message}`,
      });
    }
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  // Sync settings when server data changes
  useEffect(() => {
    if (serverSettings) {
      let parsedSettings = {};
      
      // Check if we have the nested settings object (from DB) or flat settings
      if (serverSettings.settings) {
        parsedSettings = typeof serverSettings.settings === 'string' 
          ? safeJsonParse(serverSettings.settings, {}) 
          : serverSettings.settings;
      } else if (Object.keys(serverSettings).length > 0) {
        // Fallback for flat structure if API changed
        parsedSettings = serverSettings;
      }

      if (Object.keys(parsedSettings).length > 0) {
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    }
  }, [serverSettings]);

  const content = {
    ar: {
      title: "الإعدادات",
      subtitle: "إدارة تفضيلات النظام والأعمال",
      save: "حفظ التغييرات",
      companyName: "اسم الشركة",
      companyLogo: "شعار الشركة",
      uploadLogo: "رفع الشعار",
      defaultLanguage: "اللغة الافتراضية",
      arabic: "العربية",
      english: "English",
      defaultCurrency: "العملة الافتراضية",
      dateFormat: "تنسيق التاريخ",
      timezone: "المنطقة الزمنية",
      defaultGoalCurrency: "عملة الأهداف الافتراضية",
      defaultInvoiceCurrency: "عملة الفواتير الافتراضية",
      enableMultiCurrency: "تفعيل العملات المتعددة",
      defaultTaxRate: "نسبة الضريبة الافتراضية",
      enableTaxPerInvoice: "تفعيل الضريبة لكل فاتورة",
      currencyPosition: "موضع رمز العملة",
      before: "قبل المبلغ",
      after: "بعد المبلغ",
      enabledGoalTypes: "أنواع الأهداف المفعّلة",
      financial: "مالي",
      clients: "عملاء",
      leads: "عملاء محتملين",
      projects: "مشاريع",
      performance: "أداء",
      custom: "مخصص",
      defaultGoalStatus: "حالة الهدف الافتراضية",
      inProgress: "قيد التنفيذ",
      draft: "مسودة",
      allowManualProgress: "السماح بتعديل التقدم يدوياً",
      enableGoalCarryOver: "ترحيل الأهداف للشهر التالي",
      clientStatuses: "حالات العملاء",
      active: "نشط",
      onHold: "معلق",
      expired: "منتهي",
      defaultClientStatus: "الحالة الافتراضية للعميل",
      enableExpirationReminders: "تفعيل تذكيرات انتهاء الصلاحية",
      reminderDays: "أيام التذكير قبل الانتهاء",
      allowMultiplePackages: "السماح بباقات متعددة للعميل",
      invoiceFormat: "تنسيق رقم الفاتورة",
      sequential: "تسلسلي (INV-0001)",
      yearBased: "سنوي (INV-2026-001)",
      defaultDueDays: "أيام الاستحقاق الافتراضية",
      allowEditPaidInvoices: "السماح بتعديل الفواتير المدفوعة",
      invoiceFooter: "نص تذييل الفاتورة",
      enablePdfExport: "تفعيل تصدير PDF",
      roles: "الأدوار",
      admin: "مدير",
      manager: "مشرف",
      staff: "موظف",
      defaultRole: "الدور الافتراضي للموظف الجديد",
      allowSelfEdit: "السماح للموظف بتعديل ملفه",
      notifyExpiringClients: "إشعار العملاء المنتهين",
      notifyOverdueInvoices: "إشعار الفواتير المتأخرة",
      notifyGoalsBehind: "إشعار الأهداف المتأخرة",
      notificationDelivery: "طريقة التوصيل",
      inAppOnly: "داخل التطبيق فقط",
      theme: "السمة",
      light: "فاتح",
      dark: "داكن",
      system: "تلقائي",
      sidebarMode: "وضع الشريط الجانبي",
      expanded: "موسع",
      collapsed: "مطوي",
      enableAnimations: "تفعيل الحركات",
      density: "كثافة العرض",
      comfortable: "مريح",
      compact: "مضغوط",
      exportData: "تصدير البيانات",
      exportGoals: "تصدير الأهداف",
      exportClients: "تصدير العملاء",
      exportInvoices: "تصدير الفواتير",
      resetDemoData: "إعادة تعيين البيانات التجريبية",
      confirmDeletes: "تأكيد عمليات الحذف",
      days: "يوم",
    },
    en: {
      title: "Settings",
      subtitle: "Manage system and business preferences",
      save: "Save Changes",
      companyName: "Company Name",
      companyLogo: "Company Logo",
      uploadLogo: "Upload Logo",
      defaultLanguage: "Default Language",
      arabic: "العربية",
      english: "English",
      defaultCurrency: "Default Currency",
      dateFormat: "Date Format",
      timezone: "Timezone",
      defaultGoalCurrency: "Default Goal Currency",
      defaultInvoiceCurrency: "Default Invoice Currency",
      enableMultiCurrency: "Enable Multi-Currency",
      defaultTaxRate: "Default Tax Rate",
      enableTaxPerInvoice: "Enable Tax Per Invoice",
      currencyPosition: "Currency Symbol Position",
      before: "Before Amount",
      after: "After Amount",
      enabledGoalTypes: "Enabled Goal Types",
      financial: "Financial",
      clients: "Clients",
      leads: "Leads",
      projects: "Projects",
      performance: "Performance",
      custom: "Custom",
      defaultGoalStatus: "Default Goal Status",
      inProgress: "In Progress",
      draft: "Draft",
      allowManualProgress: "Allow Manual Progress Editing",
      enableGoalCarryOver: "Enable Goal Carry-Over to Next Month",
      clientStatuses: "Client Statuses",
      active: "Active",
      onHold: "On Hold",
      expired: "Expired",
      defaultClientStatus: "Default Client Status",
      enableExpirationReminders: "Enable Expiration Reminders",
      reminderDays: "Reminder Days Before Expiry",
      allowMultiplePackages: "Allow Multiple Packages Per Client",
      invoiceFormat: "Invoice Number Format",
      sequential: "Sequential (INV-0001)",
      yearBased: "Year-based (INV-2026-001)",
      defaultDueDays: "Default Due Days",
      allowEditPaidInvoices: "Allow Editing Paid Invoices",
      invoiceFooter: "Invoice Footer Text",
      enablePdfExport: "Enable PDF Export",
      roles: "Roles",
      admin: "Admin",
      manager: "Manager",
      staff: "Staff",
      defaultRole: "Default Role for New Employees",
      allowSelfEdit: "Allow Employee Self-Edit Profile",
      notifyExpiringClients: "Notify Expiring Clients",
      notifyOverdueInvoices: "Notify Overdue Invoices",
      notifyGoalsBehind: "Notify Goals Behind Schedule",
      notificationDelivery: "Delivery Method",
      inAppOnly: "In-App Only",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      system: "System",
      sidebarMode: "Sidebar Mode",
      expanded: "Expanded",
      collapsed: "Collapsed",
      enableAnimations: "Enable Animations",
      density: "Display Density",
      comfortable: "Comfortable",
      compact: "Compact",
      exportData: "Export Data",
      exportGoals: "Export Goals",
      exportClients: "Export Clients",
      exportInvoices: "Export Invoices",
      resetDemoData: "Reset Demo Data",
      confirmDeletes: "Confirm Delete Actions",
      days: "days",
    },
  };

  const t = content[language];

  const goalTypes = [
    { key: "financial", label: t.financial },
    { key: "clients", label: t.clients },
    { key: "leads", label: t.leads },
    { key: "projects", label: t.projects },
    { key: "performance", label: t.performance },
    { key: "custom", label: t.custom },
  ];

  const toggleGoalType = (type: string) => {
    const current = settings.enabledGoalTypes;
    if (current.includes(type)) {
      updateSetting("enabledGoalTypes", current.filter(t => t !== type));
    } else {
      updateSetting("enabledGoalTypes", [...current, type]);
    }
  };

  const renderSection = (section: SettingsSection) => {
    const Icon = section.icon;
    const isOpen = openSections.includes(section.id);
    const title = language === "ar" ? section.titleAr : section.titleEn;
    const desc = language === "ar" ? section.descAr : section.descEn;

    return (
      <Collapsible key={section.id} open={isOpen} onOpenChange={() => toggleSection(section.id)}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger className="w-full" data-testid={`section-${section.id}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 cursor-pointer hover-elevate py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-start">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="text-sm">{desc}</CardDescription>
                </div>
              </div>
              {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-6">
              {section.id === "general" && renderGeneralSettings()}
              {section.id === "financial" && renderFinancialSettings()}
              {section.id === "goals" && renderGoalsSettings()}
              {section.id === "clients" && renderClientsSettings()}
              {section.id === "invoices" && renderInvoicesSettings()}
              {section.id === "team" && renderTeamSettings()}
              {section.id === "timetracking" && renderTimeTrackingSettings()}
              {section.id === "notifications" && renderNotificationsSettings()}
              {section.id === "appearance" && renderAppearanceSettings()}
              {section.id === "data" && renderDataSettings()}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.companyName}</Label>
          <Input
            value={settings.companyName}
            onChange={(e) => updateSetting("companyName", e.target.value)}
            data-testid="input-company-name"
          />
        </div>
        <div className="space-y-2">
          <Label>{t.companyLogo}</Label>
          <Button variant="outline" className="w-full" data-testid="button-upload-logo">
            {t.uploadLogo}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.defaultLanguage}</Label>
        <div className="flex gap-2">
          <Button
            variant={language === "ar" ? "default" : "outline"}
            onClick={() => setLanguage("ar")}
            className="flex-1"
            data-testid="button-lang-arabic"
          >
            {t.arabic}
          </Button>
          <Button
            variant={language === "en" ? "default" : "outline"}
            onClick={() => setLanguage("en")}
            className="flex-1"
            data-testid="button-lang-english"
          >
            {t.english}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.defaultCurrency}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(currencies) as Currency[]).map((curr) => (
            <Button
              key={curr}
              variant={currency === curr ? "default" : "outline"}
              onClick={() => setCurrency(curr)}
              data-testid={`button-currency-${curr}`}
            >
              {currencies[curr].symbol} {curr}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.dateFormat}</Label>
          <Select value={settings.dateFormat} onValueChange={(v) => updateSetting("dateFormat", v)}>
            <SelectTrigger data-testid="select-date-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.timezone}</Label>
          <Select value={settings.timezone} onValueChange={(v) => updateSetting("timezone", v)}>
            <SelectTrigger data-testid="select-timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Istanbul">Istanbul (GMT+3)</SelectItem>
              <SelectItem value="Asia/Riyadh">Riyadh (GMT+3)</SelectItem>
              <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
              <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderFinancialSettings = () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.defaultGoalCurrency}</Label>
          <Select value={settings.defaultGoalCurrency} onValueChange={(v) => updateSetting("defaultGoalCurrency", v as Currency)}>
            <SelectTrigger data-testid="select-goal-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(currencies) as Currency[]).map((curr) => (
                <SelectItem key={curr} value={curr}>{currencies[curr].symbol} {curr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.defaultInvoiceCurrency}</Label>
          <Select value={settings.defaultInvoiceCurrency} onValueChange={(v) => updateSetting("defaultInvoiceCurrency", v as Currency)}>
            <SelectTrigger data-testid="select-invoice-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(currencies) as Currency[]).map((curr) => (
                <SelectItem key={curr} value={curr}>{currencies[curr].symbol} {curr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">{t.enableMultiCurrency}</Label>
          <p className="text-sm text-muted-foreground">Allow using different currencies for clients and invoices</p>
        </div>
        <Switch
          checked={settings.enableMultiCurrency}
          onCheckedChange={(checked) => updateSetting("enableMultiCurrency", checked)}
          data-testid="switch-multi-currency"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.defaultTaxRate} (%)</Label>
          <Input
            type="number"
            value={settings.defaultTaxRate}
            onChange={(e) => updateSetting("defaultTaxRate", Number(e.target.value))}
            data-testid="input-tax-rate"
          />
        </div>
        <div className="space-y-2">
          <Label>{t.currencyPosition}</Label>
          <Select value={settings.currencySymbolPosition} onValueChange={(v) => updateSetting("currencySymbolPosition", v)}>
            <SelectTrigger data-testid="select-currency-position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="before">{t.before}</SelectItem>
              <SelectItem value="after">{t.after}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">{t.enableTaxPerInvoice}</Label>
          <p className="text-sm text-muted-foreground">Allow overriding tax rate for specific invoices</p>
        </div>
        <Switch
          checked={settings.enableTaxPerInvoice}
          onCheckedChange={(checked) => updateSetting("enableTaxPerInvoice", checked)}
          data-testid="switch-tax-per-invoice"
        />
      </div>
    </div>
  );

  const renderGoalsSettings = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>{t.enabledGoalTypes}</Label>
        <div className="grid grid-cols-2 gap-3">
          {goalTypes.map((type) => (
            <div key={type.key} className="flex items-center space-x-2 space-x-reverse">
              <Switch
                checked={settings.enabledGoalTypes.includes(type.key)}
                onCheckedChange={() => toggleGoalType(type.key)}
                data-testid={`switch-goal-type-${type.key}`}
              />
              <Label className="font-normal">{type.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.defaultGoalStatus}</Label>
          <Select value={settings.defaultGoalStatus} onValueChange={(v) => updateSetting("defaultGoalStatus", v)}>
            <SelectTrigger data-testid="select-goal-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">{t.inProgress}</SelectItem>
              <SelectItem value="draft">{t.draft}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.allowManualProgress}</Label>
            <p className="text-sm text-muted-foreground">Allow manually overriding goal progress percentage</p>
          </div>
          <Switch
            checked={settings.allowManualProgress}
            onCheckedChange={(checked) => updateSetting("allowManualProgress", checked)}
            data-testid="switch-manual-progress"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.enableGoalCarryOver}</Label>
            <p className="text-sm text-muted-foreground">Automatically carry over unfinished goals to next month</p>
          </div>
          <Switch
            checked={settings.enableGoalCarryOver}
            onCheckedChange={(checked) => updateSetting("enableGoalCarryOver", checked)}
            data-testid="switch-goal-carry-over"
          />
        </div>
      </div>
    </div>
  );

  const renderClientsSettings = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t.defaultClientStatus}</Label>
        <Select value={settings.defaultClientStatus} onValueChange={(v) => updateSetting("defaultClientStatus", v)}>
          <SelectTrigger data-testid="select-client-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t.active}</SelectItem>
            <SelectItem value="on_hold">{t.onHold}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.enableExpirationReminders}</Label>
            <p className="text-sm text-muted-foreground">Notify managers before client packages expire</p>
          </div>
          <Switch
            checked={settings.enableExpirationReminders}
            onCheckedChange={(checked) => updateSetting("enableExpirationReminders", checked)}
            data-testid="switch-exp-reminders"
          />
        </div>

        {settings.enableExpirationReminders && (
          <div className="space-y-2">
            <Label>{t.reminderDays}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-24"
                value={settings.reminderDays}
                onChange={(e) => updateSetting("reminderDays", Number(e.target.value))}
                data-testid="input-reminder-days"
              />
              <span className="text-sm text-muted-foreground">{t.days}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.allowMultiplePackages}</Label>
            <p className="text-sm text-muted-foreground">Allow assigning multiple service packages to a single client</p>
          </div>
          <Switch
            checked={settings.allowMultiplePackages}
            onCheckedChange={(checked) => updateSetting("allowMultiplePackages", checked)}
            data-testid="switch-multi-packages"
          />
        </div>
      </div>
    </div>
  );

  const renderInvoicesSettings = () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.invoiceFormat}</Label>
          <Select value={settings.invoiceFormat} onValueChange={(v) => updateSetting("invoiceFormat", v)}>
            <SelectTrigger data-testid="select-invoice-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INV-0001">{t.sequential}</SelectItem>
              <SelectItem value="INV-2026-001">{t.yearBased}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.defaultDueDays}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-24"
              value={settings.defaultDueDays}
              onChange={(e) => updateSetting("defaultDueDays", Number(e.target.value))}
              data-testid="input-due-days"
            />
            <span className="text-sm text-muted-foreground">{t.days}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.invoiceFooter}</Label>
        <Textarea
          placeholder="Payment instructions, bank details, etc."
          value={settings.invoiceFooter}
          onChange={(e) => updateSetting("invoiceFooter", e.target.value)}
          data-testid="textarea-invoice-footer"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.allowEditPaidInvoices}</Label>
            <p className="text-sm text-muted-foreground">Allow modification of invoices already marked as paid</p>
          </div>
          <Switch
            checked={settings.allowEditPaidInvoices}
            onCheckedChange={(checked) => updateSetting("allowEditPaidInvoices", checked)}
            data-testid="switch-edit-paid"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.enablePdfExport}</Label>
            <p className="text-sm text-muted-foreground">Enable generating PDF version of invoices</p>
          </div>
          <Switch
            checked={settings.enablePdfExport}
            onCheckedChange={(checked) => updateSetting("enablePdfExport", checked)}
            data-testid="switch-pdf-export"
          />
        </div>
      </div>
    </div>
  );

  const renderTeamSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">{t.roles}</Label>
          {isAdmin && (
            <Button variant="outline" size="sm" data-testid="button-add-role">
              Add Role
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {settings.roles.map((role) => (
            <div key={role} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{role}</span>
                {role === settings.defaultRole && (
                  <Badge variant="secondary" className="text-[10px]">Default</Badge>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-role-${role}`}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" data-testid={`button-delete-role-${role}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.defaultRole}</Label>
        <Select value={settings.defaultRole} onValueChange={(v) => updateSetting("defaultRole", v)}>
          <SelectTrigger data-testid="select-default-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settings.roles.map((role) => (
              <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">{t.allowSelfEdit}</Label>
          <p className="text-sm text-muted-foreground">Allow employees to edit their own profile information</p>
        </div>
        <Switch
          checked={settings.allowSelfEdit}
          onCheckedChange={(checked) => updateSetting("allowSelfEdit", checked)}
          data-testid="switch-self-edit"
        />
      </div>
    </div>
  );

  const renderTimeTrackingSettings = () => {
    if (sessionsLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => refetchWorkSessions()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {language === "ar" ? "تحديث" : "Refresh"}
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                <TableHead>{language === "ar" ? "إجمالي الساعات" : "Total Hours"}</TableHead>
                <TableHead className="text-end">{language === "ar" ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workSessions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {language === "ar" ? "لا توجد جلسات عمل" : "No work sessions found"}
                  </TableCell>
                </TableRow>
              ) : (
                workSessions?.slice(0, 5).map((session: any) => {
                  const employee = session.employee || employees.find(e => e.id === session.employeeId);

                  let totals: any = {};
                  totals = typeof session.totals === 'string' 
                    ? safeJsonParse(session.totals, {}) 
                    : (session.totals || {});

                  const totalMs = (totals.totalWorkingMs || 0);
                  const hours = Math.floor(totalMs / (1000 * 60 * 60));
                  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EmployeeAvatar 
                            name={employee?.name || "Unknown"} 
                            nameEn={employee?.nameEn || ""} 
                            profileImage={employee?.profileImage || undefined}
                            size="sm" 
                          />
                          <span className="font-medium">{employee?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{session.date}</TableCell>
                      <TableCell>
                        <Badge variant={session.status === "ended" ? "secondary" : "outline"} className="gap-1">
                          {session.status === "working" && <Play className="h-3 w-3 fill-current" />}
                          {session.status === "on_break" && <Coffee className="h-3 w-3" />}
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{hours}h {minutes}m</TableCell>
                      <TableCell className="text-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => {
                            // Navigate to work tracking page with filters pre-set would be ideal
                            // For now, we'll just go to the work-tracking page
                            window.location.href = `/work-sessions?employeeId=${session.employeeId}&date=${session.date}`;
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Button 
          variant="ghost" 
          className="px-0 h-auto text-primary hover:bg-transparent underline"
          onClick={() => window.location.href = "/work-sessions"}
        >
          {language === "ar" ? "عرض تقرير مفصل لجميع جلسات العمل →" : "View all work sessions in detailed report →"}
        </Button>
      </div>
    );
  };

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.notifyExpiringClients}</Label>
            <p className="text-sm text-muted-foreground">Alert when client packages are about to expire</p>
          </div>
          <Switch
            checked={settings.notifyExpiringClients}
            onCheckedChange={(checked) => updateSetting("notifyExpiringClients", checked)}
            data-testid="switch-notify-exp-clients"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.notifyOverdueInvoices}</Label>
            <p className="text-sm text-muted-foreground">Alert when invoices pass their due date</p>
          </div>
          <Switch
            checked={settings.notifyOverdueInvoices}
            onCheckedChange={(checked) => updateSetting("notifyOverdueInvoices", checked)}
            data-testid="switch-notify-overdue"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">{t.notifyGoalsBehind}</Label>
            <p className="text-sm text-muted-foreground">Alert when goal progress is significantly behind schedule</p>
          </div>
          <Switch
            checked={settings.notifyGoalsBehind}
            onCheckedChange={(checked) => updateSetting("notifyGoalsBehind", checked)}
            data-testid="switch-notify-goals"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.notificationDelivery}</Label>
        <Select value={settings.notificationDelivery} onValueChange={(v) => updateSetting("notificationDelivery", v)}>
          <SelectTrigger data-testid="select-notify-delivery">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_app">{t.inAppOnly}</SelectItem>
            <SelectItem value="email_in_app">Email & In-App</SelectItem>
            <SelectItem value="browser">Browser Push</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t.theme}</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
            className="gap-2"
            data-testid="button-theme-light"
          >
            <Sun className="h-4 w-4" /> {t.light}
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
            className="gap-2"
            data-testid="button-theme-dark"
          >
            <Moon className="h-4 w-4" /> {t.dark}
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            onClick={() => setTheme("system")}
            className="gap-2"
            data-testid="button-theme-system"
          >
            <Monitor className="h-4 w-4" /> {t.system}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.sidebarMode}</Label>
        <div className="flex gap-2">
          <Button
            variant={settings.sidebarMode === "expanded" ? "default" : "outline"}
            onClick={() => updateSetting("sidebarMode", "expanded")}
            className="flex-1"
            data-testid="button-sidebar-expanded"
          >
            {t.expanded}
          </Button>
          <Button
            variant={settings.sidebarMode === "collapsed" ? "default" : "outline"}
            onClick={() => updateSetting("sidebarMode", "collapsed")}
            className="flex-1"
            data-testid="button-sidebar-collapsed"
          >
            {t.collapsed}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">{t.enableAnimations}</Label>
          <p className="text-sm text-muted-foreground">Enable visual transitions and animations</p>
        </div>
        <Switch
          checked={settings.enableAnimations}
          onCheckedChange={(checked) => updateSetting("enableAnimations", checked)}
          data-testid="switch-animations"
        />
      </div>

      <div className="space-y-2">
        <Label>{t.density}</Label>
        <Select value={settings.density} onValueChange={(v) => updateSetting("density", v)}>
          <SelectTrigger data-testid="select-density">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comfortable">{t.comfortable}</SelectItem>
            <SelectItem value="compact">{t.compact}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>{t.exportData}</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" className="gap-2" data-testid="button-export-goals">
            <Download className="h-4 w-4" /> {t.exportGoals}
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-export-clients">
            <Download className="h-4 w-4" /> {t.exportClients}
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-export-invoices">
            <Download className="h-4 w-4" /> {t.exportInvoices}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">{t.confirmDeletes}</Label>
          <p className="text-sm text-muted-foreground">Show confirmation dialog before deleting records</p>
        </div>
        <Switch
          checked={settings.confirmDeletes}
          onCheckedChange={(checked) => updateSetting("confirmDeletes", checked)}
          data-testid="switch-confirm-deletes"
        />
      </div>

      <div className="pt-4 border-t">
        {isAdmin && (
          <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span className="font-semibold">Danger Zone</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Resetting demo data will clear all transactions, clients, and services created in this session.
            </p>
            <Button variant="destructive" className="w-full" data-testid="button-reset-demo">
              {t.resetDemoData}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-72" />
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1 space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button 
          size="lg" 
          className="gap-2 h-12 px-8 font-semibold shadow-lg hover-elevate"
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          data-testid="button-save-settings"
        >
          {saveSettingsMutation.isPending ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {t.save}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <div className="flex flex-col gap-1 sticky top-8">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = openSections.includes(section.id);
              const title = language === "ar" ? section.titleAr : section.titleEn;

              return (
                <Button
                  key={section.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "justify-start gap-3 h-12",
                    isActive && "bg-secondary font-semibold text-primary",
                    language === "ar" && "flex-row-reverse text-right"
                  )}
                  onClick={() => toggleSection(section.id)}
                  data-testid={`nav-section-${section.id}`}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  {title}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {sections.map(renderSection)}
        </div>
      </div>
    </div>
  );
}
