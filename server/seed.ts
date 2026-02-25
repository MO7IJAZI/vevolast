import "dotenv/config";
import { db } from "./db";
import { 
  users,
  leads,
  clients,
  clientServices,
  mainPackages,
  subPackages,
  invoices,
  employees,
  employeeSalaries,
  goals,
  transactions,
  clientPayments,
  payrollPayments,
  calendarEvents,
  workSessions,
  notifications,
  systemSettings,
  exchangeRates,
  serviceDeliverables,
  workActivityLogs,
  serviceReports,
  clientUsers,
  invitations,
  passwordResets
} from "../shared/schema.js";
import { hashPassword, roleDefaultPermissions } from "./auth";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

// ============ DATA DEFINITIONS ============

const initialMainPackages = [
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

const initialSubPackages = [
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

const initialEmployees: any[] = [];

const initialLeads: any[] = [];

const initialClients: any[] = [];

const initialInvoices: any[] = [];

const initialGoals: any[] = [];

const initialClientPayments: any[] = [];

const initialPayrollPayments: any[] = [];

const initialTransactions: any[] = [];

const initialWorkSessions: any[] = [];

const initialCalendarEvents: any[] = [];

const initialSystemSettings = {
  id: "current",
  settings: {
    companyName: "Vevoline",
    dateFormat: "DD/MM/YYYY",
    timezone: "Asia/Istanbul",
    defaultGoalCurrency: "TRY",
    defaultInvoiceCurrency: "TRY",
    enableMultiCurrency: true,
    defaultTaxRate: 18,
    enableTaxPerInvoice: true,
    currencySymbolPosition: "before",
    enabledGoalTypes: ["financial", "clients", "leads", "projects", "performance", "custom"],
    defaultGoalStatus: "in_progress",
    allowManualProgress: true,
    enableGoalCarryOver: false,
    clientStatuses: ["active", "on_hold", "expired"],
    defaultClientStatus: "active",
    enableExpirationReminders: true,
    reminderDays: 7,
    allowMultiplePackages: true,
    invoiceFormat: "INV-0001",
    defaultDueDays: 14,
    allowEditPaidInvoices: false,
    invoiceFooter: "",
    enablePdfExport: true,
    roles: ["admin", "manager", "staff"],
    defaultRole: "staff",
    allowSelfEdit: true,
    notifyExpiringClients: true,
    notifyOverdueInvoices: true,
    notifyGoalsBehind: true,
    notificationDelivery: "in_app",
    sidebarMode: "expanded",
    enableAnimations: true,
    density: "comfortable",
    confirmDeletes: true,
  },
};

const initialExchangeRates = [
  {
    id: "rates-2026-01-15",
    base: "USD",
    date: "2026-01-15",
    rates: JSON.stringify({
      TRY: 30.5,
      EUR: 0.92,
      SAR: 3.75,
      AED: 3.67,
      EGP: 50.0,
    }),
  },
];

// ============ SEED FUNCTION ============

async function seed() {
  console.log("Starting seed process...");

  console.log("Clearing existing data...");
  try {
    await db.delete(workActivityLogs);
    await db.delete(serviceDeliverables);
    await db.delete(serviceReports);
    await db.delete(transactions);
    await db.delete(clientPayments);
    await db.delete(calendarEvents);
    await db.delete(invoices);
    await db.delete(clientServices);
    await db.delete(workSessions);
    await db.delete(payrollPayments);
    await db.delete(employeeSalaries);
    await db.delete(goals);
    await db.delete(notifications);
    await db.delete(clients);
    await db.delete(leads);
    await db.delete(employees);
    await db.delete(clientUsers);
    await db.delete(invitations);
    await db.delete(passwordResets);
    await db.delete(systemSettings);
    await db.delete(exchangeRates);
    await db.delete(subPackages);
    await db.delete(mainPackages);
    await db.delete(users);
  } catch (error) {
    console.error("Error clearing existing data:", error);
  }

  // 1. Seed Main Packages (Categories)
  console.log("Seeding Main Packages...");
  try {
    const existingPkgs = await db.select().from(mainPackages);
    if (existingPkgs.length === 0) {
      await db.insert(mainPackages).values(initialMainPackages);
      console.log(`Seeded ${initialMainPackages.length} main packages.`);
    } else {
      console.log("Main packages already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding main packages:", error);
  }

  // 2. Seed Sub Packages (Plans)
  console.log("Seeding Sub Packages...");
  try {
    const existingSubPkgs = await db.select().from(subPackages);
    if (existingSubPkgs.length === 0) {
      await db.insert(subPackages).values(initialSubPackages);
      console.log(`Seeded ${initialSubPackages.length} sub packages.`);
    } else {
      console.log("Sub packages already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding sub packages:", error);
  }

  // 3. Seed Admin User
  try {
    const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@vevoline.com"));
    if (existingAdmin.length === 0) {
      const password = await hashPassword("adminadmin123");
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: "admin@vevoline.com",
        password,
        name: "Admin User",
        role: "admin",
        permissions: roleDefaultPermissions.admin,
        isActive: true,
      });
      console.log("Admin user seeded.");
    } else {
      console.log("Admin user already exists.");
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }

  // 4. Seed Employees
  console.log("Seeding Employees...");
  try {
    const existingEmps = await db.select().from(employees);
    if (existingEmps.length === 0) {
      await db.insert(employees).values(initialEmployees);
      console.log(`Seeded ${initialEmployees.length} employees.`);

      const salaryInserts = initialEmployees.map(emp => ({
        id: crypto.randomUUID(),
        employeeId: emp.id,
        amount: emp.salaryAmount || 0,
        currency: emp.salaryCurrency || "USD",
        effectiveDate: emp.startDate,
        type: "basic"
      }));
      await db.insert(employeeSalaries).values(salaryInserts);
      console.log(`Seeded ${salaryInserts.length} employee salary configurations.`);
    } else {
      console.log("Employees already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding employees:", error);
  }

  // 5. Seed Leads
  try {
    const existingLeads = await db.select().from(leads);
    if (existingLeads.length === 0) {
      await db.insert(leads).values(initialLeads);
      console.log(`Seeded ${initialLeads.length} leads.`);
    } else {
      console.log("Leads already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding leads:", error);
  }

  // 6. Seed Clients & Services
  try {
    const existingClients = await db.select().from(clients);
    if (existingClients.length === 0) {
      for (const clientData of initialClients) {
        const { services, ...clientFields } = clientData;
        const clientId = clientFields.id ?? crypto.randomUUID();
        await db.insert(clients).values({ ...clientFields, id: clientId });

        if (services && services.length > 0) {
          const serviceInserts = services.map((s: { id: any; mainPackageId: any; serviceName: any; serviceNameEn: any; startDate: any; dueDate: any; price: any; currency: any; status: any; serviceAssignees: any; }) => ({
            id: s.id,
            clientId,
            mainPackageId: s.mainPackageId,
            subPackageId: null,
            serviceName: s.serviceName,
            serviceNameEn: s.serviceNameEn || s.serviceName,
            startDate: s.startDate,
            endDate: s.dueDate,
            price: s.price,
            currency: s.currency,
            status: s.status,
            executionEmployeeIds: s.serviceAssignees,
            salesEmployeeId: clientFields.salesOwnerId,
          }));
          await db.insert(clientServices).values(serviceInserts);
        }
      }
      console.log(`Seeded ${initialClients.length} clients and their services.`);
    } else {
      console.log("Clients already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding clients:", error);
  }

  // 7. Seed Invoices
  console.log("Seeding Invoices...");
  try {
    const existingInvoices = await db.select().from(invoices);
    if (existingInvoices.length === 0) {
      await db.insert(invoices).values(initialInvoices);
      console.log(`Seeded ${initialInvoices.length} invoices.`);
    } else {
      console.log("Invoices already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding invoices:", error);
  }

  console.log("Seeding Goals...");
  try {
    const existingGoals = await db.select().from(goals);
    if (existingGoals.length === 0) {
      await db.insert(goals).values(initialGoals);
      console.log(`Seeded ${initialGoals.length} goals.`);
    } else {
      console.log("Goals already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding goals:", error);
  }

  console.log("Seeding Client Payments and Transactions...");
  try {
    const existingPayments = await db.select().from(clientPayments);
    if (existingPayments.length === 0) {
      await db.insert(clientPayments).values(initialClientPayments);
      console.log(`Seeded ${initialClientPayments.length} client payments.`);
    } else {
      console.log("Client payments already exist, skipping.");
    }
    const existingTransactions = await db.select().from(transactions);
    if (existingTransactions.length === 0) {
      await db.insert(transactions).values(initialTransactions);
      console.log(`Seeded ${initialTransactions.length} transactions.`);
    } else {
      console.log("Transactions already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding client payments or transactions:", error);
  }

  console.log("Seeding Payroll Payments...");
  try {
    const existingPayroll = await db.select().from(payrollPayments);
    if (existingPayroll.length === 0) {
      await db.insert(payrollPayments).values(initialPayrollPayments);
      console.log(`Seeded ${initialPayrollPayments.length} payroll payments.`);
    } else {
      console.log("Payroll payments already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding payroll payments:", error);
  }

  console.log("Seeding Work Sessions...");
  try {
    const existingSessions = await db.select().from(workSessions);
    if (existingSessions.length === 0) {
      await db.insert(workSessions).values(initialWorkSessions);
      console.log(`Seeded ${initialWorkSessions.length} work sessions.`);
    } else {
      console.log("Work sessions already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding work sessions:", error);
  }

  console.log("Seeding Calendar Events...");
  try {
    const existingEvents = await db.select().from(calendarEvents);
    if (existingEvents.length === 0) {
      await db.insert(calendarEvents).values(initialCalendarEvents);
      console.log(`Seeded ${initialCalendarEvents.length} calendar events.`);
    } else {
      console.log("Calendar events already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding calendar events:", error);
  }

  console.log("Seeding System Settings...");
  try {
    const existingSettings = await db.select().from(systemSettings);
    if (existingSettings.length === 0) {
      await db.insert(systemSettings).values(initialSystemSettings);
      console.log("Seeded system settings.");
    } else {
      console.log("System settings already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding system settings:", error);
  }

  console.log("Seeding Exchange Rates...");
  try {
    const existingRates = await db.select().from(exchangeRates);
    if (existingRates.length === 0) {
      await db.insert(exchangeRates).values(initialExchangeRates);
      console.log(`Seeded ${initialExchangeRates.length} exchange rates.`);
    } else {
      console.log("Exchange rates already exist, skipping.");
    }
  } catch (error) {
    console.error("Error seeding exchange rates:", error);
  }

  console.log("Seed process completed.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Fatal error in seed script:", err);
  process.exit(1);
});
