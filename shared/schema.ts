
import { mysqlTable, text, int, boolean, timestamp, varchar, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// Helper for UUID generation in application layer is preferred for MySQL compatibility across versions
// We will define ID columns as varchar(36)

export const session = mysqlTable("session", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("employee"),
  permissions: json("permissions").default(sql`('[]')`),
  avatar: text("avatar"),
  isActive: boolean("is_active").notNull().default(true),
  nameEn: varchar("name_en", { length: 255 }),
  department: varchar("department", { length: 100 }),
  employeeId: varchar("employee_id", { length: 100 }),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InferSelectModel<typeof users>;

export const clientUsers = mysqlTable("client_users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  clientId: varchar("client_id", { length: 36 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientNameEn: varchar("client_name_en", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertClientUserSchema = createInsertSchema(clientUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export type InsertClientUser = z.infer<typeof insertClientUserSchema>;
export type ClientUser = InferSelectModel<typeof clientUsers>;

export const invitations = mysqlTable("invitations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("employee"),
  permissions: json("permissions").default(sql`('[]')`),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  name: varchar("name", { length: 255 }),
  nameEn: varchar("name_en", { length: 255 }),
  department: varchar("department", { length: 100 }),
  employeeId: varchar("employee_id", { length: 100 }),
  usedAt: timestamp("used_at"),
  invitedBy: varchar("invited_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
});

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = InferSelectModel<typeof invitations>;

export const PermissionEnum = z.enum([
  "view_clients", "edit_clients", "archive_clients",
  "view_leads", "edit_leads",
  "create_packages", "edit_packages",
  "view_invoices", "create_invoices", "edit_invoices",
  "view_goals", "edit_goals",
  "view_finance", "edit_finance",
  "view_employees", "edit_employees",
  "assign_employees", "edit_work_tracking"
]);

export type Permission = z.infer<typeof PermissionEnum>;

export const passwordResets = mysqlTable("password_resets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetSchema = createInsertSchema(passwordResets).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
export type PasswordReset = InferSelectModel<typeof passwordResets>;

export const goalTypeConfigs: Record<GoalType, { labelAr: string; labelEn: string; isPercentage: boolean; hasCurrency: boolean; hasCountry: boolean; defaultIcon: string }> = {
  financial: { labelAr: "مالي", labelEn: "Financial", isPercentage: false, hasCurrency: true, hasCountry: true, defaultIcon: "DollarSign" },
  clients: { labelAr: "عملاء", labelEn: "Clients", isPercentage: false, hasCurrency: false, hasCountry: true, defaultIcon: "Users" },
  leads: { labelAr: "عملاء محتملون", labelEn: "Leads", isPercentage: false, hasCurrency: false, hasCountry: true, defaultIcon: "Target" },
  projects: { labelAr: "مشاريع", labelEn: "Projects", isPercentage: false, hasCurrency: false, hasCountry: true, defaultIcon: "Folder" },
  performance: { labelAr: "أداء", labelEn: "Performance", isPercentage: true, hasCurrency: false, hasCountry: false, defaultIcon: "TrendingUp" },
  custom: { labelAr: "مخصص", labelEn: "Custom", isPercentage: false, hasCurrency: false, hasCountry: false, defaultIcon: "Star" },
};

export const GoalTypeEnum = z.enum([
  "financial",
  "clients",
  "leads",
  "projects",
  "performance",
  "custom"
]);

export type GoalType = z.infer<typeof GoalTypeEnum>;

export const CurrencyEnum = z.enum(["TRY", "USD", "EUR", "SAR", "EGP", "AED"]);
export type Currency = z.infer<typeof CurrencyEnum>;

export const TransactionTypeEnum = z.enum(["income", "expense"]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const ExpenseCategoryEnum = z.enum([
  "salaries",
  "ads",
  "tools",
  "subscriptions",
  "refunds",
  "rent",
  "utilities",
  "office_supplies",
  "maintenance",
  "legal",
  "taxes",
  "other"
]);
export type ExpenseCategory = z.infer<typeof ExpenseCategoryEnum>;

export const leads = mysqlTable("leads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  country: varchar("country", { length: 100 }),
  source: varchar("source", { length: 100 }),
  stage: varchar("stage", { length: 50 }).notNull().default("new"),
  dealValue: int("deal_value"),
  dealCurrency: varchar("deal_currency", { length: 10 }),
  notes: text("notes"),
  negotiatorId: varchar("negotiator_id", { length: 36 }),
  wasConfirmedClient: boolean("was_confirmed_client").default(false),
  convertedFromClientId: varchar("converted_from_client_id", { length: 36 }),
  preservedClientData: json("preserved_client_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = InferSelectModel<typeof leads>;

export const clients = mysqlTable("clients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  country: varchar("country", { length: 100 }),
  source: varchar("source", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  salesOwnerId: varchar("sales_owner_id", { length: 36 }),
  assignedManagerId: varchar("assigned_manager_id", { length: 36 }),
  convertedFromLeadId: varchar("converted_from_lead_id", { length: 36 }),
  leadCreatedAt: timestamp("lead_created_at"),
  salesOwners: json("sales_owners").default(sql`('[]')`),
  assignedStaff: json("assigned_staff").default(sql`('[]')`),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = InferSelectModel<typeof clients>;

export const clientServices = mysqlTable("client_services", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clientId: varchar("client_id", { length: 36 }).notNull(),
  mainPackageId: varchar("main_package_id", { length: 36 }).notNull(),
  subPackageId: varchar("sub_package_id", { length: 36 }),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  serviceNameEn: varchar("service_name_en", { length: 255 }),

  startDate: varchar("start_date", { length: 20 }).notNull(),
  endDate: varchar("end_date", { length: 20 }),
  status: varchar("status", { length: 50 }).notNull().default("not_started"),
  price: int("price"),
  currency: varchar("currency", { length: 10 }),
  salesEmployeeId: varchar("sales_employee_id", { length: 36 }),
  executionEmployeeIds: json("execution_employee_ids").default(sql`('[]')`),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertClientServiceSchema = createInsertSchema(clientServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertClientService = z.infer<typeof insertClientServiceSchema>;
export type ClientService = InferSelectModel<typeof clientServices>;

export const mainPackages = mysqlTable("main_packages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  description: text("description"),
  descriptionEn: text("description_en"),
  order: int("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertMainPackageSchema = createInsertSchema(mainPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMainPackage = z.infer<typeof insertMainPackageSchema>;
export type MainPackage = InferSelectModel<typeof mainPackages>;

export const subPackages = mysqlTable("sub_packages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  mainPackageId: varchar("main_package_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  price: int("price").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  billingType: varchar("billing_type", { length: 50 }).notNull(),
  description: text("description"),
  descriptionEn: text("description_en"),
  duration: varchar("duration", { length: 50 }),
  durationEn: varchar("duration_en", { length: 50 }),
  deliverables: json("deliverables").default(sql`('[]')`),
  platforms: json("platforms").default(sql`('[]')`),
  features: text("features"),
  featuresEn: text("features_en"),
  isActive: boolean("is_active").notNull().default(true),
  order: int("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertSubPackageSchema = createInsertSchema(subPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubPackage = z.infer<typeof insertSubPackageSchema>;
export type SubPackage = InferSelectModel<typeof subPackages>;

export const invoices = mysqlTable("invoices", {
  id: varchar("id", { length: 36 }).primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  clientId: varchar("client_id", { length: 36 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  issueDate: varchar("issue_date", { length: 20 }).notNull(),
  dueDate: varchar("due_date", { length: 20 }).notNull(),
  paidDate: varchar("paid_date", { length: 20 }),
  items: json("items").notNull().default(sql`('[]')`),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = InferSelectModel<typeof invoices>;

export const employees = mysqlTable("employees", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 50 }).notNull(),
  roleAr: varchar("role_ar", { length: 50 }),
  department: varchar("department", { length: 100 }),
  jobTitle: varchar("job_title", { length: 100 }),
  profileImage: text("profile_image"),
  salaryType: varchar("salary_type", { length: 50 }).notNull().default("monthly"),
  salaryAmount: int("salary_amount"),
  rate: int("rate"),
  rateType: varchar("rate_type", { length: 50 }),
  salaryCurrency: varchar("salary_currency", { length: 10 }).notNull().default("USD"),
  salaryNotes: text("salary_notes"),
  startDate: varchar("start_date", { length: 20 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = InferSelectModel<typeof employees>;

export const serviceDeliverables = mysqlTable("service_deliverables", {
  id: varchar("id", { length: 36 }).primaryKey(),
  serviceId: varchar("service_id", { length: 36 }).notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  labelAr: varchar("label_ar", { length: 255 }).notNull(),
  labelEn: varchar("label_en", { length: 255 }).notNull(),
  target: int("target").notNull(),
  completed: int("completed").notNull().default(0),
  icon: varchar("icon", { length: 50 }),
  isBoolean: boolean("is_boolean").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertServiceDeliverableSchema = createInsertSchema(serviceDeliverables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServiceDeliverable = z.infer<typeof insertServiceDeliverableSchema>;
export type ServiceDeliverable = InferSelectModel<typeof serviceDeliverables>;

export const workActivityLogs = mysqlTable("work_activity_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  serviceId: varchar("service_id", { length: 36 }).notNull(),
  deliverableId: varchar("deliverable_id", { length: 36 }),
  employeeId: varchar("employee_id", { length: 36 }),
  action: varchar("action", { length: 50 }).notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkActivityLogSchema = createInsertSchema(workActivityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkActivityLog = z.infer<typeof insertWorkActivityLogSchema>;
export type WorkActivityLog = InferSelectModel<typeof workActivityLogs>;

export const serviceReports = mysqlTable("service_reports", {
  id: varchar("id", { length: 36 }).primaryKey(),
  serviceId: varchar("service_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertServiceReportSchema = createInsertSchema(serviceReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServiceReport = z.infer<typeof insertServiceReportSchema>;
export type ServiceReport = InferSelectModel<typeof serviceReports>;

export const transactions = mysqlTable("transactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  description: text("description").notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  date: varchar("date", { length: 20 }).notNull(),
  relatedId: varchar("related_id", { length: 36 }),
  relatedType: varchar("related_type", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("completed"),
  notes: text("notes"),
  clientId: varchar("client_id", { length: 36 }),
  serviceId: varchar("service_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = InferSelectModel<typeof transactions>;

export const clientPayments = mysqlTable("client_payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clientId: varchar("client_id", { length: 36 }).notNull(),
  serviceId: varchar("service_id", { length: 36 }),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  paymentDate: varchar("payment_date", { length: 20 }).notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientPaymentSchema = createInsertSchema(clientPayments).omit({
  id: true,
  createdAt: true,
});

export type InsertClientPayment = z.infer<typeof insertClientPaymentSchema>;
export type ClientPayment = InferSelectModel<typeof clientPayments>;

export const goals = mysqlTable("goals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  target: int("target").notNull(),
  current: int("current").default(0),
  currency: varchar("currency", { length: 10 }),
  icon: varchar("icon", { length: 50 }),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default("not_started"),
  responsiblePerson: varchar("responsible_person", { length: 255 }),
  country: varchar("country", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = InferSelectModel<typeof goals>;

export const GoalStatusEnum = z.enum(["not_started", "in_progress", "achieved", "failed"]);
export type GoalStatus = z.infer<typeof GoalStatusEnum>;

export const goalFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: GoalTypeEnum,
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  target: z.number().min(0),
  current: z.number().min(0).optional(),
  currency: CurrencyEnum.optional().nullable(),
  icon: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: GoalStatusEnum.optional(),
  responsiblePerson: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export type GoalFormData = z.infer<typeof goalFormSchema>;

export const EventTypeEnum = z.enum([
  "manual",
  "package_end",
  "delivery_due",
  "payroll",
  "client_payment",
  "task"
]);
export type EventType = z.infer<typeof EventTypeEnum>;

export const EventStatusEnum = z.enum(["upcoming", "today", "overdue", "done"]);
export type EventStatus = z.infer<typeof EventStatusEnum>;

export const EventPriorityEnum = z.enum(["low", "medium", "high"]);
export type EventPriority = z.infer<typeof EventPriorityEnum>;

export const eventTypeConfigs = {
  manual: { color: "#3b82f6", labelAr: "يدوي", labelEn: "Manual" },
  package_end: { color: "#ef4444", labelAr: "نهاية باقة", labelEn: "Package End" },
  delivery_due: { color: "#f59e0b", labelAr: "تسليم عمل", labelEn: "Delivery Due" },
  payroll: { color: "#10b981", labelAr: "راتب", labelEn: "Payroll" },
  client_payment: { color: "#8b5cf6", labelAr: "دفعة عميل", labelEn: "Client Payment" },
  task: { color: "#f97316", labelAr: "مهمة", labelEn: "Task" },
};

export const calendarEvents = mysqlTable("calendar_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  source: varchar("source", { length: 50 }).notNull().default("manual"),
  eventType: varchar("event_type", { length: 50 }).notNull().default("manual"),
  titleAr: varchar("title_ar", { length: 255 }).notNull(),
  titleEn: varchar("title_en", { length: 255 }),
  date: varchar("date", { length: 20 }).notNull(),
  time: varchar("time", { length: 20 }),
  status: varchar("status", { length: 50 }).notNull().default("upcoming"),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  clientId: varchar("client_id", { length: 36 }),
  serviceId: varchar("service_id", { length: 36 }),
  employeeId: varchar("employee_id", { length: 36 }),
  salesId: varchar("sales_id", { length: 36 }),
  notes: text("notes"),
  reminderDays: varchar("reminder_days", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = InferSelectModel<typeof calendarEvents>;

export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  titleAr: varchar("title_ar", { length: 255 }).notNull(),
  titleEn: varchar("title_en", { length: 255 }),
  messageAr: text("message_ar").notNull(),
  messageEn: text("message_en"),
  read: boolean("read").notNull().default(false),
  relatedId: varchar("related_id", { length: 36 }),
  relatedType: varchar("related_type", { length: 50 }),
  snoozedUntil: timestamp("snoozed_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = InferSelectModel<typeof notifications>;

export const BreakTypeEnum = z.enum(["short", "long", "lunch"]);
export type BreakType = z.infer<typeof BreakTypeEnum>;

export const WorkSegmentSchema = z.object({
  type: z.enum(["work", "break"]),
  startAt: z.string(),
  endAt: z.string().optional(),
  breakType: BreakTypeEnum.optional(),
  note: z.string().optional(),
});
export type WorkSegment = z.infer<typeof WorkSegmentSchema>;

export const workSessions = mysqlTable("work_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 36 }).notNull(),
  date: varchar("date", { length: 20 }).notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: varchar("status", { length: 50 }).notNull().default("not_started"),
  segments: json("segments").default(sql`('[]')`),
  totalDuration: int("total_duration").notNull().default(0),
  breakDuration: int("break_duration").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertWorkSessionSchema = createInsertSchema(workSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkSession = z.infer<typeof insertWorkSessionSchema>;
export type WorkSession = InferSelectModel<typeof workSessions>;

export const payrollPayments = mysqlTable("payroll_payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 36 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  paymentDate: varchar("payment_date", { length: 20 }).notNull(),
  period: varchar("period", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("paid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPayrollPaymentSchema = createInsertSchema(payrollPayments).omit({
  id: true,
  createdAt: true,
});

export type InsertPayrollPayment = z.infer<typeof insertPayrollPaymentSchema>;
export type PayrollPayment = InferSelectModel<typeof payrollPayments>;

export const employeeSalaries = mysqlTable("employee_salaries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 36 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  effectiveDate: varchar("effective_date", { length: 20 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmployeeSalarySchema = createInsertSchema(employeeSalaries).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployeeSalary = z.infer<typeof insertEmployeeSalarySchema>;
export type EmployeeSalary = InferSelectModel<typeof employeeSalaries>;

export const systemSettings = mysqlTable("system_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default("current"),
  settings: json("settings").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings);

export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = InferSelectModel<typeof systemSettings>;

export const exchangeRates = mysqlTable("exchange_rates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  base: varchar("base", { length: 10 }).notNull().default("USD"),
  date: varchar("date", { length: 20 }).notNull(),
  rates: text("rates").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  fetchedAt: true,
});

export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = InferSelectModel<typeof exchangeRates>;
