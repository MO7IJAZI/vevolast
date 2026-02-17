import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useCurrency, type Currency } from "./CurrencyContext";

// ============ TYPE DEFINITIONS ============

// Lead Stages
export type LeadStage = "new" | "contacted" | "proposal_sent" | "negotiation" | "won" | "lost";

// Service Status
export type ServiceStatus = "not_started" | "in_progress" | "completed" | "on_hold" | "delayed";

// Invoice Status
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

// Finance Transaction Type
export type TransactionType = "income" | "expense";

// Goal Type
export type GoalType = "financial" | "clients" | "leads" | "projects" | "performance" | "custom";

// Goal Status
export type GoalStatus = "not_started" | "in_progress" | "achieved" | "failed";

export type EventSource = "manual" | "system";
export type EventType = "manual" | "package_end" | "delivery_due" | "payroll" | "client_payment";
export type EventStatus = "upcoming" | "today" | "overdue" | "done";
export type EventPriority = "low" | "medium" | "high";

// ============ INTERFACES ============

// Deliverable item for tracking service progress
export interface ServiceDeliverable {
  key: string;
  label: string;
  labelEn?: string;
  target: number;
  completed: number;
  isBoolean?: boolean; // For milestone-type deliverables
}

export interface ServiceItem {
  id: string;
  serviceType: string;
  serviceName: string;
  serviceNameEn?: string;
  startDate: string;
  dueDate: string;
  price?: number;
  currency?: Currency;
  status: ServiceStatus;
  assignedTo?: string; // Legacy single assignment
  serviceAssignees?: string[]; // Multi-employee assignment (execution team)
  salesEmployeeId?: string; // Who brought/sold this service
  completedDate?: string;
  packageId?: string;
  mainPackageId?: string;
  subPackageId?: string;
  deliverables?: ServiceDeliverable[]; // Progress tracking for work
  notes?: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  country?: string;
  source?: string;
  stage: LeadStage;
  dealValue?: number;
  dealCurrency?: Currency;
  estimatedValue?: string;
  currency?: Currency;
  expectedCloseDate?: string;
  notes?: string;
  negotiatorId?: string;
  createdAt: string;
  wasConfirmedClient?: boolean;
  convertedFromClientId?: string;
}

export interface ConfirmedClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  country?: string;
  source?: string;
  services: ServiceItem[];
  notes?: string;
  createdAt: string;
  convertedFromLeadId?: string;
  leadCreatedAt?: string;
  ownerId?: string;
  acquiredById?: string;
  salesOwnerId?: string; // Legacy single sales owner
  assignedManagerId?: string; // Legacy single assigned manager
  salesOwners?: string[]; // Multi sales owners (employee IDs)
  assignedStaff?: string[]; // Multi assigned staff (employee IDs)
  completedDate?: string;
  status: "active" | "on_hold" | "completed" | "expired" | "archived";
}

// Deliverable Item for Sub-Packages
export interface Deliverable {
  key: string;
  labelAr: string;
  labelEn: string;
  value: string | number;
  icon?: string;
}

// Main Package (Category)
export interface MainPackage {
  id: string;
  name: string;
  nameEn: string;
  icon?: string;
  description?: string;
  descriptionEn?: string;
  order: number;
  isActive: boolean;
}

// Sub-Package (What the Client Buys)
export type Platform = "instagram" | "facebook" | "tiktok" | "snapchat" | "x" | "linkedin" | "youtube";

export const platformLabels: Record<Platform, { ar: string; en: string }> = {
  instagram: { ar: "إنستغرام", en: "Instagram" },
  facebook: { ar: "فيسبوك", en: "Facebook" },
  tiktok: { ar: "تيك توك", en: "TikTok" },
  snapchat: { ar: "سناب شات", en: "Snapchat" },
  x: { ar: "إكس", en: "X" },
  linkedin: { ar: "لينكد إن", en: "LinkedIn" },
  youtube: { ar: "يوتيوب", en: "YouTube" },
};

export interface SubPackage {
  id: string;
  mainPackageId: string;
  name: string;
  nameEn: string;
  price: number;
  currency: Currency;
  billingType: "one_time" | "monthly" | "quarterly" | "yearly";
  description?: string;
  descriptionEn?: string;
  duration?: string;
  durationEn?: string;
  deliverables: Deliverable[];
  platforms?: Platform[];
  features?: string;
  featuresEn?: string;
  isActive: boolean;
  order: number;
}

// Legacy PackageItem for backward compatibility
export interface PackageItem {
  id: string;
  name: string;
  nameEn?: string;
  category: string;
  price: number;
  currency: Currency;
  billingType: "one_time" | "monthly" | "quarterly" | "yearly";
  description?: string;
  features?: string;
  duration?: string;
  isActive: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: Currency;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  notes?: string;
}

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  currency: Currency;
  description: string;
  date: string;
  relatedId?: string;
  relatedType?: string;
  status?: string;
  notes?: string;
  clientId?: string;
  serviceId?: string;
}

// Salary type for employees
export type SalaryType = "monthly" | "per_project";
export type RateType = "per_project" | "per_task" | "per_service";

// Job titles/specializations per department
export type SalesJobTitle = 
  | "sales_manager" 
  | "sales_rep" 
  | "account_executive" 
  | "business_development";

export type DeliveryJobTitle = 
  | "content_writer" 
  | "video_editor" 
  | "graphic_designer" 
  | "motion_designer"
  | "social_media_manager"
  | "account_manager"
  | "project_manager"
  | "seo_specialist"
  | "media_buyer";

export type TechJobTitle = "web_developer" | "app_developer";

export type AdminJobTitle = 
  | "general_manager" 
  | "operations_manager" 
  | "hr_manager" 
  | "finance_manager"
  | "assistant_manager"
  | "admin_assistant";

export type JobTitle = SalesJobTitle | DeliveryJobTitle | TechJobTitle | AdminJobTitle;

// Job title labels (bilingual)
export const jobTitleLabels: Record<JobTitle, { ar: string; en: string }> = {
  // Sales
  sales_manager: { ar: "مدير مبيعات", en: "Sales Manager" },
  sales_rep: { ar: "مندوب مبيعات", en: "Sales Representative" },
  account_executive: { ar: "مسؤول حسابات", en: "Account Executive" },
  business_development: { ar: "تطوير أعمال", en: "Business Development" },
  // Delivery
  content_writer: { ar: "كاتب محتوى", en: "Content Writer" },
  video_editor: { ar: "مصمم فيديوهات", en: "Video Editor" },
  graphic_designer: { ar: "مصمم جرافيك", en: "Graphic Designer" },
  motion_designer: { ar: "مصمم موشن", en: "Motion Designer" },
  web_developer: { ar: "مبرمج مواقع", en: "Web Developer" },
  app_developer: { ar: "مبرمج تطبيقات", en: "App Developer" },
  social_media_manager: { ar: "مدير سوشيال ميديا", en: "Social Media Manager" },
  account_manager: { ar: "مدير حسابات", en: "Account Manager" },
  project_manager: { ar: "مدير مشاريع", en: "Project Manager" },
  seo_specialist: { ar: "متخصص SEO", en: "SEO Specialist" },
  media_buyer: { ar: "مسؤول إعلانات", en: "Media Buyer" },
  // Admin
  general_manager: { ar: "مدير عام", en: "General Manager" },
  operations_manager: { ar: "مدير عمليات", en: "Operations Manager" },
  hr_manager: { ar: "مدير موارد بشرية", en: "HR Manager" },
  finance_manager: { ar: "مدير مالي", en: "Finance Manager" },
  assistant_manager: { ar: "مساعد مدير", en: "Assistant Manager" },
  admin_assistant: { ar: "مساعد إداري", en: "Admin Assistant" },
};

// Job titles grouped by department
export const jobTitlesByDepartment = {
  sales: ["sales_manager", "sales_rep", "account_executive", "business_development"] as SalesJobTitle[],
  delivery: [
    "content_writer", "video_editor", "graphic_designer", "motion_designer",
    "social_media_manager", "account_manager", "project_manager", "seo_specialist", "media_buyer"
  ] as DeliveryJobTitle[],
  tech: [
    "web_developer", "app_developer"
  ] as TechJobTitle[],
  admin: ["general_manager", "operations_manager", "hr_manager", "finance_manager", "assistant_manager", "admin_assistant"] as AdminJobTitle[],
};

export interface Employee {
  id: string;
  name: string;
  nameEn?: string;
  email: string;
  phone?: string;
  role: string; // Role/Job title in English
  roleAr?: string; // Role/Job title in Arabic
  department?: string;
  jobTitle?: JobTitle; // Specific job title/specialization
  profileImage?: string; // URL to employee avatar image
  // Salary system
  salaryType: SalaryType; // "monthly" or "per_project"
  salaryAmount?: number; // For monthly salary
  rate?: number; // For per-project/task workers
  rateType?: RateType; // "per_project" | "per_task" | "per_service"
  salaryCurrency: Currency; // Currency for salary/rate
  salaryNotes?: string; // Optional notes about payment
  startDate: string;
  isActive: boolean;
}

export interface CalendarEvent {
  id: string;
  source: EventSource;
  eventType: EventType;
  titleAr: string;
  titleEn?: string | null;
  date: string;
  time?: string | null;
  status: EventStatus;
  priority: EventPriority;
  clientId?: string | null;
  serviceId?: string | null;
  employeeId?: string | null;
  salesId?: string | null;
  notes?: string | null;
  reminderDays?: string | null;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  target: number;
  current?: number;
  month: number;
  year: number;
  currency?: Currency;
  icon?: string;
  status: GoalStatus;
  responsiblePerson?: string;
  country?: string;
  notes?: string;
}

// ============ CONTEXT INTERFACE ============

interface DataContextType {
  // Leads
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  convertLeadToClient: (leadId: string) => Promise<ConfirmedClient>;

  // Confirmed Clients
  clients: ConfirmedClient[];
  addClient: (client: Omit<ConfirmedClient, "id" | "createdAt" | "services">) => Promise<ConfirmedClient>;
  addClientWithService: (client: Omit<ConfirmedClient, "id" | "createdAt" | "services">, service: Omit<ServiceItem, "id">) => Promise<ConfirmedClient>;
  updateClient: (id: string, updates: Partial<ConfirmedClient>) => void;
  deleteClient: (id: string) => void;
  addServiceToClient: (clientId: string, service: Omit<ServiceItem, "id">) => Promise<void>;
  updateService: (clientId: string, serviceId: string, updates: Partial<ServiceItem>) => Promise<void>;
  deleteService: (clientId: string, serviceId: string) => void;
  archiveClient: (id: string) => void;
  restoreClient: (id: string) => void;
  reactivateClient: (id: string, resetServices?: boolean) => void;
  markClientCompleted: (id: string) => void;
  convertClientToLead: (clientId: string) => Lead | null;
  getCompletedClients: () => ConfirmedClient[];
  getCompletedClientsThisMonth: () => ConfirmedClient[];

  // Main Packages (Categories)
  mainPackages: MainPackage[];
  addMainPackage: (pkg: Omit<MainPackage, "id">) => MainPackage;
  updateMainPackage: (id: string, updates: Partial<MainPackage>) => void;
  deleteMainPackage: (id: string) => void;

  // Sub-Packages (Plans)
  subPackages: SubPackage[];
  addSubPackage: (pkg: Omit<SubPackage, "id">) => SubPackage;
  updateSubPackage: (id: string, updates: Partial<SubPackage>) => void;
  deleteSubPackage: (id: string) => void;
  getSubPackagesByMainPackage: (mainPackageId: string) => SubPackage[];

  // Legacy Packages (for backward compatibility)
  packages: PackageItem[];
  addPackage: (pkg: Omit<PackageItem, "id">) => PackageItem;
  updatePackage: (id: string, updates: Partial<PackageItem>) => void;
  deletePackage: (id: string) => void;

  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, "id">) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  markInvoicePaid: (id: string) => void;

  // Finance
  transactions: FinanceTransaction[];
  addTransaction: (transaction: Omit<FinanceTransaction, "id">) => FinanceTransaction;
  updateTransaction: (id: string, updates: Partial<FinanceTransaction>) => void;
  deleteTransaction: (id: string) => void;

  // Employees
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, "id">) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  // Calendar
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id">) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Goals
  goals: Goal[];
  addGoal: (goal: Omit<Goal, "id">) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  // Computed values for dashboard
  getActiveClients: () => ConfirmedClient[];
  getClientsWithExpiringServices: (days: number) => ConfirmedClient[];
  getServicesCompletedThisMonth: () => ServiceItem[];
  getTotalIncome: (month?: number, year?: number) => number;
  getTotalExpenses: (month?: number, year?: number) => number;
  getNetProfit: (month?: number, year?: number) => number;
  getOverdueInvoices: () => Invoice[];
  getUpcomingInvoices: (days: number) => Invoice[];
  getGoalCompletionRate: (month?: number, year?: number) => number;
  getTodayEvents: () => CalendarEvent[];
  getUpcomingDeadlines: (days: number) => CalendarEvent[];
  getMostUsedPackages: () => { pkg: PackageItem; count: number }[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ============ HELPER FUNCTIONS ============

function generateId(): string {
  return crypto.randomUUID();
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// ============ INITIAL SEED DATA ============

const initialLeads: Lead[] = [
  {
    id: "lead-1",
    name: "شركة التقنية المتقدمة",
    email: "info@advtech.com",
    phone: "+90 532 111 2233",
    company: "Advanced Tech Co.",
    country: "turkey",
    source: "website",
    stage: "proposal_sent",
    dealValue: 15000,
    dealCurrency: "USD",
    expectedCloseDate: "2026-02-15",
    notes: "مهتمون بخدمات السوشيال ميديا",
    negotiatorId: "emp-1",
    createdAt: "2026-01-15",
  },
  {
    id: "lead-2",
    name: "مؤسسة النور",
    email: "contact@alnoor.sa",
    phone: "+966 50 123 4567",
    company: "Al-Noor Foundation",
    country: "saudi",
    source: "referral",
    stage: "new",
    dealValue: 8000,
    dealCurrency: "SAR",
    notes: "يحتاجون موقع إلكتروني",
    negotiatorId: "emp-2",
    createdAt: "2026-01-20",
  },
  {
    id: "lead-3",
    name: "متجر الأناقة",
    email: "sales@elegance.ae",
    phone: "+971 4 555 6789",
    company: "Elegance Store",
    country: "uae",
    source: "instagram",
    stage: "negotiation",
    dealValue: 25000,
    dealCurrency: "USD",
    expectedCloseDate: "2026-02-01",
    notes: "يريدون تطبيق موبايل + موقع",
    negotiatorId: "emp-4",
    createdAt: "2026-01-10",
  },
  {
    id: "lead-4",
    name: "شركة الأمل للاستشارات",
    email: "info@alamal.com",
    phone: "+90 532 888 9999",
    company: "Al-Amal Consulting",
    country: "turkey",
    source: "ads",
    stage: "won",
    dealValue: 12000,
    dealCurrency: "USD",
    notes: "تم التحويل لعميل",
    negotiatorId: "emp-1",
    createdAt: "2026-01-05",
  },
  {
    id: "lead-5",
    name: "مجموعة السلام التجارية",
    email: "sales@alsalam.sa",
    phone: "+966 55 444 3333",
    company: "Al-Salam Trading",
    country: "saudi",
    source: "referral",
    stage: "won",
    dealValue: 18000,
    dealCurrency: "SAR",
    notes: "عميل جديد",
    negotiatorId: "emp-2",
    createdAt: "2026-01-12",
  },
  {
    id: "lead-6",
    name: "مطعم الفخامة",
    email: "info@alfakhama.ae",
    phone: "+971 4 222 1111",
    company: "Al-Fakhama Restaurant",
    country: "uae",
    source: "instagram",
    stage: "contacted",
    dealValue: 9000,
    dealCurrency: "USD",
    notes: "يحتاجون سوشيال ميديا",
    negotiatorId: "emp-4",
    createdAt: "2026-01-18",
  },
  {
    id: "lead-7",
    name: "شركة المستقبل العقارية",
    email: "info@future-realty.com",
    phone: "+90 532 777 6666",
    company: "Future Realty",
    country: "turkey",
    source: "website",
    stage: "proposal_sent",
    dealValue: 20000,
    dealCurrency: "TRY",
    notes: "موقع + تطبيق",
    negotiatorId: "emp-1",
    createdAt: "2025-12-15",
  },
  {
    id: "lead-8",
    name: "متجر الزهور",
    email: "sales@flowers.sa",
    phone: "+966 50 111 2222",
    company: "Flowers Shop",
    country: "saudi",
    source: "referral",
    stage: "won",
    dealValue: 7000,
    dealCurrency: "SAR",
    notes: "تم التحويل",
    negotiatorId: "emp-2",
    createdAt: "2025-12-10",
  },
  {
    id: "lead-9",
    name: "شركة الإنجاز",
    email: "info@achievement.ae",
    phone: "+971 4 333 4444",
    company: "Achievement Co.",
    country: "uae",
    source: "ads",
    stage: "lost",
    dealValue: 15000,
    dealCurrency: "USD",
    notes: "اختاروا منافس",
    negotiatorId: "emp-4",
    createdAt: "2025-12-20",
  },
];

const initialClients: ConfirmedClient[] = [
  {
    id: "client-1",
    name: "شركة الإبداع الرقمي",
    email: "hello@digitalcreativity.com",
    phone: "+90 535 222 3344",
    company: "Digital Creativity LLC",
    country: "turkey",
    source: "referral",
    status: "active",
    createdAt: "2025-11-01",
    salesOwnerId: "emp-1", // Legacy single
    assignedManagerId: "emp-3", // Legacy single
    salesOwners: ["emp-1"], // Ahmed Mohamed (Sales Manager)
    assignedStaff: ["emp-3", "emp-5"], // Mohamed Khaled (Developer), Khaled Omar (Account Manager)
    services: [
      {
        id: "svc-1",
        serviceType: "social_media",
        serviceName: "إدارة حسابات السوشيال ميديا",
        serviceNameEn: "Social Media Management",
        startDate: "2026-01-01",
        dueDate: "2026-06-30",
        price: 3500,
        currency: "USD",
        status: "in_progress",
        assignedTo: "أحمد",
        serviceAssignees: ["emp-6", "emp-7"], // Alaa (Designer), Noura (Media Buyer)
        mainPackageId: "main-pkg-1",
      },
      {
        id: "svc-2",
        serviceType: "website",
        serviceName: "تطوير موقع إلكتروني",
        serviceNameEn: "Website Development",
        startDate: "2025-12-01",
        dueDate: "2026-02-28",
        price: 8000,
        currency: "USD",
        status: "in_progress",
        assignedTo: "محمد",
        serviceAssignees: ["emp-3"], // Mohamed Khaled (Developer)
        mainPackageId: "main-pkg-2",
      },
    ],
  },
  {
    id: "client-2",
    name: "مطعم الشرق",
    email: "info@alsharq-restaurant.com",
    phone: "+90 532 444 5566",
    company: "Al-Sharq Restaurant",
    country: "saudi",
    source: "ads",
    status: "completed",
    createdAt: "2025-10-15",
    completedDate: "2026-01-25",
    salesOwnerId: "emp-1", // Legacy single
    assignedManagerId: "emp-2", // Legacy single
    salesOwners: ["emp-1", "emp-2"], // Ahmed + Sara (Sales)
    assignedStaff: ["emp-6"], // Alaa (Designer)
    services: [
      {
        id: "svc-3",
        serviceType: "social_media",
        serviceName: "Social Media – Gold",
        startDate: "2026-01-01",
        dueDate: "2026-01-31",
        price: 2000,
        currency: "USD",
        status: "completed",
        completedDate: "2026-01-25",
        assignedTo: "سارة",
        serviceAssignees: ["emp-6", "emp-7"], // Alaa (Designer), Noura (Media Buyer)
        mainPackageId: "main-pkg-1",
      },
      {
        id: "svc-4",
        serviceType: "branding",
        serviceName: "Logo / Branding",
        startDate: "2026-01-05",
        dueDate: "2026-01-10",
        price: 4500,
        currency: "TRY",
        status: "completed",
        completedDate: "2026-01-10",
        assignedTo: "سارة",
        serviceAssignees: ["emp-6"], // Alaa (Designer)
        mainPackageId: "main-pkg-3",
      },
    ],
  },
  {
    id: "client-3",
    name: "متجر الملابس العصرية",
    email: "contact@modernfashion.sa",
    phone: "+966 55 777 8899",
    company: "Modern Fashion",
    country: "saudi",
    source: "website",
    status: "active",
    createdAt: "2025-12-01",
    salesOwnerId: "emp-4", // Legacy single
    assignedManagerId: "emp-5", // Legacy single
    salesOwners: ["emp-4"], // Layla Hassan (Sales Rep)
    assignedStaff: ["emp-5", "emp-3"], // Khaled Omar (Account Manager), Mohamed (Developer)
    services: [
      {
        id: "svc-5",
        serviceType: "app",
        serviceName: "تطبيق متجر إلكتروني",
        serviceNameEn: "E-commerce App",
        startDate: "2026-01-01",
        dueDate: "2026-04-30",
        price: 35000,
        currency: "SAR",
        status: "in_progress",
        assignedTo: "خالد",
        serviceAssignees: ["emp-3", "emp-5"], // Mohamed + Khaled
        mainPackageId: "main-pkg-5",
      },
    ],
  },
];

// ============ MAIN PACKAGES (Categories) ============
const initialMainPackages: MainPackage[] = [
  {
    id: "main-pkg-1",
    name: "سوشيال ميديا",
    nameEn: "Social Media",
    icon: "share2",
    description: "خدمات إدارة حسابات التواصل الاجتماعي",
    descriptionEn: "Social media management services",
    order: 1,
    isActive: true,
  },
  {
    id: "main-pkg-2",
    name: "مواقع إلكترونية",
    nameEn: "Websites",
    icon: "globe",
    description: "تصميم وتطوير المواقع الإلكترونية",
    descriptionEn: "Website design and development",
    order: 2,
    isActive: true,
  },
  {
    id: "main-pkg-3",
    name: "هوية بصرية / لوغو",
    nameEn: "Branding / Logo",
    icon: "palette",
    description: "تصميم الهوية البصرية والشعارات",
    descriptionEn: "Branding and logo design",
    order: 3,
    isActive: true,
  },
  {
    id: "main-pkg-4",
    name: "ذكاء اصطناعي",
    nameEn: "AI Services",
    icon: "brain",
    description: "حلول الذكاء الاصطناعي للأعمال",
    descriptionEn: "AI solutions for business",
    order: 4,
    isActive: true,
  },
  {
    id: "main-pkg-5",
    name: "تطبيقات",
    nameEn: "Apps",
    icon: "smartphone",
    description: "تطوير تطبيقات الموبايل",
    descriptionEn: "Mobile app development",
    order: 5,
    isActive: true,
  },
  {
    id: "main-pkg-6",
    name: "خدمات مخصصة",
    nameEn: "Custom Services",
    icon: "settings",
    description: "خدمات مخصصة حسب الطلب",
    descriptionEn: "Custom services on demand",
    order: 6,
    isActive: true,
  },
];

// ============ SUB-PACKAGES (Plans) ============
const initialSubPackages: SubPackage[] = [
  // Social Media Packages
  {
    id: "sub-pkg-1",
    mainPackageId: "main-pkg-1",
    name: "سوشيال ميديا - سيلفر",
    nameEn: "Social Media - Silver",
    price: 150,
    currency: "USD",
    billingType: "monthly",
    description: "باقة أساسية لإدارة حسابات التواصل",
    descriptionEn: "Basic social media management package",
    duration: "30 يوم",
    durationEn: "30 days",
    deliverables: [
      { key: "posts", labelAr: "منشور شهرياً", labelEn: "Posts/month", value: 10, icon: "image" },
      { key: "reels", labelAr: "ريلز شهرياً", labelEn: "Reels/month", value: 5, icon: "video" },
      { key: "stories", labelAr: "ستوري شهرياً", labelEn: "Stories/month", value: 15, icon: "circle" },
    ],
    platforms: ["instagram", "facebook"],
    features: "تصميم احترافي\nجدولة المنشورات\nتقرير شهري",
    featuresEn: "Professional design\nPost scheduling\nMonthly report",
    isActive: true,
    order: 1,
  },
  {
    id: "sub-pkg-2",
    mainPackageId: "main-pkg-1",
    name: "سوشيال ميديا - جولد",
    nameEn: "Social Media - Gold",
    price: 300,
    currency: "USD",
    billingType: "monthly",
    description: "باقة متقدمة مع محتوى متنوع",
    descriptionEn: "Advanced package with diverse content",
    duration: "30 يوم",
    durationEn: "30 days",
    deliverables: [
      { key: "posts", labelAr: "منشور شهرياً", labelEn: "Posts/month", value: 20, icon: "image" },
      { key: "reels", labelAr: "ريلز شهرياً", labelEn: "Reels/month", value: 10, icon: "video" },
      { key: "stories", labelAr: "ستوري شهرياً", labelEn: "Stories/month", value: 30, icon: "circle" },
      { key: "reports", labelAr: "التقارير", labelEn: "Reports", value: "أسبوعي", icon: "file-text" },
      { key: "community", labelAr: "إدارة التعليقات", labelEn: "Community Management", value: "نعم", icon: "users" },
    ],
    platforms: ["instagram", "facebook", "tiktok"],
    features: "تصميم احترافي\nإدارة التعليقات\nتقارير أسبوعية\nإعلانات مدفوعة",
    featuresEn: "Professional design\nCommunity management\nWeekly reports\nPaid ads",
    isActive: true,
    order: 2,
  },
  {
    id: "sub-pkg-3",
    mainPackageId: "main-pkg-1",
    name: "سوشيال ميديا - بلاتينيوم",
    nameEn: "Social Media - Platinum",
    price: 500,
    currency: "USD",
    billingType: "monthly",
    description: "باقة شاملة لإدارة كاملة",
    descriptionEn: "Complete management package",
    duration: "30 يوم",
    durationEn: "30 days",
    deliverables: [
      { key: "posts", labelAr: "منشور شهرياً", labelEn: "Posts/month", value: 30, icon: "image" },
      { key: "reels", labelAr: "ريلز شهرياً", labelEn: "Reels/month", value: 15, icon: "video" },
      { key: "stories", labelAr: "ستوري شهرياً", labelEn: "Stories/month", value: 60, icon: "circle" },
      { key: "reports", labelAr: "التقارير", labelEn: "Reports", value: "أسبوعي + شهري", icon: "file-text" },
      { key: "community", labelAr: "إدارة التعليقات", labelEn: "Community Management", value: "نعم", icon: "users" },
      { key: "ads", labelAr: "إدارة الإعلانات", labelEn: "Ads Management", value: "نعم", icon: "megaphone" },
    ],
    platforms: ["instagram", "facebook", "tiktok", "snapchat", "x", "linkedin", "youtube"],
    features: "تصميم VIP\nإدارة كاملة\nتقارير مفصلة\nمدير حساب مخصص",
    featuresEn: "VIP design\nFull management\nDetailed reports\nDedicated account manager",
    isActive: true,
    order: 3,
  },
  // Website Packages
  {
    id: "sub-pkg-4",
    mainPackageId: "main-pkg-2",
    name: "موقع ووردبريس",
    nameEn: "WordPress Website",
    price: 600,
    currency: "USD",
    billingType: "one_time",
    description: "موقع ووردبريس احترافي",
    descriptionEn: "Professional WordPress website",
    duration: "14 يوم",
    durationEn: "14 days",
    deliverables: [
      { key: "pages", labelAr: "عدد الصفحات", labelEn: "Pages included", value: 5, icon: "file" },
      { key: "cms", labelAr: "نظام الإدارة", labelEn: "CMS", value: "WordPress", icon: "layout" },
      { key: "responsive", labelAr: "تصميم متجاوب", labelEn: "Responsive", value: "نعم", icon: "smartphone" },
      { key: "dashboard", labelAr: "لوحة تحكم", labelEn: "Admin dashboard", value: "نعم", icon: "settings" },
      { key: "delivery", labelAr: "وقت التسليم", labelEn: "Delivery time", value: "14 يوم", icon: "clock" },
    ],
    features: "تصميم متجاوب\nSEO أساسي\nلوحة تحكم سهلة\nدعم شهر مجاني",
    featuresEn: "Responsive design\nBasic SEO\nEasy dashboard\n1 month free support",
    isActive: true,
    order: 1,
  },
  {
    id: "sub-pkg-5",
    mainPackageId: "main-pkg-2",
    name: "تطوير مخصص",
    nameEn: "Custom Development",
    price: 1200,
    currency: "USD",
    billingType: "one_time",
    description: "موقع مخصص بالكامل",
    descriptionEn: "Fully custom website",
    duration: "30 يوم",
    durationEn: "30 days",
    deliverables: [
      { key: "pages", labelAr: "عدد الصفحات", labelEn: "Pages included", value: 10, icon: "file" },
      { key: "cms", labelAr: "نظام الإدارة", labelEn: "CMS", value: "مخصص", icon: "layout" },
      { key: "responsive", labelAr: "تصميم متجاوب", labelEn: "Responsive", value: "نعم", icon: "smartphone" },
      { key: "dashboard", labelAr: "لوحة تحكم", labelEn: "Admin dashboard", value: "متقدمة", icon: "settings" },
      { key: "delivery", labelAr: "وقت التسليم", labelEn: "Delivery time", value: "30 يوم", icon: "clock" },
    ],
    features: "تصميم فريد\nSEO متقدم\nأداء عالي\nدعم 3 أشهر",
    featuresEn: "Unique design\nAdvanced SEO\nHigh performance\n3 months support",
    isActive: true,
    order: 2,
  },
  {
    id: "sub-pkg-6",
    mainPackageId: "main-pkg-2",
    name: "متجر شوبيفاي",
    nameEn: "Shopify Store",
    price: 800,
    currency: "USD",
    billingType: "one_time",
    description: "متجر شوبيفاي جاهز للبيع",
    descriptionEn: "Ready-to-sell Shopify store",
    duration: "10 يوم",
    durationEn: "10 days",
    deliverables: [
      { key: "products", labelAr: "إضافة منتجات", labelEn: "Products setup", value: "20 منتج", icon: "package" },
      { key: "payment", labelAr: "بوابات الدفع", labelEn: "Payment gateways", value: "نعم", icon: "credit-card" },
      { key: "shipping", labelAr: "إعداد الشحن", labelEn: "Shipping setup", value: "نعم", icon: "truck" },
      { key: "theme", labelAr: "قالب مميز", labelEn: "Premium theme", value: "نعم", icon: "palette" },
      { key: "delivery", labelAr: "وقت التسليم", labelEn: "Delivery time", value: "10 أيام", icon: "clock" },
    ],
    features: "قالب مميز\nتكامل الدفع\nتدريب على الإدارة",
    featuresEn: "Premium theme\nPayment integration\nManagement training",
    isActive: true,
    order: 3,
  },
  {
    id: "sub-pkg-7",
    mainPackageId: "main-pkg-2",
    name: "متجر سلة",
    nameEn: "Salla Store",
    price: 500,
    currency: "USD",
    billingType: "one_time",
    description: "متجر سلة للسوق السعودي",
    descriptionEn: "Salla store for Saudi market",
    duration: "7 يوم",
    durationEn: "7 days",
    deliverables: [
      { key: "products", labelAr: "إضافة منتجات", labelEn: "Products setup", value: "15 منتج", icon: "package" },
      { key: "payment", labelAr: "بوابات الدفع", labelEn: "Payment gateways", value: "مدى، أبل باي", icon: "credit-card" },
      { key: "shipping", labelAr: "إعداد الشحن", labelEn: "Shipping setup", value: "نعم", icon: "truck" },
      { key: "delivery", labelAr: "وقت التسليم", labelEn: "Delivery time", value: "7 أيام", icon: "clock" },
    ],
    features: "تكامل محلي\nدعم عربي\nبوابات دفع سعودية",
    featuresEn: "Local integration\nArabic support\nSaudi payment gateways",
    isActive: true,
    order: 4,
  },
  // Branding Packages
  {
    id: "sub-pkg-8",
    mainPackageId: "main-pkg-3",
    name: "لوغو أساسي",
    nameEn: "Basic Logo",
    price: 150,
    currency: "EUR",
    billingType: "one_time",
    description: "تصميم شعار احترافي",
    descriptionEn: "Professional logo design",
    duration: "5 يوم",
    durationEn: "5 days",
    deliverables: [
      { key: "concepts", labelAr: "مقترحات", labelEn: "Concepts", value: 3, icon: "layers" },
      { key: "revisions", labelAr: "تعديلات", labelEn: "Revisions", value: 2, icon: "edit" },
      { key: "formats", labelAr: "الصيغ", labelEn: "File formats", value: "PNG, SVG, PDF", icon: "file" },
      { key: "delivery", labelAr: "وقت التسليم", labelEn: "Delivery time", value: "5 أيام", icon: "clock" },
    ],
    features: "شعار احترافي\n3 مقترحات\nملفات بجميع الصيغ",
    featuresEn: "Professional logo\n3 concepts\nAll file formats",
    isActive: true,
    order: 1,
  },
  {
    id: "sub-pkg-9",
    mainPackageId: "main-pkg-3",
    name: "هوية بصرية كاملة",
    nameEn: "Full Branding Package",
    price: 500,
    currency: "EUR",
    billingType: "one_time",
    description: "هوية بصرية متكاملة لعلامتك",
    descriptionEn: "Complete brand identity",
    duration: "14 يوم",
    durationEn: "14 days",
    deliverables: [
      { key: "logo", labelAr: "شعار", labelEn: "Logo", value: "نعم", icon: "star" },
      { key: "colors", labelAr: "ألوان الهوية", labelEn: "Brand colors", value: "نعم", icon: "palette" },
      { key: "typography", labelAr: "الخطوط", labelEn: "Typography", value: "نعم", icon: "type" },
      { key: "stationery", labelAr: "قرطاسية", labelEn: "Stationery", value: "نعم", icon: "file-text" },
      { key: "guideline", labelAr: "دليل الهوية", labelEn: "Brand guideline", value: "نعم", icon: "book" },
      { key: "delivery", labelAr: "وقت التسليم", labelEn: "Delivery time", value: "14 يوم", icon: "clock" },
    ],
    features: "شعار + قرطاسية\nدليل هوية كامل\nملفات قابلة للتعديل",
    featuresEn: "Logo + stationery\nFull brand guideline\nEditable files",
    isActive: true,
    order: 2,
  },
  // AI Services
  {
    id: "sub-pkg-10",
    mainPackageId: "main-pkg-4",
    name: "استشارات AI",
    nameEn: "AI Consulting",
    price: 5000,
    currency: "TRY",
    billingType: "monthly",
    description: "استشارات وحلول ذكاء اصطناعي",
    descriptionEn: "AI consulting and solutions",
    duration: "شهري",
    durationEn: "Monthly",
    deliverables: [
      { key: "analysis", labelAr: "تحليل البيانات", labelEn: "Data analysis", value: "نعم", icon: "bar-chart" },
      { key: "automation", labelAr: "أتمتة العمليات", labelEn: "Process automation", value: "نعم", icon: "zap" },
      { key: "chatbot", labelAr: "روبوت دردشة", labelEn: "Chatbot", value: "نعم", icon: "message-circle" },
    ],
    features: "تحليل البيانات\nأتمتة العمليات\nروبوت دردشة",
    featuresEn: "Data analysis\nProcess automation\nChatbot",
    isActive: true,
    order: 1,
  },
];

// ============ LEGACY PACKAGES (for backward compatibility) ============
const initialPackages: PackageItem[] = [
  {
    id: "pkg-1",
    name: "إدارة وسائل التواصل الاجتماعي - أساسي",
    nameEn: "Social Media Management - Basic",
    category: "social_media",
    price: 1500,
    currency: "USD",
    billingType: "monthly",
    description: "إدارة حساب واحد مع 15 منشور شهرياً",
    features: "15 منشور شهرياً, تصميم صور, جدولة المنشورات, تقرير شهري",
    isActive: true,
  },
  {
    id: "pkg-2",
    name: "إدارة وسائل التواصل الاجتماعي - متقدم",
    nameEn: "Social Media Management - Pro",
    category: "social_media",
    price: 3500,
    currency: "USD",
    billingType: "monthly",
    description: "إدارة 3 حسابات مع 45 منشور شهرياً",
    features: "45 منشور شهرياً, تصميم صور وفيديو, إدارة الإعلانات, تقرير أسبوعي",
    isActive: true,
  },
  {
    id: "pkg-3",
    name: "تطوير موقع إلكتروني",
    nameEn: "Website Development",
    category: "website",
    price: 8000,
    currency: "USD",
    billingType: "one_time",
    description: "موقع احترافي متجاوب مع جميع الأجهزة",
    features: "تصميم مخصص, 10 صفحات, لوحة تحكم, تحسين SEO, شهر صيانة مجاني",
    isActive: true,
  },
  {
    id: "pkg-4",
    name: "باقة الهوية البصرية",
    nameEn: "Branding Package",
    category: "branding",
    price: 5000,
    currency: "USD",
    billingType: "one_time",
    description: "هوية بصرية كاملة لعلامتك التجارية",
    features: "شعار, بطاقة عمل, ورق رسمي, دليل الهوية, ملفات قابلة للتعديل",
    isActive: true,
  },
  {
    id: "pkg-5",
    name: "تطوير تطبيق موبايل",
    nameEn: "Mobile App Development",
    category: "app",
    price: 25000,
    currency: "USD",
    billingType: "one_time",
    description: "تطبيق iOS و Android",
    features: "تصميم UI/UX, iOS, Android, لوحة تحكم, 3 أشهر دعم",
    isActive: true,
  },
];

const initialInvoices: Invoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-001",
    clientId: "client-1",
    clientName: "شركة الإبداع الرقمي",
    amount: 3500,
    currency: "USD",
    status: "paid",
    issueDate: "2026-01-01",
    dueDate: "2026-01-15",
    paidDate: "2026-01-10",
    items: [{ description: "إدارة سوشيال ميديا - يناير", quantity: 1, unitPrice: 3500 }],
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-2026-002",
    clientId: "client-1",
    clientName: "شركة الإبداع الرقمي",
    amount: 4000,
    currency: "USD",
    status: "sent",
    issueDate: "2026-01-15",
    dueDate: "2026-01-30",
    items: [{ description: "دفعة مقدمة - موقع إلكتروني", quantity: 1, unitPrice: 4000 }],
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-2026-003",
    clientId: "client-2",
    clientName: "مطعم الشرق",
    amount: 4500,
    currency: "TRY",
    status: "paid",
    issueDate: "2026-01-12",
    dueDate: "2026-01-20",
    paidDate: "2026-01-18",
    items: [{ description: "تصميم هوية بصرية", quantity: 1, unitPrice: 4500 }],
  },
  {
    id: "inv-4",
    invoiceNumber: "INV-2026-004",
    clientId: "client-3",
    clientName: "متجر الملابس العصرية",
    amount: 17500,
    currency: "SAR",
    status: "sent",
    issueDate: "2026-01-05",
    dueDate: "2026-02-05",
    items: [{ description: "دفعة مقدمة - تطبيق متجر 50%", quantity: 1, unitPrice: 17500 }],
  },
  {
    id: "inv-5",
    invoiceNumber: "INV-2025-045",
    clientId: "client-1",
    clientName: "شركة الإبداع الرقمي",
    amount: 2500,
    currency: "USD",
    status: "overdue",
    issueDate: "2025-12-15",
    dueDate: "2025-12-30",
    items: [{ description: "خدمات إضافية", quantity: 1, unitPrice: 2500 }],
  },
];

const initialTransactions: FinanceTransaction[] = [
  {
    id: "txn-1",
    type: "income",
    category: "services",
    amount: 3500,
    currency: "USD",
    description: "فاتورة INV-2026-001 - إدارة سوشيال ميديا",
    date: "2026-01-10",
    relatedId: "inv-1",
    relatedType: "invoice",
    status: "completed",
    clientId: "client-1",
  },
  {
    id: "txn-2",
    type: "income",
    category: "services",
    amount: 4500,
    currency: "TRY",
    description: "فاتورة INV-2026-003 - هوية بصرية",
    date: "2026-01-18",
    relatedId: "inv-3",
    relatedType: "invoice",
    status: "completed",
    clientId: "client-2",
  },
  {
    id: "txn-3",
    type: "expense",
    category: "salaries",
    amount: 25000,
    currency: "TRY",
    description: "رواتب الموظفين - يناير",
    date: "2026-01-25",
    relatedType: "salary",
    status: "completed",
  },
  {
    id: "txn-4",
    type: "expense",
    category: "marketing",
    amount: 500,
    currency: "USD",
    description: "إعلانات فيسبوك",
    date: "2026-01-15",
    status: "completed",
  },
  {
    id: "txn-5",
    type: "expense",
    category: "tools",
    amount: 200,
    currency: "USD",
    description: "اشتراكات أدوات (Canva, Hootsuite)",
    date: "2026-01-01",
    status: "completed",
  },
];

const initialEmployees: Employee[] = [
  {
    id: "emp-1",
    name: "أحمد محمد",
    nameEn: "Ahmed Mohamed",
    email: "ahmed@vevoline.com",
    phone: "+90 535 111 2233",
    role: "Sales Manager",
    roleAr: "مدير مبيعات",
    department: "sales",
    jobTitle: "sales_manager",
    salaryType: "monthly",
    salaryAmount: 8000,
    salaryCurrency: "TRY",
    startDate: "2024-06-01",
    isActive: true,
  },
  {
    id: "emp-2",
    name: "سارة أحمد",
    nameEn: "Sara Ahmed",
    email: "sara@vevoline.com",
    phone: "+90 535 222 3344",
    role: "Sales Representative",
    roleAr: "مندوبة مبيعات",
    department: "sales",
    jobTitle: "sales_rep",
    salaryType: "monthly",
    salaryAmount: 7500,
    salaryCurrency: "TRY",
    startDate: "2024-08-15",
    isActive: true,
  },
  {
    id: "emp-3",
    name: "محمد خالد",
    nameEn: "Mohamed Khaled",
    email: "mohamed@vevoline.com",
    phone: "+90 535 333 4455",
    role: "Web Developer",
    roleAr: "مبرمج مواقع",
    department: "tech",
    jobTitle: "web_developer",
    salaryType: "monthly",
    salaryAmount: 12000,
    salaryCurrency: "TRY",
    startDate: "2024-03-01",
    isActive: true,
  },
  {
    id: "emp-4",
    name: "ليلى حسن",
    nameEn: "Layla Hassan",
    email: "layla@vevoline.com",
    phone: "+90 535 444 5566",
    role: "Sales Representative",
    roleAr: "مندوبة مبيعات",
    department: "sales",
    jobTitle: "sales_rep",
    salaryType: "monthly",
    salaryAmount: 6500,
    salaryCurrency: "TRY",
    startDate: "2025-01-10",
    isActive: true,
  },
  {
    id: "emp-5",
    name: "خالد عمر",
    nameEn: "Khaled Omar",
    email: "khaled@vevoline.com",
    phone: "+90 535 555 6677",
    role: "Account Manager",
    roleAr: "مدير حسابات",
    department: "delivery",
    jobTitle: "account_manager",
    salaryType: "monthly",
    salaryAmount: 15000,
    salaryCurrency: "TRY",
    startDate: "2023-09-01",
    isActive: true,
  },
  {
    id: "emp-6",
    name: "علاء الدين",
    nameEn: "Alaa Eldin",
    email: "alaa@vevoline.com",
    phone: "+90 535 666 7788",
    role: "Graphic Designer",
    roleAr: "مصمم جرافيك",
    department: "delivery",
    jobTitle: "graphic_designer",
    salaryType: "per_project",
    rate: 500,
    rateType: "per_project",
    salaryCurrency: "USD",
    salaryNotes: "Freelance designer - paid per project",
    startDate: "2024-05-01",
    isActive: true,
  },
  {
    id: "emp-7",
    name: "نورا السيد",
    nameEn: "Noura Elsayed",
    email: "noura@vevoline.com",
    phone: "+90 535 777 8899",
    role: "Media Buyer",
    roleAr: "مسؤول إعلانات",
    department: "delivery",
    jobTitle: "media_buyer",
    salaryType: "per_project",
    rate: 200,
    rateType: "per_service",
    salaryCurrency: "USD",
    salaryNotes: "Paid per service completed",
    startDate: "2024-07-01",
    isActive: true,
  },
];

const initialEvents: CalendarEvent[] = [
  {
    id: "evt-1",
    source: "manual",
    eventType: "manual",
    titleAr: "اجتماع مع شركة الإبداع الرقمي",
    titleEn: "Meeting with Digital Creativity",
    date: getTodayString(),
    time: "10:00",
    status: "today",
    priority: "medium",
    notes: "مناقشة تقدم مشروع الموقع",
    clientId: "client-1",
  },
  {
    id: "evt-2",
    source: "system",
    eventType: "delivery_due",
    titleAr: "موعد تسليم الموقع",
    titleEn: "Website Delivery Due",
    date: "2026-02-28",
    status: "upcoming",
    priority: "high",
    notes: "تسليم موقع شركة الإبداع الرقمي",
    clientId: "client-1",
    serviceId: "svc-2",
  },
  {
    id: "evt-3",
    source: "system",
    eventType: "client_payment",
    titleAr: "استحقاق فاتورة INV-2026-002",
    titleEn: "Invoice INV-2026-002 Due",
    date: "2026-01-30",
    status: "upcoming",
    priority: "medium",
    clientId: "client-1",
  },
  {
    id: "evt-4",
    source: "manual",
    eventType: "manual",
    titleAr: "اجتماع فريق التصميم",
    titleEn: "Design Team Meeting",
    date: getTodayString(),
    time: "14:00",
    status: "today",
    priority: "medium",
    notes: "مراجعة المشاريع الحالية",
  },
];

const initialGoals: Goal[] = [
  {
    id: "goal-1",
    name: "إيرادات الشهر",
    type: "financial",
    target: 50000,
    current: 32000,
    month: 1,
    year: 2026,
    currency: "USD",
    status: "in_progress",
    responsiblePerson: "أسامة",
  },
  {
    id: "goal-2",
    name: "عملاء جدد",
    type: "clients",
    target: 5,
    current: 3,
    month: 1,
    year: 2026,
    status: "in_progress",
    responsiblePerson: "فريق المبيعات",
  },
  {
    id: "goal-3",
    name: "عملاء محتملين",
    type: "leads",
    target: 20,
    current: 15,
    month: 1,
    year: 2026,
    status: "in_progress",
    responsiblePerson: "فريق التسويق",
  },
  {
    id: "goal-4",
    name: "معدل إكمال المشاريع",
    type: "performance",
    target: 90,
    current: 85,
    month: 1,
    year: 2026,
    status: "in_progress",
    notes: "نسبة المشاريع المسلمة في الوقت المحدد",
  },
];

// ============ PROVIDER COMPONENT ============

export function DataProvider({ children }: { children: ReactNode }) {
  const { convertAmount, currency: displayCurrency } = useCurrency();

  // ============ API QUERIES ============
  
  const { data: leadsData } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: clientsData } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: clientServicesData } = useQuery<any[]>({
    queryKey: ["/api/client-services"],
  });

  const { data: mainPackagesData } = useQuery<MainPackage[]>({
    queryKey: ["/api/main-packages"],
  });

  const { data: subPackagesData } = useQuery<SubPackage[]>({
    queryKey: ["/api/sub-packages"],
  });

  const { data: invoicesData } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: transactionsData } = useQuery<FinanceTransaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: employeesData } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: eventsData } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

  const { data: goalsData } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  // Merge clients with their services
  const clients = useMemo(() => {
    // Safety check for clientsData
    if (!clientsData) return initialClients;
    
    if (!Array.isArray(clientsData)) {
      console.error("clientsData is not an array:", clientsData);
      return initialClients;
    }

    // Safety check for clientServicesData
    const safeClientServices = Array.isArray(clientServicesData) ? clientServicesData : [];
    
    // Safety check for mainPackagesData
    const safeMainPackages = Array.isArray(mainPackagesData) ? mainPackagesData : [];

    return clientsData.map(client => {
      const services = safeClientServices.filter(s => s.clientId === client.id).map(s => {
        let serviceType = "branding";
        
        if (s.mainPackageId && safeMainPackages.length > 0) {
           const pkg = safeMainPackages.find(p => p.id === s.mainPackageId);
           if (pkg?.nameEn) {
              const name = pkg.nameEn.toLowerCase();
              if (name.includes("website") || name.includes("development")) serviceType = "website";
              else if (name.includes("social") || name.includes("marketing")) serviceType = "social_media";
              else if (name.includes("app") || name.includes("mobile")) serviceType = "app";
           }
        }
        
        if (serviceType === "branding" && s.serviceNameEn) {
           const name = s.serviceNameEn.toLowerCase();
           if (name.includes("website")) serviceType = "website";
           else if (name.includes("social")) serviceType = "social_media";
           else if (name.includes("app")) serviceType = "app";
        }

        return {
          id: s.id,
          serviceType,
          serviceName: s.serviceName,
          serviceNameEn: s.serviceNameEn,
          startDate: s.startDate,
          dueDate: s.endDate,
          price: s.price,
          currency: s.currency,
          status: s.status,
          serviceAssignees: s.executionEmployeeIds,
          mainPackageId: s.mainPackageId,
          subPackageId: s.subPackageId,
          completedDate: s.completedAt ? new Date(s.completedAt).toISOString().split('T')[0] : undefined,
        };
      }) || [];

      return {
        ...client,
        services,
        // Ensure other fields match ConfirmedClient interface
        salesOwnerId: client.salesOwnerId || undefined,
        assignedManagerId: client.assignedManagerId || undefined,
        salesOwners: client.salesOwners || [],
        assignedStaff: client.assignedStaff || [],
        completedDate: client.completedDate ? new Date(client.completedDate).toISOString().split('T')[0] : undefined,
      } as ConfirmedClient;
    });
  }, [clientsData, clientServicesData, mainPackagesData]);

  // Use local state for leads if API is loading, or rely on API data
  const leads = Array.isArray(leadsData) ? leadsData : initialLeads;

  const mainPackages = Array.isArray(mainPackagesData) ? mainPackagesData : initialMainPackages;
  const subPackages = Array.isArray(subPackagesData) ? subPackagesData : initialSubPackages;
  const invoices = Array.isArray(invoicesData) ? invoicesData : initialInvoices;
  const transactions = Array.isArray(transactionsData) ? transactionsData : initialTransactions;
  const employees = Array.isArray(employeesData) ? employeesData : initialEmployees;
  const events = Array.isArray(eventsData) ? eventsData : initialEvents;
  const goals = Array.isArray(goalsData) ? goalsData : initialGoals;

  // Local state for other entities (not yet connected to API)
  const [packages, setPackages] = useState<PackageItem[]>(initialPackages);

  // ============ LEADS CRUD ============

  const addLeadMutation = useMutation({
    mutationFn: async (lead: Omit<Lead, "id" | "createdAt">) => {
      const res = await apiRequest("POST", "/api/leads", lead);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const addLead = useCallback((lead: Omit<Lead, "id" | "createdAt">) => {
    // Optimistic update or wait for mutation? 
    // For now, we return a mock lead to satisfy interface, but async real update happens
    addLeadMutation.mutate(lead);
    return { ...lead, id: "temp-id", createdAt: getTodayString() } as Lead; 
  }, [addLeadMutation]);

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      await apiRequest("PATCH", `/api/leads/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    updateLeadMutation.mutate({ id, updates });
  }, [updateLeadMutation]);

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const deleteLead = useCallback((id: string) => {
    deleteLeadMutation.mutate(id);
  }, [deleteLeadMutation]);

  const convertLeadToClientMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/convert`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
    },
  });

  const convertLeadToClient = useCallback(async (leadId: string) => {
    const newClient = await convertLeadToClientMutation.mutateAsync(leadId);
    return newClient;
  }, [convertLeadToClientMutation]);

  // ============ CLIENTS CRUD ============

  const addClientMutation = useMutation({
    mutationFn: async (client: Omit<ConfirmedClient, "id" | "createdAt" | "services">) => {
      const res = await apiRequest("POST", "/api/clients", client);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
    },
  });

  const addClient = useCallback(async (client: Omit<ConfirmedClient, "id" | "createdAt" | "services">) => {
    const newClient = await addClientMutation.mutateAsync(client);
    return newClient;
  }, [addClientMutation]);

  const addClientWithServiceMutation = useMutation({
    mutationFn: async ({ client, service }: { client: any, service: any }) => {
      // Map service item to server format
      const serviceData = {
        // clientId will be handled by server
        mainPackageId: service.mainPackageId || "unknown",
        serviceName: service.serviceName,
        serviceNameEn: service.serviceNameEn,
        startDate: service.startDate,
        endDate: service.dueDate,
        price: service.price,
        currency: service.currency,
        status: service.status,
        executionEmployeeIds: service.serviceAssignees,
        subPackageId: service.subPackageId,
      };

      const res = await apiRequest("POST", "/api/clients-with-service", { client, service: serviceData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
    },
  });

  const addClientWithService = useCallback(async (
    client: Omit<ConfirmedClient, "id" | "createdAt" | "services">, 
    service: Omit<ServiceItem, "id">
  ) => {
    const result = await addClientWithServiceMutation.mutateAsync({ client, service });
    return result.client;
  }, [addClientWithServiceMutation]);

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ConfirmedClient> }) => {
      await apiRequest("PATCH", `/api/clients/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  const updateClient = useCallback((id: string, updates: Partial<ConfirmedClient>) => {
    updateClientMutation.mutate({ id, updates });
  }, [updateClientMutation]);

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
    },
  });

  const deleteClient = useCallback((id: string) => {
    deleteClientMutation.mutate(id);
  }, [deleteClientMutation]);

  const addServiceMutation = useMutation({
    mutationFn: async ({ clientId, service }: { clientId: string; service: Omit<ServiceItem, "id"> }) => {
      const serviceData = {
        clientId,
        mainPackageId: service.mainPackageId || "unknown", // Required in schema
        serviceName: service.serviceName,
        serviceNameEn: service.serviceNameEn,
        startDate: service.startDate,
        endDate: service.dueDate, // Map dueDate to endDate
        price: service.price,
        currency: service.currency,
        status: service.status,
        executionEmployeeIds: service.serviceAssignees,
        subPackageId: service.subPackageId,
      };
      await apiRequest("POST", "/api/client-services", serviceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] }); // Re-compute derived state
    },
  });

  const addServiceToClient = useCallback(async (clientId: string, service: Omit<ServiceItem, "id">) => {
    await addServiceMutation.mutateAsync({ clientId, service });
  }, [addServiceMutation]);

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceItem> }) => {
      // Map ServiceItem updates to InsertClientService updates
      const serviceUpdates: any = {};
      if (updates.serviceName) serviceUpdates.serviceName = updates.serviceName;
      if (updates.serviceNameEn) serviceUpdates.serviceNameEn = updates.serviceNameEn;
      if (updates.startDate) serviceUpdates.startDate = updates.startDate;
      if (updates.dueDate) serviceUpdates.endDate = updates.dueDate;
      if (updates.price) serviceUpdates.price = updates.price;
      if (updates.currency) serviceUpdates.currency = updates.currency;
      if (updates.status) serviceUpdates.status = updates.status;
      if (updates.serviceAssignees) serviceUpdates.executionEmployeeIds = updates.serviceAssignees;
      if (updates.mainPackageId) serviceUpdates.mainPackageId = updates.mainPackageId;
      if (updates.subPackageId) serviceUpdates.subPackageId = updates.subPackageId;
      if (updates.notes) serviceUpdates.notes = updates.notes;
      if (updates.completedDate) serviceUpdates.completedAt = updates.completedDate ? new Date(updates.completedDate) : null;

      await apiRequest("PATCH", `/api/client-services/${id}`, serviceUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  const updateService = useCallback(
    async (clientId: string, serviceId: string, updates: Partial<ServiceItem>) => {
      await updateServiceMutation.mutateAsync({ id: serviceId, updates });
      
      // Also check if we need to update client status (logic moved to server or handled by re-fetch)
      // The original logic checked for all services completed. 
      // We should probably implement this logic in the backend or just let the user manually complete the client.
      // For now, simple service update.
    },
    [updateServiceMutation]
  );

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/client-services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  const deleteService = useCallback((clientId: string, serviceId: string) => {
    deleteServiceMutation.mutate(serviceId);
  }, [deleteServiceMutation]);

  const archiveClient = useCallback((id: string) => {
    updateClientMutation.mutate({ id, updates: { status: "archived" } });
  }, [updateClientMutation]);

  const restoreClient = useCallback((id: string) => {
    updateClientMutation.mutate({ id, updates: { status: "active" } });
  }, [updateClientMutation]);

  // Reactivate a completed client - sets client back to active and optionally resets service statuses
  const reactivateClient = useCallback((id: string, resetServices: boolean = false) => {
    updateClientMutation.mutate({ id, updates: { status: "active", completedDate: undefined } });
    if (resetServices) {
      // Find all services for this client and reset them to not_started
      const clientServices = clientServicesData?.filter(s => s.clientId === id) || [];
      clientServices.forEach(service => {
        updateServiceMutation.mutate({ 
          id: service.id, 
          updates: { status: "not_started", completedDate: undefined } as Partial<ServiceItem>
        });
      });
    }
  }, [updateClientMutation, updateServiceMutation, clientServicesData]);

  const markClientCompleted = useCallback((id: string) => {
    updateClientMutation.mutate({ 
      id, 
      updates: { 
        status: "completed", 
        completedDate: getTodayString() 
      } 
    });
    // Also mark services completed? Original logic did.
    // For now, client completion is enough.
  }, [updateClientMutation]);

  const convertClientToLeadMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/convert`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-services"] });
    },
  });

  const convertClientToLead = useCallback((clientId: string): Lead | null => {
    convertClientToLeadMutation.mutate(clientId);
    return null;
  }, [convertClientToLeadMutation]);

  const getCompletedClients = useCallback(() => {
    return clients.filter((c) => c.status === "completed");
  }, [clients]);

  const getCompletedClientsThisMonth = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return clients.filter((c) => {
      if (c.status !== "completed" || !c.completedDate) return false;
      const completedDate = new Date(c.completedDate);
      return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear;
    });
  }, [clients]);

  // ============ MAIN PACKAGES CRUD ============

  const addMainPackageMutation = useMutation({
    mutationFn: async (pkg: Omit<MainPackage, "id">) => {
      const res = await apiRequest("POST", "/api/main-packages", pkg);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/main-packages"] });
    },
  });

  const addMainPackage = useCallback((pkg: Omit<MainPackage, "id">) => {
    addMainPackageMutation.mutate(pkg);
    return { ...pkg, id: generateId() };
  }, [addMainPackageMutation]);

  const updateMainPackageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MainPackage> }) => {
      const res = await apiRequest("PATCH", `/api/main-packages/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/main-packages"] });
    },
  });

  const updateMainPackage = useCallback((id: string, updates: Partial<MainPackage>) => {
    updateMainPackageMutation.mutate({ id, updates });
  }, [updateMainPackageMutation]);

  const deleteMainPackageMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/main-packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/main-packages"] });
    },
  });

  const deleteMainPackage = useCallback((id: string) => {
    deleteMainPackageMutation.mutate(id);
  }, [deleteMainPackageMutation]);

  // ============ SUB-PACKAGES CRUD ============

  const addSubPackageMutation = useMutation({
    mutationFn: async (pkg: Omit<SubPackage, "id">) => {
      const res = await apiRequest("POST", "/api/sub-packages", pkg);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-packages"] });
    },
  });

  const addSubPackage = useCallback((pkg: Omit<SubPackage, "id">) => {
    addSubPackageMutation.mutate(pkg);
    return { ...pkg, id: generateId() };
  }, [addSubPackageMutation]);

  const updateSubPackageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SubPackage> }) => {
      const res = await apiRequest("PATCH", `/api/sub-packages/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-packages"] });
    },
  });

  const updateSubPackage = useCallback((id: string, updates: Partial<SubPackage>) => {
    updateSubPackageMutation.mutate({ id, updates });
  }, [updateSubPackageMutation]);

  const deleteSubPackageMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sub-packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-packages"] });
    },
  });

  const deleteSubPackage = useCallback((id: string) => {
    deleteSubPackageMutation.mutate(id);
  }, [deleteSubPackageMutation]);

  const getSubPackagesByMainPackage = useCallback((mainPackageId: string) => {
    return subPackages.filter((p) => p.mainPackageId === mainPackageId);
  }, [subPackages]);

  // ============ LEGACY PACKAGES CRUD ============

  const addPackage = useCallback((pkg: Omit<PackageItem, "id">) => {
    const newPkg: PackageItem = { ...pkg, id: generateId() };
    setPackages((prev) => [...prev, newPkg]);
    return newPkg;
  }, []);

  const updatePackage = useCallback((id: string, updates: Partial<PackageItem>) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deletePackage = useCallback((id: string) => {
    setPackages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ============ INVOICES CRUD ============

  const addInvoiceMutation = useMutation({
    mutationFn: async (invoice: Omit<Invoice, "id">) => {
      const res = await apiRequest("POST", "/api/invoices", invoice);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<FinanceTransaction, "id">) => {
      const res = await apiRequest("POST", "/api/transactions", transaction);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
  });

  const addInvoice = useCallback((invoice: Omit<Invoice, "id">) => {
    addInvoiceMutation.mutate(invoice);
    return { ...invoice, id: generateId() };
  }, [addInvoiceMutation]);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    updateInvoiceMutation.mutate({ id, updates });
  }, [updateInvoiceMutation]);

  const deleteInvoice = useCallback((id: string) => {
    deleteInvoiceMutation.mutate(id);
  }, [deleteInvoiceMutation]);

  const markInvoicePaid = useCallback((id: string) => {
    const invoice = invoices.find((i) => i.id === id);
    if (!invoice) return;

    updateInvoiceMutation.mutate({
      id,
      updates: { status: "paid" as InvoiceStatus, paidDate: getTodayString() },
    });

    addTransactionMutation.mutate({
      type: "income",
      category: "services",
      amount: invoice.amount,
      currency: invoice.currency,
      description: `فاتورة ${invoice.invoiceNumber} - ${invoice.clientName}`,
      date: getTodayString(),
      relatedId: id,
      relatedType: "invoice",
      status: "completed",
      clientId: invoice.clientId,
    });
  }, [invoices, updateInvoiceMutation, addTransactionMutation]);

  // ============ FINANCE CRUD ============

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FinanceTransaction> }) => {
      const existing = transactions.find((t) => t.id === id);
      if (!existing) return;
      const merged = { ...existing, ...updates };
      await apiRequest("DELETE", `/api/transactions/${id}`);
      const { id: _, ...payload } = merged;
      const res = await apiRequest("POST", "/api/transactions", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
  });

  const addTransaction = useCallback((transaction: Omit<FinanceTransaction, "id">) => {
    addTransactionMutation.mutate(transaction);
    return { ...transaction, id: generateId() };
  }, [addTransactionMutation]);

  const updateTransaction = useCallback((id: string, updates: Partial<FinanceTransaction>) => {
    updateTransactionMutation.mutate({ id, updates });
  }, [updateTransactionMutation]);

  const deleteTransaction = useCallback((id: string) => {
    deleteTransactionMutation.mutate(id);
  }, [deleteTransactionMutation]);

  // ============ EMPLOYEES CRUD ============

  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: Omit<Employee, "id">) => {
      const res = await apiRequest("POST", "/api/employees", employee);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Employee> }) => {
      const res = await apiRequest("PATCH", `/api/employees/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
  });

  const addEmployee = useCallback((employee: Omit<Employee, "id">) => {
    addEmployeeMutation.mutate(employee);
    return { ...employee, id: generateId() };
  }, [addEmployeeMutation]);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    updateEmployeeMutation.mutate({ id, updates });
  }, [updateEmployeeMutation]);

  const deleteEmployee = useCallback((id: string) => {
    deleteEmployeeMutation.mutate(id);
  }, [deleteEmployeeMutation]);

  // ============ EVENTS CRUD ============

  const addEventMutation = useMutation({
    mutationFn: async (event: Omit<CalendarEvent, "id">) => {
      const res = await apiRequest("POST", "/api/calendar-events", event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CalendarEvent> }) => {
      const res = await apiRequest("PATCH", `/api/calendar-events/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/calendar-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
    },
  });

  const addEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    addEventMutation.mutate(event);
    return { ...event, id: generateId() };
  }, [addEventMutation]);

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    updateEventMutation.mutate({ id, updates });
  }, [updateEventMutation]);

  const deleteEvent = useCallback((id: string) => {
    deleteEventMutation.mutate(id);
  }, [deleteEventMutation]);

  // ============ GOALS CRUD ============

  const addGoalMutation = useMutation({
    mutationFn: async (goal: Omit<Goal, "id">) => {
      const res = await apiRequest("POST", "/api/goals", goal);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      const res = await apiRequest("PATCH", `/api/goals/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const addGoal = useCallback((goal: Omit<Goal, "id">) => {
    addGoalMutation.mutate(goal);
    return { ...goal, id: generateId() };
  }, [addGoalMutation]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    updateGoalMutation.mutate({ id, updates });
  }, [updateGoalMutation]);

  const deleteGoal = useCallback((id: string) => {
    deleteGoalMutation.mutate(id);
  }, [deleteGoalMutation]);

  // ============ COMPUTED VALUES ============

  const getActiveClients = useCallback(() => {
    return clients.filter((c) =>
      c.services.some((s) => s.status === "in_progress")
    );
  }, [clients]);

  const getClientsWithExpiringServices = useCallback((days: number) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return clients.filter((c) =>
      c.services.some((s) => {
        if (s.status === "completed") return false;
        const dueDate = new Date(s.dueDate);
        return dueDate >= today && dueDate <= futureDate;
      })
    );
  }, [clients]);

  const getServicesCompletedThisMonth = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const completedServices: ServiceItem[] = [];
    clients.forEach((c) => {
      c.services.forEach((s) => {
        if (s.status === "completed" && s.completedDate) {
          const completedDate = new Date(s.completedDate);
          if (
            completedDate.getMonth() === currentMonth &&
            completedDate.getFullYear() === currentYear
          ) {
            completedServices.push(s);
          }
        }
      });
    });
    return completedServices;
  }, [clients]);

  const getTotalIncome = useCallback((month?: number, year?: number) => {
    let filtered = transactions.filter((t) => t.type === "income");
    if (month !== undefined && year !== undefined) {
      filtered = filtered.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }
    return filtered.reduce((sum, t) => sum + convertAmount(t.amount, t.currency, displayCurrency), 0);
  }, [transactions, convertAmount, displayCurrency]);

  const getTotalExpenses = useCallback((month?: number, year?: number) => {
    let filtered = transactions.filter((t) => t.type === "expense");
    if (month !== undefined && year !== undefined) {
      filtered = filtered.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }
    return filtered.reduce((sum, t) => sum + convertAmount(t.amount, t.currency, displayCurrency), 0);
  }, [transactions, convertAmount, displayCurrency]);

  const getNetProfit = useCallback((month?: number, year?: number) => {
    return getTotalIncome(month, year) - getTotalExpenses(month, year);
  }, [getTotalIncome, getTotalExpenses]);

  const getOverdueInvoices = useCallback(() => {
    return invoices.filter((i) => i.status === "overdue");
  }, [invoices]);

  const getUpcomingInvoices = useCallback((days: number) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return invoices.filter((i) => {
      if (i.status === "paid") return false;
      const dueDate = new Date(i.dueDate);
      return dueDate >= today && dueDate <= futureDate;
    });
  }, [invoices]);

  const getGoalCompletionRate = useCallback((month?: number, year?: number) => {
    let filtered = goals;
    if (month !== undefined && year !== undefined) {
      filtered = goals.filter((g) => g.month === month && g.year === year);
    }
    if (filtered.length === 0) return 0;
    const achieved = filtered.filter((g) => g.status === "achieved").length;
    return Math.round((achieved / filtered.length) * 100);
  }, [goals]);

  const getTodayEvents = useCallback(() => {
    const today = getTodayString();
    return events.filter((e) => e.date === today);
  }, [events]);

  const getUpcomingDeadlines = useCallback((days: number) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return events.filter((e) => {
      if (e.eventType !== "delivery_due" && e.eventType !== "package_end") return false;
      const eventDate = new Date(e.date);
      return eventDate >= today && eventDate <= futureDate;
    });
  }, [events]);

  const getMostUsedPackages = useCallback(() => {
    const packageUsage: Record<string, number> = {};
    
    clients.forEach((c) => {
      c.services.forEach((s) => {
        if (s.packageId) {
          packageUsage[s.packageId] = (packageUsage[s.packageId] || 0) + 1;
        }
      });
    });

    return packages
      .map((pkg) => ({ pkg, count: packageUsage[pkg.id] || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [clients, packages]);

  const value: DataContextType = {
    leads,
    addLead,
    updateLead,
    deleteLead,
    convertLeadToClient,
    clients,
    addClient,
    addClientWithService,
    updateClient,
    deleteClient,
    addServiceToClient,
    updateService,
    deleteService,
    archiveClient,
    restoreClient,
    reactivateClient,
    markClientCompleted,
    convertClientToLead,
    getCompletedClients,
    getCompletedClientsThisMonth,
    mainPackages,
    addMainPackage,
    updateMainPackage,
    deleteMainPackage,
    subPackages,
    addSubPackage,
    updateSubPackage,
    deleteSubPackage,
    getSubPackagesByMainPackage,
    packages,
    addPackage,
    updatePackage,
    deletePackage,
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoicePaid,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    getActiveClients,
    getClientsWithExpiringServices,
    getServicesCompletedThisMonth,
    getTotalIncome,
    getTotalExpenses,
    getNetProfit,
    getOverdueInvoices,
    getUpcomingInvoices,
    getGoalCompletionRate,
    getTodayEvents,
    getUpcomingDeadlines,
    getMostUsedPackages,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

// Export types and constants
export { initialPackages as seedPackages };
export const serviceCategories = [
  { key: "social_media", labelAr: "سوشيال ميديا", labelEn: "Social Media" },
  { key: "website", labelAr: "موقع إلكتروني", labelEn: "Website" },
  { key: "app", labelAr: "تطبيق", labelEn: "App" },
  { key: "ai", labelAr: "ذكاء اصطناعي", labelEn: "AI" },
  { key: "branding", labelAr: "هوية بصرية / لوغو", labelEn: "Branding / Logo" },
  { key: "custom", labelAr: "خدمة مخصصة", labelEn: "Custom" },
];
