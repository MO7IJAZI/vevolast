import "dotenv/config";
import { db } from "./db";
import { users, leads, clients, clientServices, mainPackages, subPackages, invoices, employees, employeeSalaries } from "../shared/schema.js";
import { hashPassword, roleDefaultPermissions } from "./auth";
import { eq } from "drizzle-orm";
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
const initialEmployees = [
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
const initialLeads = [
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
        notes: "مهتمون بخدمات السوشيال ميديا",
        negotiatorId: "emp-1",
        createdAt: new Date("2026-01-15"),
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
        createdAt: new Date("2026-01-20"),
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
        notes: "يريدون تطبيق موبايل + موقع",
        negotiatorId: "emp-4",
        createdAt: new Date("2026-01-10"),
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
        createdAt: new Date("2026-01-05"),
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
        createdAt: new Date("2026-01-12"),
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
        createdAt: new Date("2026-01-18"),
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
        createdAt: new Date("2025-12-15"),
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
        createdAt: new Date("2025-12-10"),
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
        createdAt: new Date("2025-12-20"),
    },
];
const initialClients = [
    {
        id: "client-1",
        name: "شركة الإبداع الرقمي",
        email: "hello@digitalcreativity.com",
        phone: "+90 535 222 3344",
        company: "Digital Creativity LLC",
        country: "turkey",
        source: "referral",
        status: "active",
        createdAt: new Date("2025-11-01"),
        salesOwnerId: "emp-1",
        assignedManagerId: "emp-3",
        salesOwners: ["emp-1"],
        assignedStaff: ["emp-3", "emp-5"],
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
                serviceAssignees: ["emp-6", "emp-7"],
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
                serviceAssignees: ["emp-3"],
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
        createdAt: new Date("2025-10-15"),
        salesOwnerId: "emp-1",
        assignedManagerId: "emp-2",
        salesOwners: ["emp-1", "emp-2"],
        assignedStaff: ["emp-6"],
        services: [
            {
                id: "svc-3",
                serviceType: "social_media",
                serviceName: "Social Media – Gold",
                serviceNameEn: "Social Media – Gold",
                startDate: "2026-01-01",
                dueDate: "2026-01-31",
                price: 2000,
                currency: "USD",
                status: "completed",
                assignedTo: "سارة",
                serviceAssignees: ["emp-6", "emp-7"],
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
                assignedTo: "سارة",
                serviceAssignees: ["emp-6"],
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
        createdAt: new Date("2025-12-01"),
        salesOwnerId: "emp-4",
        assignedManagerId: "emp-5",
        salesOwners: ["emp-4"],
        assignedStaff: ["emp-5", "emp-3"],
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
                serviceAssignees: ["emp-3", "emp-5"],
                mainPackageId: "main-pkg-5",
            },
        ],
    },
];
const initialInvoices = [
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
// ============ SEED FUNCTION ============
async function seed() {
    console.log("Starting seed process...");
    // 1. Seed Main Packages (Categories)
    console.log("Seeding Main Packages...");
    try {
        const existingPkgs = await db.select().from(mainPackages);
        if (existingPkgs.length === 0) {
            await db.insert(mainPackages).values(initialMainPackages);
            console.log(`Seeded ${initialMainPackages.length} main packages.`);
        }
        else {
            console.log("Main packages already exist, skipping.");
        }
    }
    catch (error) {
        console.error("Error seeding main packages:", error);
    }
    // 2. Seed Sub Packages (Plans)
    console.log("Seeding Sub Packages...");
    try {
        const existingSubPkgs = await db.select().from(subPackages);
        if (existingSubPkgs.length === 0) {
            await db.insert(subPackages).values(initialSubPackages);
            console.log(`Seeded ${initialSubPackages.length} sub packages.`);
        }
        else {
            console.log("Sub packages already exist, skipping.");
        }
    }
    catch (error) {
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
        }
        else {
            console.log("Admin user already exists.");
        }
    }
    catch (error) {
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
        }
        else {
            console.log("Employees already exist, skipping.");
        }
    }
    catch (error) {
        console.error("Error seeding employees:", error);
    }
    // 5. Seed Leads
    try {
        const existingLeads = await db.select().from(leads);
        if (existingLeads.length === 0) {
            await db.insert(leads).values(initialLeads);
            console.log(`Seeded ${initialLeads.length} leads.`);
        }
        else {
            console.log("Leads already exist, skipping.");
        }
    }
    catch (error) {
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
                    const serviceInserts = services.map(s => ({
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
        }
        else {
            console.log("Clients already exist, skipping.");
        }
    }
    catch (error) {
        console.error("Error seeding clients:", error);
    }
    // 7. Seed Invoices
    console.log("Seeding Invoices...");
    try {
        const existingInvoices = await db.select().from(invoices);
        if (existingInvoices.length === 0) {
            await db.insert(invoices).values(initialInvoices);
            console.log(`Seeded ${initialInvoices.length} invoices.`);
        }
        else {
            console.log("Invoices already exist, skipping.");
        }
    }
    catch (error) {
        console.error("Error seeding invoices:", error);
    }
    console.log("Seed process completed.");
    process.exit(0);
}
seed().catch((err) => {
    console.error("❌ Fatal error in seed script:", err);
    process.exit(1);
});
