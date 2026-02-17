import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Language = "ar" | "en";
type Direction = "rtl" | "ltr";

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Navigation
    "nav.dashboard": "لوحة التحكم",
    "nav.goals": "الأهداف",
    "nav.clients": "العملاء",
    "nav.packages": "الباقات",
    "nav.invoices": "الفواتير",
    "nav.employees": "الموظفين",
    "nav.calendar": "التقويم",
    "nav.finance": "المالية",
    "nav.settings": "الإعدادات",
    "nav.sales": "المبيعات",
    "nav.workTracking": "متابعة العمل",
    
    // Goals Page
    "goals.title": "الأهداف",
    "goals.subtitle": "تتبع وإدارة أهدافك الشهرية",
    "goals.addGoal": "إضافة هدف",
    "goals.totalGoals": "إجمالي الأهداف",
    "goals.achieved": "محققة",
    "goals.inProgress": "قيد التنفيذ",
    "goals.completionRate": "نسبة الإنجاز",
    "goals.noGoals": "لا توجد أهداف لهذا الشهر",
    "goals.addFirstGoal": "أضف هدفك الأول",
    
    // Goal Types
    "goalType.financial": "مالي (الإيرادات)",
    "goalType.clients": "العملاء",
    "goalType.leads": "العملاء المحتملون",
    "goalType.projects": "المشاريع",
    "goalType.performance": "الأداء",
    "goalType.custom": "مخصص",
    
    // Goal Status
    "status.not_started": "لم يبدأ",
    "status.in_progress": "قيد التنفيذ",
    "status.achieved": "محقق",
    "status.failed": "فشل",
    
    // Goal Form
    "form.goalName": "اسم الهدف",
    "form.goalType": "نوع الهدف",
    "form.target": "الهدف",
    "form.current": "الحالي",
    "form.currency": "العملة",
    "form.icon": "الأيقونة",
    "form.notes": "ملاحظات",
    "form.status": "الحالة",
    "form.responsiblePerson": "المسؤول",
    "form.country": "الدولة",
    "form.month": "الشهر",
    "form.year": "السنة",
    "form.save": "حفظ",
    "form.cancel": "إلغاء",
    "form.selectType": "اختر النوع",
    "form.selectStatus": "اختر الحالة",
    "form.selectCurrency": "اختر العملة",
    "form.selectIcon": "اختر أيقونة",
    "form.optional": "(اختياري)",
    
    // Months
    "month.1": "يناير",
    "month.2": "فبراير",
    "month.3": "مارس",
    "month.4": "أبريل",
    "month.5": "مايو",
    "month.6": "يونيو",
    "month.7": "يوليو",
    "month.8": "أغسطس",
    "month.9": "سبتمبر",
    "month.10": "أكتوبر",
    "month.11": "نوفمبر",
    "month.12": "ديسمبر",
    
    // Common
    "common.loading": "جاري التحميل...",
    "common.error": "حدث خطأ",
    "common.retry": "إعادة المحاولة",
    "common.of": "من",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.view": "عرض",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.goals": "Goals",
    "nav.clients": "Clients",
    "nav.packages": "Packages",
    "nav.invoices": "Invoices",
    "nav.employees": "Employees",
    "nav.calendar": "Calendar",
    "nav.finance": "Finance",
    "nav.settings": "Settings",
    "nav.sales": "Sales",
    "nav.workTracking": "Work Tracking",
    
    // Goals Page
    "goals.title": "Goals",
    "goals.subtitle": "Track and manage your monthly goals",
    "goals.addGoal": "Add Goal",
    "goals.totalGoals": "Total Goals",
    "goals.achieved": "Achieved",
    "goals.inProgress": "In Progress",
    "goals.completionRate": "Completion Rate",
    "goals.noGoals": "No goals for this month",
    "goals.addFirstGoal": "Add your first goal",
    
    // Goal Types
    "goalType.financial": "Financial (Revenue)",
    "goalType.clients": "Clients",
    "goalType.leads": "Leads",
    "goalType.projects": "Projects",
    "goalType.performance": "Performance",
    "goalType.custom": "Custom",
    
    // Goal Status
    "status.not_started": "Not Started",
    "status.in_progress": "In Progress",
    "status.achieved": "Achieved",
    "status.failed": "Failed",
    
    // Goal Form
    "form.goalName": "Goal Name",
    "form.goalType": "Goal Type",
    "form.target": "Target",
    "form.current": "Current",
    "form.currency": "Currency",
    "form.icon": "Icon",
    "form.notes": "Notes",
    "form.status": "Status",
    "form.responsiblePerson": "Responsible Person",
    "form.country": "Country",
    "form.month": "Month",
    "form.year": "Year",
    "form.save": "Save",
    "form.cancel": "Cancel",
    "form.selectType": "Select type",
    "form.selectStatus": "Select status",
    "form.selectCurrency": "Select currency",
    "form.selectIcon": "Select icon",
    "form.optional": "(optional)",
    
    // Months
    "month.1": "January",
    "month.2": "February",
    "month.3": "March",
    "month.4": "April",
    "month.5": "May",
    "month.6": "June",
    "month.7": "July",
    "month.8": "August",
    "month.9": "September",
    "month.10": "October",
    "month.11": "November",
    "month.12": "December",
    
    // Common
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.retry": "Retry",
    "common.of": "of",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.view": "View",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("vevoline-language");
    return (saved as Language) || "ar";
  });

  const direction: Direction = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    localStorage.setItem("vevoline-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
