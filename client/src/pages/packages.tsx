import { useState } from "react";
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  MoreVertical,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Share2,
  Palette,
  Brain,
  Smartphone,
  Settings,
  Image,
  Video,
  Circle,
  FileText,
  Users,
  Megaphone,
  File,
  Layout,
  Clock,
  CreditCard,
  Truck,
  Layers,
  Edit,
  Star,
  Type,
  Book,
  BarChart,
  Zap,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { useData, type MainPackage, type SubPackage, type Deliverable, type Platform, platformLabels } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BillingType = "one_time" | "monthly" | "quarterly" | "yearly";

const billingTypes: Record<BillingType, { labelAr: string; labelEn: string }> = {
  one_time: { labelAr: "مرة واحدة", labelEn: "One-time" },
  monthly: { labelAr: "شهري", labelEn: "Monthly" },
  quarterly: { labelAr: "ربع سنوي", labelEn: "Quarterly" },
  yearly: { labelAr: "سنوي", labelEn: "Yearly" },
};

const currencyOptions: Currency[] = ["TRY", "USD", "EUR", "SAR"];

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  share2: Share2,
  globe: Globe,
  palette: Palette,
  brain: Brain,
  smartphone: Smartphone,
  settings: Settings,
  image: Image,
  video: Video,
  circle: Circle,
  "file-text": FileText,
  users: Users,
  megaphone: Megaphone,
  file: File,
  layout: Layout,
  clock: Clock,
  "credit-card": CreditCard,
  truck: Truck,
  package: Package,
  layers: Layers,
  edit: Edit,
  star: Star,
  type: Type,
  book: Book,
  "bar-chart": BarChart,
  zap: Zap,
  "message-circle": MessageCircle,
};

// Icon options with labels for dropdown
const iconOptions = [
  { key: "share2", labelAr: "مشاركة (سوشيال)", labelEn: "Share (Social)" },
  { key: "globe", labelAr: "كوكب (مواقع)", labelEn: "Globe (Website)" },
  { key: "palette", labelAr: "لوحة ألوان (هوية)", labelEn: "Palette (Branding)" },
  { key: "brain", labelAr: "دماغ (AI)", labelEn: "Brain (AI)" },
  { key: "smartphone", labelAr: "هاتف (تطبيق)", labelEn: "Smartphone (App)" },
  { key: "settings", labelAr: "إعدادات (مخصص)", labelEn: "Settings (Custom)" },
  { key: "image", labelAr: "صورة / تصاميم", labelEn: "Image / Designs" },
  { key: "video", labelAr: "فيديو / ريلز", labelEn: "Video / Reels" },
  { key: "circle", labelAr: "ستوري", labelEn: "Story" },
  { key: "megaphone", labelAr: "مكبر صوت / إعلانات", labelEn: "Megaphone / Ads" },
  { key: "users", labelAr: "مستخدمين / مجتمع", labelEn: "Users / Community" },
  { key: "star", labelAr: "نجمة", labelEn: "Star" },
  { key: "zap", labelAr: "برق / سريع", labelEn: "Zap / Fast" },
  { key: "file-text", labelAr: "تقارير", labelEn: "Reports" },
  { key: "file", labelAr: "ملف / صفحات", labelEn: "File / Pages" },
  { key: "layout", labelAr: "تخطيط", labelEn: "Layout" },
  { key: "clock", labelAr: "وقت", labelEn: "Time" },
  { key: "credit-card", labelAr: "دفع", labelEn: "Payment" },
  { key: "truck", labelAr: "شحن", labelEn: "Shipping" },
  { key: "package", labelAr: "منتجات", labelEn: "Products" },
  { key: "layers", labelAr: "طبقات / مقترحات", labelEn: "Layers / Concepts" },
  { key: "edit", labelAr: "تعديلات", labelEn: "Revisions" },
  { key: "book", labelAr: "دليل", labelEn: "Guide" },
  { key: "bar-chart", labelAr: "تحليل", labelEn: "Analysis" },
  { key: "message-circle", labelAr: "رسائل / دردشة", labelEn: "Messages / Chat" },
  { key: "type", labelAr: "خطوط", labelEn: "Typography" },
];

// Platform options
const allPlatforms: Platform[] = ["instagram", "facebook", "tiktok", "snapchat", "x", "linkedin", "youtube"];

// Template definitions for quick package creation
interface PackageTemplate {
  key: string;
  labelAr: string;
  labelEn: string;
  deliverables: Deliverable[];
  platforms?: Platform[];
}

const packageTemplates: PackageTemplate[] = [
  {
    key: "social_media",
    labelAr: "قالب سوشيال ميديا",
    labelEn: "Social Media Template",
    deliverables: [
      { key: "posts", labelAr: "منشور شهرياً", labelEn: "Posts/month", value: 10, icon: "image" },
      { key: "reels", labelAr: "ريلز شهرياً", labelEn: "Reels/month", value: 5, icon: "video" },
      { key: "stories", labelAr: "ستوري شهرياً", labelEn: "Stories/month", value: 15, icon: "circle" },
    ],
    platforms: ["instagram", "facebook"],
  },
  {
    key: "website",
    labelAr: "قالب موقع",
    labelEn: "Website Template",
    deliverables: [
      { key: "pages", labelAr: "عدد الصفحات", labelEn: "Pages included", value: 5, icon: "file" },
      { key: "responsive", labelAr: "تصميم متجاوب", labelEn: "Responsive", value: "نعم", icon: "smartphone" },
      { key: "dashboard", labelAr: "لوحة تحكم", labelEn: "Admin dashboard", value: "نعم", icon: "settings" },
      { key: "delivery", labelAr: "وقت التسليم", labelEn: "Delivery time", value: "14 يوم", icon: "clock" },
    ],
  },
  {
    key: "branding",
    labelAr: "قالب هوية بصرية",
    labelEn: "Branding Template",
    deliverables: [
      { key: "concepts", labelAr: "مقترحات", labelEn: "Concepts", value: 3, icon: "layers" },
      { key: "revisions", labelAr: "تعديلات", labelEn: "Revisions", value: 2, icon: "edit" },
      { key: "formats", labelAr: "الصيغ", labelEn: "File formats", value: "PNG, SVG, PDF", icon: "file" },
      { key: "delivery", labelAr: "وقت التسليم", labelEn: "Delivery time", value: "5 أيام", icon: "clock" },
    ],
  },
];

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  "main-pkg-1": { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-600 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800" },
  "main-pkg-2": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  "main-pkg-3": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  "main-pkg-4": { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400", border: "border-teal-200 dark:border-teal-800" },
  "main-pkg-5": { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
  "main-pkg-6": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
};

export default function PackagesPage() {
  const { language } = useLanguage();
  const { isAdmin } = useAuth();
  const { formatCurrency, convertAmount, currency: displayCurrency } = useCurrency();
  const {
    mainPackages,
    subPackages,
    addMainPackage,
    updateMainPackage,
    deleteMainPackage,
    addSubPackage,
    updateSubPackage,
    deleteSubPackage,
    getSubPackagesByMainPackage,
  } = useData();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(mainPackages.map((mp) => mp.id))
  );
  const [isMainPackageModalOpen, setIsMainPackageModalOpen] = useState(false);
  const [isSubPackageModalOpen, setIsSubPackageModalOpen] = useState(false);
  const [editingMainPackage, setEditingMainPackage] = useState<MainPackage | null>(null);
  const [editingSubPackage, setEditingSubPackage] = useState<SubPackage | null>(null);
  const [selectedMainPackageId, setSelectedMainPackageId] = useState<string | null>(null);

  const [mainFormData, setMainFormData] = useState({
    name: "",
    nameEn: "",
    icon: "share2",
    description: "",
    descriptionEn: "",
    order: 1,
    isActive: true,
  });

  const [subFormData, setSubFormData] = useState({
    mainPackageId: "",
    name: "",
    nameEn: "",
    price: "",
    currency: "USD" as Currency,
    billingType: "monthly" as BillingType,
    description: "",
    descriptionEn: "",
    duration: "",
    durationEn: "",
    deliverables: [] as Deliverable[],
    platforms: [] as Platform[],
    features: "",
    featuresEn: "",
    isActive: true,
    order: 1,
  });

  const content = {
    ar: {
      title: "الباقات",
      subtitle: "إدارة باقات الخدمات والأسعار",
      emptyTitle: "لا توجد باقات بعد",
      emptySubtitle: "أنشئ فئات وباقات خدمات لتسهيل عملية البيع",
      addCategory: "إضافة فئة",
      addPackage: "إضافة باقة",
      editCategory: "تعديل الفئة",
      editPackage: "تعديل الباقة",
      categoryName: "اسم الفئة (عربي)",
      categoryNameEn: "اسم الفئة (إنجليزي)",
      packageName: "اسم الباقة (عربي)",
      packageNameEn: "اسم الباقة (إنجليزي)",
      icon: "الأيقونة",
      description: "الوصف",
      descriptionEn: "الوصف (إنجليزي)",
      price: "السعر",
      currency: "العملة",
      billingType: "نوع الفوترة",
      duration: "المدة",
      durationEn: "المدة (إنجليزي)",
      features: "المميزات",
      featuresEn: "المميزات (إنجليزي)",
      isActive: "نشط",
      order: "الترتيب",
      save: "حفظ",
      cancel: "إلغاء",
      edit: "تعديل",
      delete: "حذف",
      totalCategories: "إجمالي الفئات",
      totalPackages: "إجمالي الباقات",
      activePackages: "الباقات النشطة",
      selectBilling: "اختر نوع الفوترة",
      selectCategory: "اختر الفئة",
      packages: "باقات",
      deliverables: "التسليمات",
      addDeliverable: "إضافة عنصر تسليم",
      deliverableLabelAr: "الاسم (عربي)",
      deliverableLabelEn: "الاسم (إنجليزي)",
      deliverableValue: "القيمة",
      deliverableIcon: "الأيقونة",
      platforms: "المنصات",
      applyTemplate: "تطبيق قالب",
      templates: "قوالب سريعة",
      basicInfo: "المعلومات الأساسية",
      pricingInfo: "التسعير والمدة",
      deliverablesSection: "التسليمات والمنصات",
      noPackagesInCategory: "لا توجد باقات في هذه الفئة",
      addPackageToCategory: "أضف باقة",
      active: "نشط",
      inactive: "غير نشط",
      mainPackage: "الباقة الأساسية",
    },
    en: {
      title: "Packages",
      subtitle: "Manage service packages and pricing",
      emptyTitle: "No packages yet",
      emptySubtitle: "Create categories and service packages to streamline sales",
      addCategory: "Add Category",
      addPackage: "Add Package",
      editCategory: "Edit Category",
      editPackage: "Edit Package",
      categoryName: "Category Name (Arabic)",
      categoryNameEn: "Category Name (English)",
      packageName: "Package Name (Arabic)",
      packageNameEn: "Package Name (English)",
      icon: "Icon",
      description: "Description",
      descriptionEn: "Description (English)",
      price: "Price",
      currency: "Currency",
      billingType: "Billing Type",
      duration: "Duration",
      durationEn: "Duration (English)",
      features: "Features",
      featuresEn: "Features (English)",
      isActive: "Active",
      order: "Order",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      totalCategories: "Total Categories",
      totalPackages: "Total Packages",
      activePackages: "Active Packages",
      selectBilling: "Select Billing Type",
      selectCategory: "Select Category",
      packages: "packages",
      deliverables: "Deliverables",
      addDeliverable: "Add Deliverable",
      deliverableLabelAr: "Label (Arabic)",
      deliverableLabelEn: "Label (English)",
      deliverableValue: "Value",
      deliverableIcon: "Icon",
      platforms: "Platforms",
      applyTemplate: "Apply Template",
      templates: "Quick Templates",
      basicInfo: "Basic Info",
      pricingInfo: "Pricing & Duration",
      deliverablesSection: "Deliverables & Platforms",
      noPackagesInCategory: "No packages in this category",
      addPackageToCategory: "Add Package",
      active: "Active",
      inactive: "Inactive",
      mainPackage: "Main Package",
    },
  };

  const t = content[language];

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconComponents[iconName] || Package;
    return IconComponent;
  };

  const getBillingName = (key: BillingType) => {
    return language === "ar" ? billingTypes[key].labelAr : billingTypes[key].labelEn;
  };

  const resetMainForm = () => {
    setMainFormData({
      name: "",
      nameEn: "",
      icon: "share2",
      description: "",
      descriptionEn: "",
      order: mainPackages.length + 1,
      isActive: true,
    });
    setEditingMainPackage(null);
  };

  const resetSubForm = () => {
    setSubFormData({
      mainPackageId: selectedMainPackageId || "",
      name: "",
      nameEn: "",
      price: "",
      currency: "USD",
      billingType: "monthly",
      description: "",
      descriptionEn: "",
      duration: "",
      durationEn: "",
      deliverables: [],
      platforms: [],
      features: "",
      featuresEn: "",
      isActive: true,
      order: 1,
    });
    setEditingSubPackage(null);
  };

  const openMainPackageModal = (pkg?: MainPackage) => {
    if (pkg) {
      setEditingMainPackage(pkg);
      setMainFormData({
        name: pkg.name,
        nameEn: pkg.nameEn || "",
        icon: pkg.icon || "share2",
        description: pkg.description || "",
        descriptionEn: pkg.descriptionEn || "",
        order: pkg.order || 1,
        isActive: pkg.isActive,
      });
    } else {
      resetMainForm();
    }
    setIsMainPackageModalOpen(true);
  };

  const openSubPackageModal = (mainPackageId: string, pkg?: SubPackage) => {
    setSelectedMainPackageId(mainPackageId);
    if (pkg) {
      setEditingSubPackage(pkg);
      setSubFormData({
        mainPackageId: pkg.mainPackageId,
        name: pkg.name,
        nameEn: pkg.nameEn || "",
        price: pkg.price.toString(),
        currency: pkg.currency,
        billingType: pkg.billingType,
        description: pkg.description || "",
        descriptionEn: pkg.descriptionEn || "",
        duration: pkg.duration || "",
        durationEn: pkg.durationEn || "",
        deliverables: pkg.deliverables || [],
        platforms: pkg.platforms || [],
        features: pkg.features || "",
        featuresEn: pkg.featuresEn || "",
        isActive: pkg.isActive,
        order: pkg.order || 1,
      });
    } else {
      resetSubForm();
      setSubFormData((prev) => ({ ...prev, mainPackageId }));
    }
    setIsSubPackageModalOpen(true);
  };

  const handleSaveMainPackage = () => {
    if (!mainFormData.name) return;

    const data: Omit<MainPackage, "id"> = {
      name: mainFormData.name,
      nameEn: mainFormData.nameEn || mainFormData.name,
      icon: mainFormData.icon,
      description: mainFormData.description || undefined,
      descriptionEn: mainFormData.descriptionEn || undefined,
      order: mainFormData.order,
      isActive: mainFormData.isActive,
    };

    if (editingMainPackage) {
      updateMainPackage(editingMainPackage.id, data);
    } else {
      addMainPackage(data);
    }

    setIsMainPackageModalOpen(false);
    resetMainForm();
  };

  const handleSaveSubPackage = () => {
    if (!subFormData.name || !subFormData.price || !subFormData.mainPackageId) return;

    const data: Omit<SubPackage, "id"> = {
      mainPackageId: subFormData.mainPackageId,
      name: subFormData.name,
      nameEn: subFormData.nameEn || subFormData.name,
      price: Number(subFormData.price),
      currency: subFormData.currency,
      billingType: subFormData.billingType,
      description: subFormData.description || undefined,
      descriptionEn: subFormData.descriptionEn || undefined,
      duration: subFormData.duration || undefined,
      durationEn: subFormData.durationEn || undefined,
      deliverables: subFormData.deliverables,
      platforms: subFormData.platforms.length > 0 ? subFormData.platforms : undefined,
      features: subFormData.features || undefined,
      featuresEn: subFormData.featuresEn || undefined,
      isActive: subFormData.isActive,
      order: subFormData.order,
    };

    if (editingSubPackage) {
      updateSubPackage(editingSubPackage.id, data);
    } else {
      addSubPackage(data);
    }

    setIsSubPackageModalOpen(false);
    resetSubForm();
  };

  // Template handler
  const applyTemplate = (template: PackageTemplate) => {
    setSubFormData((prev) => ({
      ...prev,
      deliverables: template.deliverables,
      platforms: template.platforms || [],
    }));
  };

  // Deliverable handlers
  const addDeliverable = () => {
    const newDeliverable: Deliverable = {
      key: `del-${Date.now()}`,
      labelAr: "",
      labelEn: "",
      value: "",
      icon: "star",
    };
    setSubFormData((prev) => ({
      ...prev,
      deliverables: [...prev.deliverables, newDeliverable],
    }));
  };

  const updateDeliverable = (index: number, field: keyof Deliverable, value: string | number) => {
    setSubFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d, i) => 
        i === index ? { ...d, [field]: value } : d
      ),
    }));
  };

  const removeDeliverable = (index: number) => {
    setSubFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index),
    }));
  };

  // Platform handler
  const togglePlatform = (platform: Platform) => {
    setSubFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleDeleteMainPackage = (id: string) => {
    deleteMainPackage(id);
  };

  const handleDeleteSubPackage = (id: string) => {
    deleteSubPackage(id);
  };

  const activeSubPackagesCount = subPackages.filter((sp) => sp.isActive).length;

  const renderDeliverable = (d: Deliverable) => {
    const IconComponent = (d.icon && iconComponents[d.icon]) || Check;
    const label = language === "ar" ? d.labelAr : d.labelEn;
    const value = typeof d.value === "number" ? d.value : d.value;

    return (
      <div key={d.key} className="flex items-center gap-2 text-sm">
        <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{value}</span>
      </div>
    );
  };

  const renderMainPackageModal = () => (
    <Dialog open={isMainPackageModalOpen} onOpenChange={setIsMainPackageModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingMainPackage ? t.editCategory : t.addCategory}</DialogTitle>
          <DialogDescription>
            {language === "ar" ? "أضف فئة جديدة للباقات" : "Add a new package category"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.categoryName} <span className="text-destructive">*</span></Label>
              <Input
                value={mainFormData.name}
                onChange={(e) => setMainFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t.categoryName}
                data-testid="input-main-package-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.categoryNameEn}</Label>
              <Input
                value={mainFormData.nameEn}
                onChange={(e) => setMainFormData((prev) => ({ ...prev, nameEn: e.target.value }))}
                placeholder={t.categoryNameEn}
                data-testid="input-main-package-name-en"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.icon}</Label>
              <Select
                value={mainFormData.icon}
                onValueChange={(v) => setMainFormData((prev) => ({ ...prev, icon: v }))}
              >
                <SelectTrigger data-testid="select-icon">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconPreview = iconComponents[mainFormData.icon] || Package;
                      const selectedOption = iconOptions.find(o => o.key === mainFormData.icon);
                      return (
                        <>
                          <IconPreview className="h-4 w-4" />
                          <span>{selectedOption ? (language === "ar" ? selectedOption.labelAr : selectedOption.labelEn) : mainFormData.icon}</span>
                        </>
                      );
                    })()}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => {
                    const IconComp = iconComponents[option.key] || Package;
                    return (
                      <SelectItem key={option.key} value={option.key}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          <span>{language === "ar" ? option.labelAr : option.labelEn}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.order}</Label>
              <Input
                type="number"
                value={mainFormData.order}
                onChange={(e) => setMainFormData((prev) => ({ ...prev, order: Number(e.target.value) }))}
                data-testid="input-main-package-order"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.description}</Label>
            <Textarea
              value={mainFormData.description}
              onChange={(e) => setMainFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t.description}
              data-testid="input-main-package-description"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="main-is-active">{t.isActive}</Label>
            <Switch
              id="main-is-active"
              checked={mainFormData.isActive}
              onCheckedChange={(checked) => setMainFormData((prev) => ({ ...prev, isActive: checked }))}
              data-testid="switch-main-is-active"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsMainPackageModalOpen(false)} data-testid="button-cancel-main">
            {t.cancel}
          </Button>
          <Button onClick={handleSaveMainPackage} disabled={!mainFormData.name} data-testid="button-save-main-package">
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderSubPackageModal = () => (
    <Dialog open={isSubPackageModalOpen} onOpenChange={setIsSubPackageModalOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingSubPackage ? t.editPackage : t.addPackage}</DialogTitle>
          <DialogDescription>
            {language === "ar" ? "أضف باقة جديدة مع التسليمات والمنصات" : "Add a new package with deliverables and platforms"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="basic" data-testid="tab-basic-info">{t.basicInfo}</TabsTrigger>
            {isAdmin && <TabsTrigger value="pricing" data-testid="tab-pricing">{t.pricingInfo}</TabsTrigger>}
            <TabsTrigger value="deliverables" data-testid="tab-deliverables">{t.deliverablesSection}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t.selectCategory} <span className="text-destructive">*</span></Label>
              <Select
                value={subFormData.mainPackageId}
                onValueChange={(v) => setSubFormData((prev) => ({ ...prev, mainPackageId: v }))}
              >
                <SelectTrigger data-testid="select-main-package">
                  <SelectValue placeholder={t.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  {mainPackages.map((mp) => (
                    <SelectItem key={mp.id} value={mp.id}>
                      {language === "ar" ? mp.name : (mp.nameEn || mp.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.packageName} <span className="text-destructive">*</span></Label>
                <Input
                  value={subFormData.name}
                  onChange={(e) => setSubFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={language === "ar" ? "مثال: سوشيال ميديا - سيلفر" : "e.g. Social Media - Silver"}
                  data-testid="input-sub-package-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.packageNameEn}</Label>
                <Input
                  value={subFormData.nameEn}
                  onChange={(e) => setSubFormData((prev) => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="e.g. Social Media - Silver"
                  data-testid="input-sub-package-name-en"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.description}</Label>
                <Textarea
                  value={subFormData.description}
                  onChange={(e) => setSubFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={language === "ar" ? "وصف الباقة بالعربي" : "Package description in Arabic"}
                  data-testid="input-sub-description"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.descriptionEn}</Label>
                <Textarea
                  value={subFormData.descriptionEn}
                  onChange={(e) => setSubFormData((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                  placeholder="Package description in English"
                  data-testid="input-sub-description-en"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="sub-is-active">{t.isActive}</Label>
              <Switch
                id="sub-is-active"
                checked={subFormData.isActive}
                onCheckedChange={(checked) => setSubFormData((prev) => ({ ...prev, isActive: checked }))}
                data-testid="switch-sub-is-active"
              />
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t.price} <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={subFormData.price}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0"
                    data-testid="input-sub-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.currency}</Label>
                  <Select
                    value={subFormData.currency}
                    onValueChange={(v) => setSubFormData((prev) => ({ ...prev, currency: v as Currency }))}
                  >
                    <SelectTrigger data-testid="select-sub-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.billingType}</Label>
                  <Select
                    value={subFormData.billingType}
                    onValueChange={(v) => setSubFormData((prev) => ({ ...prev, billingType: v as BillingType }))}
                  >
                    <SelectTrigger data-testid="select-sub-billing">
                      <SelectValue placeholder={t.selectBilling} />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(billingTypes) as BillingType[]).map((bt) => (
                        <SelectItem key={bt} value={bt}>
                          {language === "ar" ? billingTypes[bt].labelAr : billingTypes[bt].labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.duration}</Label>
                  <Input
                    value={subFormData.duration}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder={language === "ar" ? "مثال: 30 يوم" : "e.g. 30 days"}
                    data-testid="input-sub-duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.durationEn}</Label>
                  <Input
                    value={subFormData.durationEn}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, durationEn: e.target.value }))}
                    placeholder="e.g. 30 days"
                    data-testid="input-sub-duration-en"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.features}</Label>
                  <Textarea
                    value={subFormData.features}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, features: e.target.value }))}
                    placeholder={language === "ar" ? "أضف كل ميزة في سطر جديد" : "Add each feature on a new line"}
                    rows={3}
                    data-testid="input-sub-features"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.featuresEn}</Label>
                  <Textarea
                    value={subFormData.featuresEn}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, featuresEn: e.target.value }))}
                    placeholder="Add each feature on a new line"
                    rows={3}
                    data-testid="input-sub-features-en"
                  />
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="deliverables" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t.templates}</Label>
                <div className="flex gap-2 flex-wrap">
                  {packageTemplates.map((template) => (
                    <Button
                      key={template.key}
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      data-testid={`button-template-${template.key}`}
                    >
                      {language === "ar" ? template.labelAr : template.labelEn}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t.platforms}</Label>
              </div>
              <div className="flex flex-wrap gap-3">
                {allPlatforms.map((platform) => (
                  <div
                    key={platform}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      id={`platform-${platform}`}
                      checked={Array.isArray(subFormData.platforms) && subFormData.platforms.includes(platform)}
                      onCheckedChange={() => togglePlatform(platform)}
                      data-testid={`checkbox-platform-${platform}`}
                    />
                    <label
                      htmlFor={`platform-${platform}`}
                      className="text-sm cursor-pointer"
                    >
                      {language === "ar" ? platformLabels[platform].ar : platformLabels[platform].en}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t.deliverables}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addDeliverable}
                  data-testid="button-add-deliverable"
                >
                  <Plus className="h-4 w-4 me-1" />
                  {t.addDeliverable}
                </Button>
              </div>

              {subFormData.deliverables.length === 0 && (
                <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-muted-foreground text-sm">
                    {language === "ar" ? "لا توجد تسليمات. أضف عناصر أو استخدم قالب جاهز." : "No deliverables. Add items or use a template."}
                  </p>
                </div>
              )}

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {(Array.isArray(subFormData.deliverables) ? subFormData.deliverables : []).map((del, index) => (
                  <div key={del.key} className="p-3 border rounded-lg bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const DelIcon = iconComponents[del.icon || "star"] || Star;
                          return <DelIcon className="h-4 w-4 text-muted-foreground" />;
                        })()}
                        <span className="text-sm font-medium">
                          {language === "ar" 
                            ? (del.labelAr || `عنصر ${index + 1}`)
                            : (del.labelEn || `Item ${index + 1}`)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDeliverable(index)}
                        data-testid={`button-remove-deliverable-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <Input
                        placeholder={t.deliverableLabelAr}
                        value={del.labelAr}
                        onChange={(e) => updateDeliverable(index, "labelAr", e.target.value)}
                        data-testid={`input-del-label-ar-${index}`}
                      />
                      <Input
                        placeholder={t.deliverableLabelEn}
                        value={del.labelEn}
                        onChange={(e) => updateDeliverable(index, "labelEn", e.target.value)}
                        data-testid={`input-del-label-en-${index}`}
                      />
                      <Input
                        placeholder={t.deliverableValue}
                        value={del.value}
                        onChange={(e) => updateDeliverable(index, "value", e.target.value)}
                        data-testid={`input-del-value-${index}`}
                      />
                      <Select
                        value={del.icon || "star"}
                        onValueChange={(v) => updateDeliverable(index, "icon", v)}
                      >
                        <SelectTrigger data-testid={`select-del-icon-${index}`}>
                          <div className="flex items-center gap-1">
                            {(() => {
                              const IconPreview = iconComponents[del.icon || "star"] || Star;
                              return <IconPreview className="h-3 w-3" />;
                            })()}
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((opt) => {
                            const IconOpt = iconComponents[opt.key] || Package;
                            return (
                              <SelectItem key={opt.key} value={opt.key}>
                                <div className="flex items-center gap-2">
                                  <IconOpt className="h-4 w-4" />
                                  <span>{language === "ar" ? opt.labelAr : opt.labelEn}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsSubPackageModalOpen(false)} data-testid="button-cancel-sub">
            {t.cancel}
          </Button>
          <Button
            onClick={handleSaveSubPackage}
            disabled={!subFormData.name || !subFormData.price || !subFormData.mainPackageId}
            data-testid="button-save-sub-package"
          >
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (mainPackages.length === 0) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openMainPackageModal()} data-testid="button-add-category">
                <Plus className="h-4 w-4 me-2" />
                {t.addCategory}
              </Button>
            </div>
          )}
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Package className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t.emptyTitle}</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {t.emptySubtitle}
            </p>
            {isAdmin && (
              <Button onClick={() => openMainPackageModal()} data-testid="button-add-first-category">
                <Plus className="h-4 w-4 me-2" />
                {t.addCategory}
              </Button>
            )}
          </CardContent>
        </Card>

        {renderMainPackageModal()}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openMainPackageModal()} data-testid="button-add-category">
              <Plus className="h-4 w-4 me-2" />
              {t.addCategory}
            </Button>
            <Button onClick={() => openSubPackageModal(mainPackages[0]?.id || "")} data-testid="button-add-package">
              <Plus className="h-4 w-4 me-2" />
              {t.addPackage}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.totalCategories}</p>
              <p className="text-2xl font-bold">{mainPackages.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.totalPackages}</p>
              <p className="text-2xl font-bold">{subPackages.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.activePackages}</p>
              <p className="text-2xl font-bold">{activeSubPackagesCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {mainPackages
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((mainPkg) => {
            const Icon = getIcon(mainPkg.icon || "package");
            const colors = categoryColors[mainPkg.id] || categoryColors["main-pkg-1"];
            const categorySubPackages = getSubPackagesByMainPackage(mainPkg.id);
            const isExpanded = expandedCategories.has(mainPkg.id);

            return (
              <Collapsible
                key={mainPkg.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(mainPkg.id)}
              >
                <Card className={cn(!mainPkg.isActive && "opacity-60")} data-testid={`card-category-${mainPkg.id}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover-elevate rounded-t-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2.5 rounded-lg", colors.bg)}>
                            <Icon className={cn("h-5 w-5", colors.text)} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg" data-testid={`text-category-name-${mainPkg.id}`}>
                                {language === "ar" ? mainPkg.name : (mainPkg.nameEn || mainPkg.name)}
                              </CardTitle>
                              <Badge 
                                variant={mainPkg.isActive ? "secondary" : "outline"}
                                className={cn(
                                  "text-xs",
                                  mainPkg.isActive 
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                )}
                                data-testid={`text-status-category-${mainPkg.id}`}
                              >
                                {mainPkg.isActive ? t.active : t.inactive}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {categorySubPackages.length} {t.packages}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`button-menu-category-${mainPkg.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={language === "ar" ? "start" : "end"}>
                                <DropdownMenuItem onClick={() => openSubPackageModal(mainPkg.id)}>
                                  <Plus className="h-4 w-4 me-2" />
                                  {t.addPackage}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openMainPackageModal(mainPkg)}>
                                  <Pencil className="h-4 w-4 me-2" />
                                  {t.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteMainPackage(mainPkg.id)}
                                >
                                  <Trash2 className="h-4 w-4 me-2" />
                                  {t.delete}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {categorySubPackages.length === 0 ? (
                        <div className="text-center py-8 border-t">
                          <p className="text-muted-foreground mb-4">{t.noPackagesInCategory}</p>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              onClick={() => openSubPackageModal(mainPkg.id)}
                              data-testid={`button-add-package-to-${mainPkg.id}`}
                            >
                              <Plus className="h-4 w-4 me-2" />
                              {t.addPackageToCategory}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4 border-t">
                          {categorySubPackages
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map((subPkg) => (
                              <Card
                                key={subPkg.id}
                                className={cn(
                                  "hover-elevate border",
                                  colors.border,
                                  !subPkg.isActive && "opacity-60"
                                )}
                                data-testid={`card-package-${subPkg.id}`}
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <CardTitle className="text-base truncate" data-testid={`text-package-name-${subPkg.id}`}>
                                          {language === "ar" ? subPkg.name : (subPkg.nameEn || subPkg.name)}
                                        </CardTitle>
                                        <Badge 
                                          variant={subPkg.isActive ? "secondary" : "outline"}
                                          className={cn(
                                            "text-xs",
                                            subPkg.isActive 
                                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                          )}
                                          data-testid={`text-status-package-${subPkg.id}`}
                                        >
                                          {subPkg.isActive ? t.active : t.inactive}
                                        </Badge>
                                      </div>
                                      {subPkg.duration && (
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                          <Clock className="h-3 w-3 me-1" />
                                          {language === "ar" ? subPkg.duration : (subPkg.durationEn || subPkg.duration)}
                                        </Badge>
                                      )}
                                    </div>
                                    {isAdmin && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" data-testid={`button-menu-package-${subPkg.id}`}>
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={language === "ar" ? "start" : "end"}>
                                          <DropdownMenuItem onClick={() => openSubPackageModal(mainPkg.id, subPkg)}>
                                            <Pencil className="h-4 w-4 me-2" />
                                            {t.edit}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => handleDeleteSubPackage(subPkg.id)}
                                          >
                                            <Trash2 className="h-4 w-4 me-2" />
                                            {t.delete}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-xl font-bold">
                                      {isAdmin ? formatCurrency(
                                        convertAmount(subPkg.price, subPkg.currency as any, displayCurrency),
                                        displayCurrency
                                      ) : "---"}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {getBillingName(subPkg.billingType)}
                                    </Badge>
                                  </div>

                                  {subPkg.description && (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                      {language === "ar" ? subPkg.description : (subPkg.descriptionEn || subPkg.description)}
                                    </p>
                                  )}

                                  {subPkg.deliverables && Array.isArray(subPkg.deliverables) && subPkg.deliverables.length > 0 && (
                                    <div className="space-y-1.5 mb-3 p-2 rounded-md bg-muted/50">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">{t.deliverables}</p>
                                      {subPkg.deliverables.slice(0, 4).map(renderDeliverable)}
                                      {subPkg.deliverables.length > 4 && (
                                        <p className="text-xs text-muted-foreground">
                                          +{subPkg.deliverables.length - 4} {language === "ar" ? "أخرى" : "more"}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {subPkg.platforms && Array.isArray(subPkg.platforms) && subPkg.platforms.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{t.platforms}</p>
                                      <div className="flex flex-wrap gap-1">
                                        {subPkg.platforms.map((platform) => (
                                          <Badge key={platform} variant="secondary" className="text-xs">
                                            {language === "ar" ? platformLabels[platform].ar : platformLabels[platform].en}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {subPkg.features && (
                                    <div className="space-y-1">
                                      {(language === "ar" ? subPkg.features : (subPkg.featuresEn || subPkg.features))
                                        .split("\n")
                                        .slice(0, 3)
                                        .map((feature, i) => (
                                          <div key={i} className="flex items-center gap-2 text-sm">
                                            <Check className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                                            <span className="text-muted-foreground truncate">{feature}</span>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
      </div>

      {renderMainPackageModal()}
      {renderSubPackageModal()}
    </div>
  );
}
