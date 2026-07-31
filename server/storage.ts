
import { 
  type User, type InsertUser, type Goal, type InsertGoal,
  type Transaction, type InsertTransaction,
  type ClientPayment, type InsertClientPayment,
  type PayrollPayment, type InsertPayrollPayment,
  type EmployeeSalary, type InsertEmployeeSalary,
  type CalendarEvent, type InsertCalendarEvent,
  type Notification, type InsertNotification,
  type WorkSession, type InsertWorkSession,
  type Client, type InsertClient,
  type Lead, type InsertLead,
  type ClientService, type InsertClientService,
  type MainPackage, type InsertMainPackage,
  type SubPackage, type InsertSubPackage,
  type Invoice, type InsertInvoice,
  type Employee, type InsertEmployee,
  type SystemSettings, type InsertSystemSettings,
  transactions, clientPayments, payrollPayments, employeeSalaries,
  calendarEvents, notifications, workSessions, clients, leads, clientServices,
  mainPackages, subPackages, invoices, employees, systemSettings,
  users, goals, serviceDeliverables, workActivityLogs, serviceReports, clientUsers, roles, invitations, passwordResets
} from "../shared/schema.js";
import { db } from "./db";
import { randomUUID } from "crypto";
import { eq, and, desc, or, isNull, sql, inArray } from "drizzle-orm";
import { convertCurrency } from "./exchangeRates";

// Filter types
interface TransactionFilters {
  type?: string;
  month?: number;
  year?: number;
  clientId?: string;
  employeeId?: string;
}

interface PaymentFilters {
  clientId?: string;
  employeeId?: string;
  month?: number;
  year?: number;
}

interface FinanceSummaryParams {
  month?: number;
  year?: number;
  displayCurrency: string;
}

interface FinanceLedgerParams {
  month?: number;
  year?: number;
  displayCurrency: string;
}

interface FinanceTrendParams extends FinanceLedgerParams {
  groupBy?: "monthly" | "weekly";
}

interface FinanceBreakdownItem {
  key: string;
  label: string;
  labelAr: string;
  amount: number;
}

interface FinanceLedgerEntry {
  id: string;
  recordId: string;
  source: "transaction" | "client_payment" | "payroll_payment" | "service_completion";
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  date: string;
  relatedId: string | null;
  relatedType: string | null;
  status: string;
  notes: string | null;
  clientId: string | null;
  serviceId: string | null;
  employeeId: string | null;
  isSystemManaged: boolean;
  canEdit: boolean;
  canDelete: boolean;
  lockedReason: string | null;
  displayCurrency: string;
}

interface FinanceTrendPoint {
  key: string;
  label: string;
  labelAr: string;
  income: number;
  expenses: number;
  netProfit: number;
}

interface FinancePayrollReportItem {
  employeeId: string;
  payType: string;
  salaryCurrency: string;
  monthlyAmount: number;
  rateAmount: number;
  rateUnitsCount: number;
  paidThisPeriod: number;
  remaining: number;
  expectedSalary: number;
  payments: PayrollPayment[];
}

interface FinanceClientReportItem {
  clientId: string;
  expectedMonthly: number;
  expectedOneTime: number;
  paidThisPeriod: number;
  paidOverall: number;
  oneTimePaidThisPeriod: number;
  unallocatedPaidThisPeriod: number;
  unallocatedPaidOverall: number;
  due: number;
  totalOutstanding: number;
  isOverdue: boolean;
  payments: ClientPayment[];
  services: {
    serviceId: string;
    serviceName: string;
    serviceNameEn: string | null;
    status: string;
    billingType: string;
    amount: number;
    currency: string;
    convertedAmount: number;
    paidThisPeriod: number;
    paidOverall: number;
    remaining: number;
    isCompleted: boolean;
    isSettled: boolean;
  }[];
}

interface CalendarEventFilters {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  status?: string;
  clientId?: string;
  employeeId?: string;
}

interface NotificationFilters {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface FinanceExecutor {
  select: typeof db.select;
  insert: typeof db.insert;
  update: typeof db.update;
  delete: typeof db.delete;
}

interface ServiceDeliverableSnapshot {
  key: string;
  label: string;
  labelAr: string;
  labelEn: string;
  target: number;
  completed: number;
  isBoolean: boolean;
  icon?: string | null;
}

interface DeliverableDefinition {
  key?: string;
  label?: string;
  labelAr?: string;
  labelEn?: string;
  value?: string | number;
  target?: number;
  completed?: number;
  done?: number;
  total?: number;
  isBoolean?: boolean;
  icon?: string | null;
}

interface PreservedClientData {
  client: Partial<Client>;
  services: Partial<ClientService>[];
}

interface WorkSessionFilters {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

class FinanceMutationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "FinanceMutationError";
    this.status = status;
  }
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getGoals(): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;

  // Client workflow methods
  archiveClient(id: string): Promise<Client | undefined>;
  convertClientToLead(id: string): Promise<Lead>;

  // Finance methods
  getTransactions(filters: TransactionFilters): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
  
  getClientPayments(filters: PaymentFilters): Promise<ClientPayment[]>;
  createClientPayment(payment: InsertClientPayment): Promise<ClientPayment>;
  updateClientPayment(id: string, payment: Partial<InsertClientPayment>): Promise<ClientPayment | undefined>;
  deleteClientPayment(id: string): Promise<boolean>;
  
  getPayrollPayments(filters: PaymentFilters): Promise<PayrollPayment[]>;
  createPayrollPayment(payment: InsertPayrollPayment): Promise<PayrollPayment>;
  updatePayrollPayment(id: string, payment: Partial<InsertPayrollPayment>): Promise<PayrollPayment | undefined>;
  deletePayrollPayment(id: string): Promise<boolean>;
  
  getEmployeeSalaries(): Promise<EmployeeSalary[]>;
  getEmployeeSalary(employeeId: string): Promise<EmployeeSalary | null>;
  upsertEmployeeSalary(employeeId: string, data: Partial<InsertEmployeeSalary>): Promise<EmployeeSalary>;
  
  getFinanceLedger(params: FinanceLedgerParams): Promise<FinanceLedgerEntry[]>;
  getFinancePayrollReport(params: FinanceLedgerParams): Promise<FinancePayrollReportItem[]>;
  getFinanceClientReport(params: FinanceLedgerParams): Promise<FinanceClientReportItem[]>;
  getFinanceSummary(params: FinanceSummaryParams): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    overdueAmount: number;
    payrollRemaining: number;
    expectedRevenue: number;
    servicesBreakdown: { packageName: string; packageNameAr: string; revenue: number }[];
    expenseBreakdown: FinanceBreakdownItem[];
    displayCurrency: string;
  }>;
  getFinanceTrend(params: FinanceTrendParams): Promise<FinanceTrendPoint[]>;

  // Calendar Events
  getCalendarEvents(filters: CalendarEventFilters): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: string): Promise<boolean>;

  // Notifications
  getNotifications(filters: NotificationFilters): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<boolean>;
  snoozeNotification(id: string, snoozedUntil: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;

  // Work Sessions
  getWorkSessions(filters: WorkSessionFilters): Promise<WorkSession[]>;
  getWorkSession(id: string): Promise<WorkSession | undefined>;
  getWorkSessionByEmployeeAndDate(employeeId: string, date: string): Promise<WorkSession | undefined>;
  createWorkSession(session: InsertWorkSession): Promise<WorkSession>;
  updateWorkSession(id: string, session: Partial<InsertWorkSession>): Promise<WorkSession | undefined>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  createClientWithService(client: InsertClient, service: Omit<InsertClientService, "clientId">): Promise<{ client: Client, service: ClientService }>;

  // Client Services
  getClientServices(clientId?: string): Promise<(ClientService & { deliverables: ServiceDeliverableSnapshot[] })[]>;
  createClientService(service: InsertClientService): Promise<ClientService>;
  updateClientService(id: string, service: Partial<InsertClientService>): Promise<ClientService | undefined>;
  updateServiceDeliverables(serviceId: string, deliverables: ServiceDeliverableSnapshot[]): Promise<void>;
  deleteClientService(id: string): Promise<boolean>;

  // Main Packages
  getMainPackages(): Promise<MainPackage[]>;
  createMainPackage(pkg: InsertMainPackage): Promise<MainPackage>;
  updateMainPackage(id: string, pkg: Partial<InsertMainPackage>): Promise<MainPackage | undefined>;
  deleteMainPackage(id: string): Promise<boolean>;

  // Sub Packages
  getSubPackages(mainPackageId?: string): Promise<SubPackage[]>;
  createSubPackage(pkg: InsertSubPackage): Promise<SubPackage>;
  updateSubPackage(id: string, pkg: Partial<InsertSubPackage>): Promise<SubPackage | undefined>;
  deleteSubPackage(id: string): Promise<boolean>;

  // Invoices
  getInvoices(clientId?: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  // System Settings
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(settings: InsertSystemSettings["settings"]): Promise<SystemSettings>;

  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  convertLeadToClient(leadId: string): Promise<Client>;
}

export class DatabaseStorage implements IStorage {
  private isMirroredFinanceTransaction(relatedType?: string | null): boolean {
    return relatedType === "client_payment" || relatedType === "payroll_payment";
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    return [];
  }

  private toDeliverableDefinitions(value: unknown): DeliverableDefinition[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is DeliverableDefinition => typeof item === "object" && item !== null);
  }

  private getDeliverableTarget(deliverable: DeliverableDefinition): number {
    if (typeof deliverable.target === "number") {
      return deliverable.target;
    }
    if (deliverable.value !== undefined && !Number.isNaN(Number(deliverable.value))) {
      return Number(deliverable.value);
    }
    return deliverable.isBoolean ? 1 : 0;
  }

  private getInvoicePaymentMarker(invoiceId: string): string {
    return `[invoice:${invoiceId}]`;
  }

  private getInvoicePaymentDescription(invoice: Invoice): string {
    return `${this.getInvoicePaymentMarker(invoice.id)} Payment for Invoice #${invoice.invoiceNumber}`;
  }

  private isInvoiceManagedClientPayment(payment: Pick<ClientPayment, "notes"> | Pick<InsertClientPayment, "notes">): boolean {
    return typeof payment.notes === "string" && /\[invoice:[^\]]+\]/.test(payment.notes);
  }

  private getClientPaymentLockReason(payment: Pick<ClientPayment, "notes"> | Pick<InsertClientPayment, "notes">): string | null {
    return this.isInvoiceManagedClientPayment(payment)
      ? "This payment is generated from an invoice. Edit the invoice instead."
      : null;
  }

  private assertAllowedManualClientPayment(payment: Pick<InsertClientPayment, "notes">): void {
    if (this.isInvoiceManagedClientPayment(payment)) {
      throw new FinanceMutationError("Invoice payment markers are reserved for system-generated invoice payments.", 409);
    }
  }

  private async findInvoicePaymentByInvoiceId(executor: FinanceExecutor, invoiceId: string): Promise<ClientPayment | undefined> {
    const marker = `%${this.getInvoicePaymentMarker(invoiceId)}%`;
    const result = await executor
      .select()
      .from(clientPayments)
      .where(sql`${clientPayments.notes} LIKE ${marker}`);
    return result[0];
  }

  private normalizeInvoiceItems(items: unknown): { description: string; quantity: number; unitPrice: number; kind?: "standard" | "tax" | "discount" }[] {
    if (!Array.isArray(items)) {
      return [];
    }

    type NormalizedInvoiceItem = { description: string; quantity: number; unitPrice: number; kind?: "standard" | "tax" | "discount" };

    return items
      .map((item): NormalizedInvoiceItem | null => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const rawDescription = "description" in item && typeof item.description === "string"
          ? item.description.trim()
          : "";
        const quantity = Number("quantity" in item ? item.quantity : 0);
        const unitPrice = Number("unitPrice" in item ? item.unitPrice : 0);

        const kind = "kind" in item && (item.kind === "standard" || item.kind === "tax" || item.kind === "discount")
          ? item.kind
          : undefined;

        if (!rawDescription && quantity <= 0 && unitPrice <= 0) {
          return null;
        }

        return {
          description: rawDescription,
          quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
          unitPrice: Number.isFinite(unitPrice)
            ? (kind === "discount" ? -Math.abs(Math.round(unitPrice)) : Math.round(unitPrice))
            : 0,
          kind,
        };
      })
      .filter((item): item is NormalizedInvoiceItem => item !== null);
  }

  private calculateInvoiceAmount(items: { description: string; quantity: number; unitPrice: number; kind?: "standard" | "tax" | "discount" }[]): number {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }

  private async prepareInvoicePayload(
    executor: FinanceExecutor,
    invoiceInput: Partial<InsertInvoice>,
    existingInvoice?: Invoice,
  ): Promise<InsertInvoice> {
    const merged = {
      ...existingInvoice,
      ...invoiceInput,
    };

    const invoiceNumber = typeof merged.invoiceNumber === "string" ? merged.invoiceNumber.trim() : "";
    if (!invoiceNumber) {
      throw new FinanceMutationError("Invoice number is required.", 400);
    }

    const duplicateInvoices = await executor
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceNumber));
    const duplicateInvoice = duplicateInvoices.find((entry) => entry.id !== existingInvoice?.id);
    if (duplicateInvoice) {
      throw new FinanceMutationError("Invoice number already exists.", 409);
    }

    if (!merged.clientId) {
      throw new FinanceMutationError("Client is required for the invoice.", 400);
    }

    const clientRows = await executor.select().from(clients).where(eq(clients.id, merged.clientId));
    const client = clientRows[0];
    if (!client) {
      throw new FinanceMutationError("Selected client was not found.", 404);
    }

    const serviceId = typeof merged.serviceId === "string" && merged.serviceId.trim()
      ? merged.serviceId.trim()
      : undefined;

    if (serviceId) {
      const serviceRows = await executor.select().from(clientServices).where(eq(clientServices.id, serviceId));
      const service = serviceRows[0];
      if (!service) {
        throw new FinanceMutationError("Selected service was not found.", 404);
      }
      if (service.clientId !== merged.clientId) {
        throw new FinanceMutationError("Selected service does not belong to the selected client.", 409);
      }
    }

    const items = this.normalizeInvoiceItems(merged.items);
    if (items.length === 0) {
      throw new FinanceMutationError("Invoice must contain at least one valid item.", 400);
    }

    const amount = this.calculateInvoiceAmount(items);
    if (amount <= 0) {
      throw new FinanceMutationError("Invoice total must be greater than zero.", 400);
    }

    if (!merged.issueDate || !merged.dueDate) {
      throw new FinanceMutationError("Issue date and due date are required.", 400);
    }

    if (new Date(merged.dueDate).getTime() < new Date(merged.issueDate).getTime()) {
      throw new FinanceMutationError("Due date cannot be earlier than issue date.", 400);
    }

    return {
      invoiceNumber,
      clientId: merged.clientId,
      serviceId,
      clientName: client.name,
      amount,
      currency: merged.currency || existingInvoice?.currency || "USD",
      status: merged.status || existingInvoice?.status || "draft",
      issueDate: merged.issueDate,
      dueDate: merged.dueDate,
      paidDate: merged.paidDate || undefined,
      paymentMethod: merged.paymentMethod || undefined,
      items,
      notes: typeof merged.notes === "string" && merged.notes.trim() ? merged.notes.trim() : undefined,
    };
  }

  private async syncInvoicePayment(executor: FinanceExecutor, invoice: Invoice): Promise<void> {
    const existingPayment = await this.findInvoicePaymentByInvoiceId(executor, invoice.id);

    if (invoice.status !== "paid") {
      if (existingPayment) {
        await executor.delete(transactions).where(
          and(eq(transactions.relatedType, "client_payment"), eq(transactions.relatedId, existingPayment.id))
        );
        await executor.delete(clientPayments).where(eq(clientPayments.id, existingPayment.id));
      }
      return;
    }

    const paymentDate = invoice.paidDate || new Date().toISOString().split("T")[0];
    const paymentDateObj = new Date(paymentDate);
    const paymentPayload: InsertClientPayment = {
      clientId: invoice.clientId,
      serviceId: invoice.serviceId || null,
      amount: invoice.amount,
      currency: invoice.currency,
      paymentDate,
      month: paymentDateObj.getMonth() + 1,
      year: paymentDateObj.getFullYear(),
      paymentMethod: invoice.paymentMethod || "bank_transfer",
      notes: this.getInvoicePaymentDescription(invoice),
    };

    if (existingPayment) {
      await executor.update(clientPayments).set(paymentPayload).where(eq(clientPayments.id, existingPayment.id));
      const updatedRows = await executor.select().from(clientPayments).where(eq(clientPayments.id, existingPayment.id));
      const updatedPayment = updatedRows[0];
      if (updatedPayment) {
        await this.upsertClientPaymentTransaction(executor, updatedPayment);
      }
      return;
    }

    const paymentId = randomUUID();
    await executor.insert(clientPayments).values({ ...paymentPayload, id: paymentId });
    const createdRows = await executor.select().from(clientPayments).where(eq(clientPayments.id, paymentId));
    const createdPayment = createdRows[0];
    if (createdPayment) {
      await this.upsertClientPaymentTransaction(executor, createdPayment);
    }
  }

  private isSystemManagedFinanceTransaction(relatedType?: string | null): boolean {
    return this.isMirroredFinanceTransaction(relatedType) || relatedType === "client_service";
  }

  private assertAllowedManualTransaction(transaction: Partial<InsertTransaction>): void {
    if (transaction.relatedType && this.isSystemManagedFinanceTransaction(transaction.relatedType)) {
      throw new FinanceMutationError("This transaction is system-managed and must be changed from its source record.", 409);
    }
  }

  private getManagedTransactionLockReason(relatedType?: string | null): string | null {
    if (relatedType === "client_payment") {
      return "This entry is generated from a client payment. Edit the payment instead.";
    }
    if (relatedType === "payroll_payment") {
      return "This entry is generated from a payroll payment. Edit the payroll payment instead.";
    }
    if (relatedType === "client_service") {
      return "This entry is generated when a service is completed and cannot be edited manually.";
    }
    return null;
  }

  private getClientPaymentTransactionDescription(payment: ClientPayment): string {
    return `Client payment - ${payment.month}/${payment.year}`;
  }

  private getPayrollTransactionDescription(payment: PayrollPayment): string {
    return `Salary payment - ${payment.period}`;
  }

  private async getTransactionOrThrow(executor: FinanceExecutor, id: string): Promise<Transaction> {
    const result = await executor.select().from(transactions).where(eq(transactions.id, id));
    const existing = result[0];
    if (!existing) {
      throw new FinanceMutationError("Transaction not found", 404);
    }
    return existing;
  }

  private async assertEditableTransaction(executor: FinanceExecutor, id: string): Promise<Transaction> {
    const existing = await this.getTransactionOrThrow(executor, id);
    if (this.isSystemManagedFinanceTransaction(existing.relatedType)) {
      throw new FinanceMutationError(this.getManagedTransactionLockReason(existing.relatedType) || "This transaction is system-managed.", 409);
    }
    return existing;
  }

  private async upsertClientPaymentTransaction(executor: FinanceExecutor, payment: ClientPayment): Promise<void> {
    const payload = {
      description: this.getClientPaymentTransactionDescription(payment),
      amount: payment.amount,
      currency: payment.currency,
      type: "income",
      category: "client_payment",
      date: payment.paymentDate,
      clientId: payment.clientId,
      serviceId: payment.serviceId,
      relatedId: payment.id,
      relatedType: "client_payment",
      status: "completed",
      notes: payment.notes || null,
    } satisfies InsertTransaction;

    const existing = await executor
      .select()
      .from(transactions)
      .where(and(eq(transactions.relatedType, "client_payment"), eq(transactions.relatedId, payment.id)));

    if (existing.length > 0) {
      await executor
        .update(transactions)
        .set(payload)
        .where(and(eq(transactions.relatedType, "client_payment"), eq(transactions.relatedId, payment.id)));
      return;
    }

    await executor.insert(transactions).values({ ...payload, id: randomUUID() });
  }

  private async upsertPayrollPaymentTransaction(executor: FinanceExecutor, payment: PayrollPayment): Promise<void> {
    const payload = {
      type: "expense",
      category: "salaries",
      amount: payment.amount,
      currency: payment.currency,
      description: this.getPayrollTransactionDescription(payment),
      date: payment.paymentDate,
      relatedId: payment.id,
      relatedType: "payroll_payment",
      status: payment.status || "paid",
      notes: payment.notes || null,
      clientId: null,
      serviceId: null,
    } satisfies InsertTransaction;

    const existing = await executor
      .select()
      .from(transactions)
      .where(and(eq(transactions.relatedType, "payroll_payment"), eq(transactions.relatedId, payment.id)));

    if (existing.length > 0) {
      await executor
        .update(transactions)
        .set(payload)
        .where(and(eq(transactions.relatedType, "payroll_payment"), eq(transactions.relatedId, payment.id)));
      return;
    }

    await executor.insert(transactions).values({ ...payload, id: randomUUID() });
  }

  private roundFinanceAmount(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private isCashIncomeEntry(entry: Pick<FinanceLedgerEntry, "type" | "source">): boolean {
    return entry.type === "income" && entry.source !== "service_completion";
  }

  private getFinanceCategoryLabels(category: string): { label: string; labelAr: string } {
    switch (category) {
      case "salaries":
        return { label: "Salaries", labelAr: "الرواتب" };
      case "ads":
        return { label: "Advertising", labelAr: "الإعلانات" };
      case "tools":
        return { label: "Tools & Software", labelAr: "الأدوات والبرمجيات" };
      case "subscriptions":
        return { label: "Subscriptions", labelAr: "الاشتراكات" };
      case "refunds":
        return { label: "Refunds", labelAr: "المبالغ المستردة" };
      case "rent":
        return { label: "Rent", labelAr: "الإيجار" };
      case "utilities":
        return { label: "Utilities", labelAr: "المرافق" };
      case "client_payment":
        return { label: "Client Payments", labelAr: "دفعات العملاء" };
      case "services":
        return { label: "Services", labelAr: "الخدمات" };
      default:
        return { label: "Other", labelAr: "أخرى" };
    }
  }

  private parseFinanceDate(dateValue: string): Date {
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private isDateInFinancePeriod(dateValue?: string | null, month?: number, year?: number): boolean {
    if (!dateValue) return false;
    if (!month && !year) return true;
    const entryDate = this.parseFinanceDate(dateValue);
    if (year && entryDate.getFullYear() !== year) {
      return false;
    }
    if (month && (entryDate.getMonth() + 1) !== month) {
      return false;
    }
    return true;
  }

  private isServiceInFinancePeriod(service: ClientService, month?: number, year?: number): boolean {
    if (!month && !year) return true;
    const completedDate = service.completedAt
      ? new Date(service.completedAt).toISOString().split("T")[0]
      : null;
    return [service.startDate, service.endDate, completedDate].some((dateValue) =>
      this.isDateInFinancePeriod(dateValue, month, year)
    );
  }

  private isServiceActiveForRecurringCharge(service: ClientService, month?: number, year?: number): boolean {
    if (!month || !year) {
      return service.status !== "completed";
    }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const serviceStart = this.parseFinanceDate(service.startDate);
    const serviceEnd = service.completedAt
      ? new Date(service.completedAt)
      : service.endDate
        ? this.parseFinanceDate(service.endDate)
        : null;

    return serviceStart <= periodEnd && (!serviceEnd || serviceEnd >= periodStart);
  }

  private async buildFinanceLedger(params: FinanceLedgerParams): Promise<FinanceLedgerEntry[]> {
    const { month, year, displayCurrency } = params;
    const [allTransactions, allClientPayments, allPayrollPayments] = await Promise.all([
      this.getTransactions({ month, year }),
      this.getClientPayments({ month, year }),
      this.getPayrollPayments({ month, year }),
    ]);

    const transactionEntries = await Promise.all(
      allTransactions
        .filter((transaction) => !this.isMirroredFinanceTransaction(transaction.relatedType))
        .map(async (transaction) => {
          const isServiceCompletion = transaction.relatedType === "client_service";
          return {
            id: `transaction:${transaction.id}`,
            recordId: transaction.id,
            source: isServiceCompletion ? "service_completion" : "transaction",
            type: transaction.type === "expense" ? "expense" : "income",
            category: transaction.category,
            description: transaction.description,
            amount: transaction.amount,
            currency: transaction.currency,
            convertedAmount: this.roundFinanceAmount(await convertCurrency(transaction.amount, transaction.currency, displayCurrency)),
            date: transaction.date,
            relatedId: transaction.relatedId || null,
            relatedType: transaction.relatedType || null,
            status: transaction.status || "completed",
            notes: transaction.notes || null,
            clientId: transaction.clientId || null,
            serviceId: transaction.serviceId || null,
            employeeId: transaction.relatedType === "salary" ? transaction.relatedId || null : null,
            isSystemManaged: this.isSystemManagedFinanceTransaction(transaction.relatedType),
            canEdit: !isServiceCompletion,
            canDelete: !isServiceCompletion,
            lockedReason: isServiceCompletion ? this.getManagedTransactionLockReason(transaction.relatedType) : null,
            displayCurrency,
          } satisfies FinanceLedgerEntry;
        })
    );

    const clientPaymentEntries = await Promise.all(
      allClientPayments.map(async (payment) => {
        const lockReason = this.getClientPaymentLockReason(payment);
        return {
          id: `client_payment:${payment.id}`,
          recordId: payment.id,
          source: "client_payment",
          type: "income",
          category: "client_payment",
          description: this.getClientPaymentTransactionDescription(payment),
          amount: payment.amount,
          currency: payment.currency,
          convertedAmount: this.roundFinanceAmount(await convertCurrency(payment.amount, payment.currency, displayCurrency)),
          date: payment.paymentDate,
          relatedId: payment.id,
          relatedType: "client_payment",
          status: "completed",
          notes: payment.notes || null,
          clientId: payment.clientId,
          serviceId: payment.serviceId || null,
          employeeId: null,
          isSystemManaged: true,
          canEdit: !lockReason,
          canDelete: !lockReason,
          lockedReason: lockReason,
          displayCurrency,
        } satisfies FinanceLedgerEntry;
      })
    );

    const payrollEntries = await Promise.all(
      allPayrollPayments.map(async (payment) => ({
        id: `payroll_payment:${payment.id}`,
        recordId: payment.id,
        source: "payroll_payment",
        type: "expense",
        category: "salaries",
        description: this.getPayrollTransactionDescription(payment),
        amount: payment.amount,
        currency: payment.currency,
        convertedAmount: this.roundFinanceAmount(await convertCurrency(payment.amount, payment.currency, displayCurrency)),
        date: payment.paymentDate,
        relatedId: payment.id,
        relatedType: "payroll_payment",
        status: payment.status || "paid",
        notes: payment.notes || null,
        clientId: null,
        serviceId: null,
        employeeId: payment.employeeId,
        isSystemManaged: true,
        canEdit: true,
        canDelete: true,
        lockedReason: null,
        displayCurrency,
      } satisfies FinanceLedgerEntry))
    );

    return [...transactionEntries, ...clientPaymentEntries, ...payrollEntries].sort((a, b) => {
      if (a.date === b.date) {
        return b.id.localeCompare(a.id);
      }
      return b.date.localeCompare(a.date);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    await db.insert(users).values({ ...insertUser, id });
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getGoals(): Promise<Goal[]> {
    return await db.select().from(goals);
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const result = await db.select().from(goals).where(eq(goals.id, id));
    return result[0];
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const id = randomUUID();
    await db.insert(goals).values({ ...insertGoal, id });
    const result = await db.select().from(goals).where(eq(goals.id, id));
    return result[0];
  }

  async updateGoal(id: string, updates: Partial<InsertGoal>): Promise<Goal | undefined> {
    await db
      .update(goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(goals.id, id));
    const result = await db.select().from(goals).where(eq(goals.id, id));
    return result[0];
  }

  async deleteGoal(id: string): Promise<boolean> {
    await db.delete(goals).where(eq(goals.id, id));
    return true;
  }

  async getTransactions(filters: TransactionFilters): Promise<Transaction[]> {
    try {
      let conditions = [];

      if (filters.type) {
        conditions.push(eq(transactions.type, filters.type));
      }

      if (filters.month && filters.year) {
        const monthStr = filters.month.toString().padStart(2, "0");
        const yearStr = filters.year.toString();
        // date is stored as "YYYY-MM-DD"
        conditions.push(sql`${transactions.date} LIKE ${yearStr + "-" + monthStr + "%"}`);
      } else if (filters.year) {
        conditions.push(sql`${transactions.date} LIKE ${filters.year.toString() + "%"}`);
      }

      if (filters.clientId) {
        // Filter by direct client association on the transaction
        conditions.push(eq(transactions.clientId, filters.clientId));
      }

      if (filters.employeeId) {
        // Transactions linked to employee payrolls are stored with:
        // relatedType = "payroll_payment" and relatedId = payroll_payments.id
        // Resolve payroll payment IDs for the employee and filter by those
        const payrollRows = await db
          .select({ id: payrollPayments.id })
          .from(payrollPayments)
          .where(eq(payrollPayments.employeeId, filters.employeeId));
        const payrollIds = payrollRows.map(r => r.id);
        if (payrollIds.length === 0) {
          return [];
        }
        conditions.push(
          and(
            eq(transactions.relatedType, "payroll_payment"),
            inArray(transactions.relatedId, payrollIds)
          )
        );
      }

      const query = db.select().from(transactions).orderBy(desc(transactions.createdAt));
      
      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    this.assertAllowedManualTransaction(transaction);
    const id = randomUUID();
    await db.insert(transactions).values({ ...transaction, id });
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    this.assertAllowedManualTransaction(transaction);
    return await db.transaction(async (tx) => {
      await this.assertEditableTransaction(tx, id);
      await tx.update(transactions).set(transaction).where(eq(transactions.id, id));
      const result = await tx.select().from(transactions).where(eq(transactions.id, id));
      return result[0];
    });
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await this.assertEditableTransaction(tx, id);
      await tx.delete(transactions).where(eq(transactions.id, id));
      return true;
    });
  }

  async getClientPayments(filters: PaymentFilters): Promise<ClientPayment[]> {
    try {
      let conditions = [];

      if (filters.clientId) {
        conditions.push(eq(clientPayments.clientId, filters.clientId));
      }
      if (filters.month) {
        conditions.push(eq(clientPayments.month, filters.month));
      }
      if (filters.year) {
        conditions.push(eq(clientPayments.year, filters.year));
      }

      const query = db.select().from(clientPayments).orderBy(desc(clientPayments.createdAt));

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    } catch (error) {
      console.error("Error fetching client payments:", error);
      return [];
    }
  }

  async createClientPayment(payment: InsertClientPayment): Promise<ClientPayment> {
    return await db.transaction(async (tx) => {
      this.assertAllowedManualClientPayment(payment);
      const paymentId = randomUUID();
      await tx.insert(clientPayments).values({ ...payment, id: paymentId });
      const paymentResult = await tx.select().from(clientPayments).where(eq(clientPayments.id, paymentId));
      const createdPayment = paymentResult[0];
      await this.upsertClientPaymentTransaction(tx, createdPayment);
      return createdPayment;
    });
  }

  async updateClientPayment(id: string, payment: Partial<InsertClientPayment>): Promise<ClientPayment | undefined> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(clientPayments).where(eq(clientPayments.id, id));
      if (existing.length === 0) {
        return undefined;
      }
      const existingPayment = existing[0];
      const lockReason = this.getClientPaymentLockReason(existingPayment);
      if (lockReason) {
        throw new FinanceMutationError(lockReason, 409);
      }
      this.assertAllowedManualClientPayment({ notes: payment.notes ?? null });
      await tx.update(clientPayments).set(payment).where(eq(clientPayments.id, id));
      const updated = await tx.select().from(clientPayments).where(eq(clientPayments.id, id));
      const updatedPayment = updated[0];
      await this.upsertClientPaymentTransaction(tx, updatedPayment);
      return updatedPayment;
    });
  }

  async deleteClientPayment(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(clientPayments).where(eq(clientPayments.id, id));
      if (existing.length === 0) {
        return false;
      }
      const lockReason = this.getClientPaymentLockReason(existing[0]);
      if (lockReason) {
        throw new FinanceMutationError(lockReason, 409);
      }
      await tx.delete(transactions).where(and(eq(transactions.relatedType, "client_payment"), eq(transactions.relatedId, id)));
      await tx.delete(clientPayments).where(eq(clientPayments.id, id));
      return true;
    });
  }

  async getPayrollPayments(filters: PaymentFilters): Promise<PayrollPayment[]> {
    try {
      let conditions = [];

      if (filters.employeeId) {
        conditions.push(eq(payrollPayments.employeeId, filters.employeeId));
      }

      if (filters.month && filters.year) {
        const period = `${filters.year}-${filters.month.toString().padStart(2, '0')}`;
        conditions.push(eq(payrollPayments.period, period));
      } else if (filters.year !== undefined) {
        conditions.push(sql`${payrollPayments.period} LIKE ${filters.year.toString() + "%"}`);
      }

      const query = db.select().from(payrollPayments).orderBy(desc(payrollPayments.createdAt));

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    } catch (error) {
      console.error("Error fetching payroll payments:", error);
      return [];
    }
  }

  async createPayrollPayment(payment: InsertPayrollPayment): Promise<PayrollPayment> {
    return await db.transaction(async (tx) => {
      const paymentId = randomUUID();
      await tx.insert(payrollPayments).values({ ...payment, id: paymentId });
      const paymentResult = await tx.select().from(payrollPayments).where(eq(payrollPayments.id, paymentId));
      const createdPayment = paymentResult[0];
      await this.upsertPayrollPaymentTransaction(tx, createdPayment);
      return createdPayment;
    });
  }

  async updatePayrollPayment(id: string, payment: Partial<InsertPayrollPayment>): Promise<PayrollPayment | undefined> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(payrollPayments).where(eq(payrollPayments.id, id));
      if (existing.length === 0) {
        return undefined;
      }
      await tx.update(payrollPayments).set(payment).where(eq(payrollPayments.id, id));
      const updated = await tx.select().from(payrollPayments).where(eq(payrollPayments.id, id));
      const updatedPayment = updated[0];
      await this.upsertPayrollPaymentTransaction(tx, updatedPayment);
      return updatedPayment;
    });
  }

  async deletePayrollPayment(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await tx.delete(transactions)
        .where(and(eq(transactions.relatedType, "payroll_payment"), eq(transactions.relatedId, id)));

      await tx.delete(payrollPayments).where(eq(payrollPayments.id, id));
      return true;
    });
  }

  async getEmployeeSalaries(): Promise<EmployeeSalary[]> {
    try {
      return await db.select().from(employeeSalaries);
    } catch (error) {
      console.error("Error fetching employee salaries:", error);
      return [];
    }
  }

  async getEmployeeSalary(employeeId: string): Promise<EmployeeSalary | null> {
    try {
      const result = await db.select().from(employeeSalaries).where(eq(employeeSalaries.employeeId, employeeId));
      return result[0] || null;
    } catch (error) {
      console.error("Error fetching employee salary:", error);
      return null;
    }
  }

  async upsertEmployeeSalary(employeeId: string, data: Partial<InsertEmployeeSalary>): Promise<EmployeeSalary> {
    const existing = await this.getEmployeeSalary(employeeId);
    
    if (existing) {
      await db
        .update(employeeSalaries)
        .set(data)
        .where(eq(employeeSalaries.employeeId, employeeId))
        ;
      const result = await db.select().from(employeeSalaries).where(eq(employeeSalaries.employeeId, employeeId));
      return result[0];
    } else {
      const id = randomUUID();
      await db.insert(employeeSalaries).values({
        id,
        employeeId,
        type: data.type || "monthly",
        amount: data.amount || 0,
        currency: data.currency || "TRY",
        effectiveDate: data.effectiveDate || new Date().toISOString().split('T')[0],
      });
      const result = await db.select().from(employeeSalaries).where(eq(employeeSalaries.id, id));
      return result[0];
    }
  }

  async getFinanceLedger(params: FinanceLedgerParams): Promise<FinanceLedgerEntry[]> {
    return await this.buildFinanceLedger(params);
  }

  async getFinancePayrollReport(params: FinanceLedgerParams): Promise<FinancePayrollReportItem[]> {
    const { month, year, displayCurrency } = params;
    const [allEmployees, salaries, paymentsThisPeriod, allServices] = await Promise.all([
      this.getEmployees(),
      this.getEmployeeSalaries(),
      this.getPayrollPayments({ month, year }),
      this.getClientServices(),
    ]);

    return await Promise.all(allEmployees.map(async (employee) => {
      const salaryConfig = salaries.find((salary) => salary.employeeId === employee.id);
      const employeePayments = paymentsThisPeriod.filter((payment) => payment.employeeId === employee.id);
      const payType = employee.salaryType || "monthly";
      const salaryCurrency = employee.salaryCurrency || salaryConfig?.currency || "USD";
      const monthlyAmount = employee.salaryAmount ?? (payType === "monthly" ? (salaryConfig?.amount || 0) : 0);
      const rateAmount = employee.rate ?? (payType === "per_project" ? (salaryConfig?.amount || 0) : 0);
      const rateUnitsCount = allServices.filter((service) =>
        (Array.isArray(service.executionEmployeeIds) ? (service.executionEmployeeIds as string[]) : []).includes(employee.id)
        && this.isServiceInFinancePeriod(service, month, year)
      ).length;
      const expectedBase = payType === "monthly" ? monthlyAmount : rateAmount * rateUnitsCount;

      let paidThisPeriod = 0;
      for (const payment of employeePayments) {
        paidThisPeriod += await convertCurrency(payment.amount, payment.currency, displayCurrency);
      }

      const expectedSalary = expectedBase
        ? await convertCurrency(expectedBase, salaryCurrency, displayCurrency)
        : 0;
      const remainingRaw = expectedSalary - paidThisPeriod;

      return {
        employeeId: employee.id,
        payType,
        salaryCurrency,
        monthlyAmount,
        rateAmount,
        rateUnitsCount,
        paidThisPeriod: this.roundFinanceAmount(paidThisPeriod),
        remaining: this.roundFinanceAmount(remainingRaw > 0.01 ? remainingRaw : 0),
        expectedSalary: this.roundFinanceAmount(expectedSalary),
        payments: employeePayments,
      };
    }));
  }

  async getFinanceClientReport(params: FinanceLedgerParams): Promise<FinanceClientReportItem[]> {
    const { month, year, displayCurrency } = params;
    const [allClients, allServices, allPayments, paymentsThisPeriod, allSubPackages] = await Promise.all([
      this.getClients(),
      this.getClientServices(),
      this.getClientPayments({}),
      this.getClientPayments({ month, year }),
      this.getSubPackages(),
    ]);

    const subPackageMap = new Map(allSubPackages.map((subPackage) => [subPackage.id, subPackage]));

    return await Promise.all(
      allClients
        .filter((client) => client.status === "active" || client.status === "completed")
        .map(async (client) => {
          const clientServicesList = allServices.filter((service) => service.clientId === client.id);
          const clientPaymentsAll = allPayments.filter((payment) => payment.clientId === client.id);
          const clientPaymentsThisPeriod = paymentsThisPeriod.filter((payment) => payment.clientId === client.id);

          let paidThisPeriod = 0;
          let paidOverall = 0;
          let oneTimePaidThisPeriod = 0;
          let expectedMonthly = 0;
          let expectedOneTime = 0;
          let recurringPaidThisPeriod = 0;

          for (const payment of clientPaymentsAll) {
            paidOverall += await convertCurrency(payment.amount, payment.currency, displayCurrency);
          }

          for (const payment of clientPaymentsThisPeriod) {
            paidThisPeriod += await convertCurrency(payment.amount, payment.currency, displayCurrency);
          }

          const serviceBalances = await Promise.all(clientServicesList.map(async (service) => {
            if (!service.price || !service.currency) {
              return null;
            }

            const subPackage = service.subPackageId ? subPackageMap.get(service.subPackageId) : null;
            const billingType = subPackage?.billingType || "one_time";
            const servicePaymentsAll = clientPaymentsAll.filter((payment) => payment.serviceId === service.id);
            const servicePaymentsThisPeriod = clientPaymentsThisPeriod.filter((payment) => payment.serviceId === service.id);

            let servicePaidOverall = 0;
            let servicePaidThisPeriod = 0;
            for (const payment of servicePaymentsAll) {
              servicePaidOverall += await convertCurrency(payment.amount, payment.currency, displayCurrency);
            }
            for (const payment of servicePaymentsThisPeriod) {
              servicePaidThisPeriod += await convertCurrency(payment.amount, payment.currency, displayCurrency);
            }

            const convertedAmount = await convertCurrency(service.price, service.currency, displayCurrency);
            const remainingRaw = convertedAmount - servicePaidOverall;
            const remaining = remainingRaw > 0.01 ? remainingRaw : 0;
            const isRecurring = billingType !== "one_time";
            const isCompleted = service.status === "completed";

            if (isRecurring && this.isServiceActiveForRecurringCharge(service, month, year)) {
              expectedMonthly += convertedAmount;
              recurringPaidThisPeriod += servicePaidThisPeriod;
            }

            if (!isRecurring && isCompleted && remaining > 0) {
              expectedOneTime += remaining;
            }

            if (!isRecurring) {
              oneTimePaidThisPeriod += servicePaidThisPeriod;
            }

            return {
              serviceId: service.id,
              serviceName: service.serviceName,
              serviceNameEn: service.serviceNameEn || null,
              status: service.status,
              billingType,
              amount: service.price,
              currency: service.currency,
              convertedAmount: this.roundFinanceAmount(convertedAmount),
              paidThisPeriod: this.roundFinanceAmount(servicePaidThisPeriod),
              paidOverall: this.roundFinanceAmount(servicePaidOverall),
              remaining: this.roundFinanceAmount(remaining),
              isCompleted,
              isSettled: remaining <= 0.01,
            };
          }));

          let unallocatedPaidThisPeriod = 0;
          let unallocatedPaidOverall = 0;
          for (const payment of clientPaymentsAll.filter((entry) => !entry.serviceId)) {
            unallocatedPaidOverall += await convertCurrency(payment.amount, payment.currency, displayCurrency);
          }
          for (const payment of clientPaymentsThisPeriod.filter((entry) => !entry.serviceId)) {
            unallocatedPaidThisPeriod += await convertCurrency(payment.amount, payment.currency, displayCurrency);
          }

          const recurringDueRaw = expectedMonthly - recurringPaidThisPeriod - unallocatedPaidThisPeriod;
          const recurringDue = recurringDueRaw > 0.01 ? recurringDueRaw : 0;
          const oneTimeOutstanding = serviceBalances
            .filter((service): service is NonNullable<typeof service> => Boolean(service))
            .filter((service) => service.billingType === "one_time")
            .reduce((sum, service) => sum + service.remaining, 0);
          const totalOutstanding = recurringDue + oneTimeOutstanding;
          const due = totalOutstanding > 0.01 ? totalOutstanding : 0;

          return {
            clientId: client.id,
            expectedMonthly: this.roundFinanceAmount(expectedMonthly),
            expectedOneTime: this.roundFinanceAmount(expectedOneTime),
            paidThisPeriod: this.roundFinanceAmount(paidThisPeriod),
            paidOverall: this.roundFinanceAmount(paidOverall),
            oneTimePaidThisPeriod: this.roundFinanceAmount(oneTimePaidThisPeriod),
            unallocatedPaidThisPeriod: this.roundFinanceAmount(unallocatedPaidThisPeriod),
            unallocatedPaidOverall: this.roundFinanceAmount(unallocatedPaidOverall),
            due: this.roundFinanceAmount(due),
            totalOutstanding: this.roundFinanceAmount(due),
            isOverdue: due > 0,
            payments: clientPaymentsAll,
            services: serviceBalances
              .filter((service): service is NonNullable<typeof service> => Boolean(service))
              .sort((a, b) => b.remaining - a.remaining),
          };
        })
    );
  }

  async getFinanceSummary(params: FinanceSummaryParams): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    overdueAmount: number;
    payrollRemaining: number;
    expectedRevenue: number;
    servicesBreakdown: { packageName: string; packageNameAr: string; revenue: number }[];
    expenseBreakdown: FinanceBreakdownItem[];
    displayCurrency: string;
  }> {
    const { month, year, displayCurrency } = params;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();
    const calcMonth = month || currentMonth;
    const calcYear = year || currentYearNum;
    const [ledger, payrollReport, clientReport, allServices, allSubPackages, allMainPackages] = await Promise.all([
      this.buildFinanceLedger({ month, year, displayCurrency }),
      this.getFinancePayrollReport({ month: calcMonth, year: calcYear, displayCurrency }),
      this.getFinanceClientReport({ month: calcMonth, year: calcYear, displayCurrency }),
      this.getClientServices(),
      this.getSubPackages(),
      this.getMainPackages(),
    ]);

    const totalIncome = ledger
      .filter((entry) => this.isCashIncomeEntry(entry))
      .reduce((sum, entry) => sum + entry.convertedAmount, 0);
    const totalExpenses = ledger
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + entry.convertedAmount, 0);

    const payrollRemaining = payrollReport.reduce((sum, item) => sum + item.remaining, 0);

    // Calculate Overdue Amount & Expected Revenue
    const subPackageMap = new Map(allSubPackages.map(sp => [sp.id, sp]));
    const mainPackageMap = new Map(allMainPackages.map(mp => [mp.id, mp]));
    const serviceMap = new Map(allServices.map((service) => [service.id, service]));

    const overdueAmount = clientReport.reduce((sum, item) => sum + item.due, 0);
    const expectedRevenue = clientReport.reduce((sum, item) => sum + item.expectedOneTime, 0);
    const revenueByPackage: Record<string, number> = {};

    for (const entry of ledger) {
      if (this.isCashIncomeEntry(entry)) {
        const packageId = entry.serviceId ? (serviceMap.get(entry.serviceId)?.mainPackageId || "main-pkg-6") : "main-pkg-6";
        revenueByPackage[packageId] = (revenueByPackage[packageId] || 0) + entry.convertedAmount;
      }
    }

    const servicesBreakdown = Object.entries(revenueByPackage)
      .map(([pkgId, revenue]) => {
        const pkg = mainPackageMap.get(pkgId);
        return {
          packageName: pkg?.nameEn || pkg?.name || "Other",
          packageNameAr: pkg?.name || "أخرى",
          revenue: this.roundFinanceAmount(revenue),
        };
      })
      .filter((entry) => entry.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const expenseTotals: Record<string, number> = {};
    for (const entry of ledger) {
      if (entry.type !== "expense") continue;
      expenseTotals[entry.category] = (expenseTotals[entry.category] || 0) + entry.convertedAmount;
    }

    const expenseBreakdown = Object.entries(expenseTotals)
      .map(([key, amount]) => {
        const labels = this.getFinanceCategoryLabels(key);
        return {
          key,
          label: labels.label,
          labelAr: labels.labelAr,
          amount: this.roundFinanceAmount(amount),
        };
      })
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome: this.roundFinanceAmount(totalIncome),
      totalExpenses: this.roundFinanceAmount(totalExpenses),
      netProfit: this.roundFinanceAmount(totalIncome - totalExpenses),
      overdueAmount: this.roundFinanceAmount(overdueAmount),
      payrollRemaining: this.roundFinanceAmount(payrollRemaining),
      expectedRevenue: this.roundFinanceAmount(expectedRevenue),
      servicesBreakdown,
      expenseBreakdown,
      displayCurrency,
    };
  }

  async getFinanceTrend(params: FinanceTrendParams): Promise<FinanceTrendPoint[]> {
    const { month, year, displayCurrency, groupBy = "monthly" } = params;
    const ledger = await this.buildFinanceLedger({ displayCurrency });
    const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthNamesAr = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];
    const makePoint = (key: string, label: string, labelAr: string, entries: FinanceLedgerEntry[]) => {
      const income = entries.filter((entry) => this.isCashIncomeEntry(entry)).reduce((sum, entry) => sum + entry.convertedAmount, 0);
      const expenses = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.convertedAmount, 0);
      return {
        key,
        label,
        labelAr,
        income: this.roundFinanceAmount(income),
        expenses: this.roundFinanceAmount(expenses),
        netProfit: this.roundFinanceAmount(income - expenses),
      };
    };

    if (groupBy === "weekly") {
      if (month && year) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const points: FinanceTrendPoint[] = [];
        for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
          const startDay = weekIndex * 7 + 1;
          const endDay = weekIndex === 3 ? daysInMonth : Math.min((weekIndex + 1) * 7, daysInMonth);
          const entries = ledger.filter((entry) => {
            const entryDate = this.parseFinanceDate(entry.date);
            return entryDate.getFullYear() === year
              && entryDate.getMonth() + 1 === month
              && entryDate.getDate() >= startDay
              && entryDate.getDate() <= endDay;
          });
          points.push(makePoint(`w${weekIndex + 1}`, `W${weekIndex + 1}`, `أسبوع ${weekIndex + 1}`, entries));
        }
        return points;
      }

      const nowDate = new Date();
      const points: FinanceTrendPoint[] = [];
      for (let offset = 3; offset >= 0; offset--) {
        const targetDate = new Date(nowDate);
        targetDate.setDate(targetDate.getDate() - (offset * 7));
        const weekStart = this.getStartOfWeek(targetDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const entries = ledger.filter((entry) => {
          const entryDate = this.parseFinanceDate(entry.date);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });
        const weekLabel = 4 - offset;
        points.push(makePoint(`week-${weekLabel}`, `Week ${weekLabel}`, `الأسبوع ${weekLabel}`, entries));
      }
      return points;
    }

    if (month && year) {
      const entries = ledger.filter((entry) => {
        const entryDate = this.parseFinanceDate(entry.date);
        return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
      });
      return [makePoint(`${year}-${String(month).padStart(2, "0")}`, `${monthNamesEn[month - 1]} ${year}`, `${monthNamesAr[month - 1]} ${year}`, entries)];
    }

    const points: FinanceTrendPoint[] = [];
    const nowDate = new Date();
    for (let offset = 5; offset >= 0; offset--) {
      const targetDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - offset, 1);
      const entries = ledger.filter((entry) => {
        const entryDate = this.parseFinanceDate(entry.date);
        return entryDate.getFullYear() === targetDate.getFullYear() && entryDate.getMonth() === targetDate.getMonth();
      });
      const monthIndex = targetDate.getMonth();
      points.push(makePoint(
        `${targetDate.getFullYear()}-${String(monthIndex + 1).padStart(2, "0")}`,
        monthNamesEn[monthIndex],
        monthNamesAr[monthIndex],
        entries,
      ));
    }
    return points;
  }

  // ========== CALENDAR EVENTS METHODS ==========

  async getCalendarEvents(filters: CalendarEventFilters): Promise<CalendarEvent[]> {
    try {
      let conditions = [];

      if (filters.startDate) {
        conditions.push(sql`${calendarEvents.date} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${calendarEvents.date} <= ${filters.endDate}`);
      }
      if (filters.eventType) {
        conditions.push(eq(calendarEvents.eventType, filters.eventType));
      }
      if (filters.status) {
        conditions.push(eq(calendarEvents.status, filters.status));
      }
      if (filters.clientId) {
        conditions.push(eq(calendarEvents.clientId, filters.clientId));
      }
      if (filters.employeeId) {
        conditions.push(eq(calendarEvents.employeeId, filters.employeeId));
      }

      const query = db.select().from(calendarEvents).orderBy(desc(calendarEvents.date));

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return [];
    }
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    try {
      const result = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      return undefined;
    }
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = randomUUID();
    await db.insert(calendarEvents).values({ ...event, id });
    const result = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    const createdEvent = result[0];

    // Create notification if it's a task and has an assignee
    if (createdEvent.eventType === "task" && createdEvent.employeeId) {
      try {
        await this.createNotification({
          userId: createdEvent.employeeId,
          type: "task_assigned",
          titleAr: "مهمة جديدة",
          titleEn: "New Task Assigned",
          messageAr: `تم تكليفك بمهمة جديدة: ${createdEvent.titleAr}`,
          messageEn: `You have been assigned a new task: ${createdEvent.titleEn || createdEvent.titleAr}`,
          read: false,
          relatedId: createdEvent.id,
          relatedType: "calendar_event",
        });
      } catch (error) {
        console.error("Error creating notification for task:", error);
      }
    }

    return createdEvent;
  }

  async updateCalendarEvent(id: string, updates: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    try {
      await db
        .update(calendarEvents)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(calendarEvents.id, id));
      const result = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
      return result[0];
    } catch (error) {
      console.error("Error updating calendar event:", error);
      return undefined;
    }
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    return true;
  }

  // ========== NOTIFICATIONS METHODS ==========

  async getNotifications(filters: NotificationFilters): Promise<Notification[]> {
    try {
      const today = new Date();
      let conditions = [
        or(isNull(notifications.snoozedUntil), sql`${notifications.snoozedUntil} <= ${today}`)
      ];

      if (filters.userId) {
        conditions.push(or(eq(notifications.userId, filters.userId), isNull(notifications.userId)));
      }

      const query = db.select().from(notifications).orderBy(desc(notifications.createdAt));

      return await query.where(and(...conditions));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    await db.insert(notifications).values({ ...notification, id });
    const result = await db.select().from(notifications).where(eq(notifications.id, id));
    return result[0];
  }

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error("Error marking notification read:", error);
      return false;
    }
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(
          eq(notifications.read, false),
          or(eq(notifications.userId, userId), isNull(notifications.userId))
        ));
      return true;
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      return false;
    }
  }

  async snoozeNotification(id: string, snoozedUntil: string): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ snoozedUntil: new Date(snoozedUntil) })
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error("Error snoozing notification:", error);
      return false;
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    await db.delete(notifications).where(eq(notifications.id, id));
    return true;
  }

  // ========== WORK SESSIONS METHODS ==========

  async getWorkSessions(filters: WorkSessionFilters): Promise<WorkSession[]> {
    try {
      let conditions = [];

      if (filters.employeeId) {
        conditions.push(eq(workSessions.employeeId, filters.employeeId));
      }
      if (filters.date) {
        conditions.push(eq(workSessions.date, filters.date));
      }
      if (filters.startDate) {
        conditions.push(sql`${workSessions.date} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${workSessions.date} <= ${filters.endDate}`);
      }
      if (filters.status) {
        conditions.push(eq(workSessions.status, filters.status));
      }

      const query = db.select().from(workSessions).orderBy(desc(workSessions.date));

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    } catch (error) {
      console.error("Error fetching work sessions:", error);
      return [];
    }
  }

  async getWorkSession(id: string): Promise<WorkSession | undefined> {
    const result = await db.select().from(workSessions).where(eq(workSessions.id, id));
    return result[0];
  }

  async getWorkSessionByEmployeeAndDate(employeeId: string, date: string): Promise<WorkSession | undefined> {
    const result = await db.select().from(workSessions).where(
      and(eq(workSessions.employeeId, employeeId), eq(workSessions.date, date))
    );
    return result[0];
  }

  async createWorkSession(session: InsertWorkSession): Promise<WorkSession> {
    const id = randomUUID();
    await db.insert(workSessions).values({ ...session, id });
    const result = await db.select().from(workSessions).where(eq(workSessions.id, id));
    return result[0];
  }

  async updateWorkSession(id: string, session: Partial<InsertWorkSession>): Promise<WorkSession | undefined> {
    try {
      await db
        .update(workSessions)
        .set({ ...session, updatedAt: new Date() })
        .where(eq(workSessions.id, id));
      const result = await db.select().from(workSessions).where(eq(workSessions.id, id));
      return result[0];
    } catch (error) {
      console.error("Error updating work session:", error);
      return undefined;
    }
  }

  // ========== CLIENTS METHODS ==========

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = randomUUID();
    await db.insert(clients).values({ ...client, id });
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      await db
        .update(clients)
        .set(client)
        .where(eq(clients.id, id));
      const result = await db.select().from(clients).where(eq(clients.id, id));
      return result[0];
    } catch (error) {
      console.error("Error updating client:", error);
      return undefined;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // 1. Get service IDs to clean up related data
      const services = await tx.select({ id: clientServices.id }).from(clientServices).where(eq(clientServices.clientId, id));
      const serviceIds = services.map(s => s.id);

      if (serviceIds.length > 0) {
        // Delete service-related data
        await tx.delete(serviceDeliverables).where(inArray(serviceDeliverables.serviceId, serviceIds));
        await tx.delete(workActivityLogs).where(inArray(workActivityLogs.serviceId, serviceIds));
        await tx.delete(serviceReports).where(inArray(serviceReports.serviceId, serviceIds));
        await tx.delete(clientPayments).where(inArray(clientPayments.serviceId, serviceIds));
        await tx.delete(calendarEvents).where(inArray(calendarEvents.serviceId, serviceIds));
        await tx.delete(transactions).where(inArray(transactions.serviceId, serviceIds));
        
        // Delete services
        await tx.delete(clientServices).where(eq(clientServices.clientId, id));
      }
      
      await tx.delete(clientPayments).where(eq(clientPayments.clientId, id));
      await tx.delete(calendarEvents).where(eq(calendarEvents.clientId, id));
      await tx.delete(transactions).where(eq(transactions.clientId, id));
      // Delete related invoices
      await tx.delete(invoices).where(eq(invoices.clientId, id));
      await tx.delete(clientUsers).where(eq(clientUsers.clientId, id));
      
      // Delete the client
      await tx.delete(clients).where(eq(clients.id, id));
      return true;
    });
  }

  /**
   * Reassign or unlink all references from one employee to another (or null).
   * If toEmployeeId is null, the references will be removed/unassigned.
   */
  async reassignEmployeeReferences(fromEmployeeId: string, toEmployeeId: string | null): Promise<void> {
    // 1) Clients: salesOwnerId, assignedManagerId, salesOwners (JSON), assignedStaff (JSON)
    // Direct fields
    if (toEmployeeId) {
      await db.update(clients).set({ salesOwnerId: toEmployeeId }).where(eq(clients.salesOwnerId, fromEmployeeId));
      await db.update(clients).set({ assignedManagerId: toEmployeeId }).where(eq(clients.assignedManagerId, fromEmployeeId));
    } else {
      await db.update(clients).set({ salesOwnerId: null }).where(eq(clients.salesOwnerId, fromEmployeeId));
      await db.update(clients).set({ assignedManagerId: null }).where(eq(clients.assignedManagerId, fromEmployeeId));
    }

    // JSON arrays for clients
    const allClients = await db.select().from(clients);
    for (const c of allClients) {
      let salesOwnersArr = this.toStringArray(c.salesOwners);
      let assignedStaffArr = this.toStringArray(c.assignedStaff);

      const hasInSalesOwners = salesOwnersArr.includes(fromEmployeeId);
      const hasInAssignedStaff = assignedStaffArr.includes(fromEmployeeId);

      if (hasInSalesOwners || hasInAssignedStaff) {
        if (toEmployeeId) {
          if (hasInSalesOwners) {
            salesOwnersArr = salesOwnersArr.filter((e) => e !== fromEmployeeId);
            if (!salesOwnersArr.includes(toEmployeeId)) salesOwnersArr.push(toEmployeeId);
          }
          if (hasInAssignedStaff) {
            assignedStaffArr = assignedStaffArr.filter((e) => e !== fromEmployeeId);
            if (!assignedStaffArr.includes(toEmployeeId)) assignedStaffArr.push(toEmployeeId);
          }
        } else {
          if (hasInSalesOwners) salesOwnersArr = salesOwnersArr.filter((e) => e !== fromEmployeeId);
          if (hasInAssignedStaff) assignedStaffArr = assignedStaffArr.filter((e) => e !== fromEmployeeId);
        }
        await db.update(clients)
          .set({ salesOwners: salesOwnersArr, assignedStaff: assignedStaffArr })
          .where(eq(clients.id, c.id));
      }
    }

    // 2) Client services: salesEmployeeId, execution_employee_ids (JSON)
    if (toEmployeeId) {
      await db.update(clientServices).set({ salesEmployeeId: toEmployeeId }).where(eq(clientServices.salesEmployeeId, fromEmployeeId));
    } else {
      await db.update(clientServices).set({ salesEmployeeId: null }).where(eq(clientServices.salesEmployeeId, fromEmployeeId));
    }

    const allServices = await db.select().from(clientServices);
    for (const s of allServices) {
      let execArr = this.toStringArray(s.executionEmployeeIds);
      if (execArr.includes(fromEmployeeId)) {
        if (toEmployeeId) {
          execArr = execArr.filter((e) => e !== fromEmployeeId);
          if (!execArr.includes(toEmployeeId)) execArr.push(toEmployeeId);
        } else {
          execArr = execArr.filter((e) => e !== fromEmployeeId);
        }
        await db.update(clientServices)
          .set({ executionEmployeeIds: execArr })
          .where(eq(clientServices.id, s.id));
      }
    }

    // 3) Leads: negotiatorId
    if (toEmployeeId) {
      await db.update(leads).set({ negotiatorId: toEmployeeId }).where(eq(leads.negotiatorId, fromEmployeeId));
    } else {
      await db.update(leads).set({ negotiatorId: null }).where(eq(leads.negotiatorId, fromEmployeeId));
    }

    // 4) Calendar events: employeeId
    if (toEmployeeId) {
      await db.update(calendarEvents).set({ employeeId: toEmployeeId }).where(eq(calendarEvents.employeeId, fromEmployeeId));
    } else {
      await db.update(calendarEvents).set({ employeeId: null }).where(eq(calendarEvents.employeeId, fromEmployeeId));
    }
  }
  async archiveClient(id: string): Promise<Client | undefined> {
    try {
      await db
        .update(clients)
        .set({ status: "archived" })
        .where(eq(clients.id, id));
      const result = await db.select().from(clients).where(eq(clients.id, id));
      return result[0];
    } catch (error) {
      console.error("Error archiving client:", error);
      return undefined;
    }
  }

  async convertClientToLead(clientId: string): Promise<Lead> {
    return await db.transaction(async (tx) => {
      // 1. Get client
      const [client] = await tx.select().from(clients).where(eq(clients.id, clientId));
      if (!client) throw new Error("Client not found");

      // 2. Get services
      const services = await tx.select().from(clientServices).where(eq(clientServices.clientId, clientId));

      // 3. Format services into notes
      let servicesNote = "";
      if (services.length > 0) {
        servicesNote = "\n\n--- Service History (from Client phase) ---\n";
        servicesNote += services.map(s => 
          `- ${s.serviceName} (${s.status}): ${s.price || 0} ${s.currency || ''} [${s.startDate} - ${s.endDate || 'Ongoing'}]`
        ).join("\n");
      }

      const fullNotes = [client.notes, servicesNote].filter(Boolean).join("\n");
      
      // Store full client data for potential restoration
      const preservedData = {
        client: client,
        services: services
      };

      // 4. Create Lead
      const leadId = randomUUID();
      await tx.insert(leads).values({
        id: leadId,
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        country: client.country,
        source: client.source,
        stage: "negotiation", 
        notes: fullNotes,
        negotiatorId: client.salesOwnerId, 
        wasConfirmedClient: true, 
        convertedFromClientId: client.id,
        preservedClientData: preservedData,
      });
      const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));
      
      // 5. Delete Client (Logic from deleteClient)
      const serviceIds = services.map(s => s.id);

      if (serviceIds.length > 0) {
        await tx.delete(serviceDeliverables).where(inArray(serviceDeliverables.serviceId, serviceIds));
        await tx.delete(workActivityLogs).where(inArray(workActivityLogs.serviceId, serviceIds));
        await tx.delete(serviceReports).where(inArray(serviceReports.serviceId, serviceIds));
        await tx.delete(clientPayments).where(inArray(clientPayments.serviceId, serviceIds));
        await tx.delete(calendarEvents).where(inArray(calendarEvents.serviceId, serviceIds));
        await tx.delete(transactions).where(inArray(transactions.serviceId, serviceIds));
        await tx.delete(clientServices).where(eq(clientServices.clientId, clientId));
      }
      
      await tx.delete(clientPayments).where(eq(clientPayments.clientId, clientId));
      await tx.delete(calendarEvents).where(eq(calendarEvents.clientId, clientId));
      await tx.delete(transactions).where(eq(transactions.clientId, clientId));
      await tx.delete(invoices).where(eq(invoices.clientId, clientId));
      await tx.delete(clientUsers).where(eq(clientUsers.clientId, clientId));
      await tx.delete(clients).where(eq(clients.id, clientId));

      return lead;
    });
  }

  async createClientWithService(client: InsertClient, service: Omit<InsertClientService, "clientId">): Promise<{ client: Client, service: ClientService }> {
    return await db.transaction(async (tx) => {
      // 1. Create Client
      const clientId = randomUUID();
      await tx.insert(clients).values({ ...client, id: clientId });
      const [newClient] = await tx.select().from(clients).where(eq(clients.id, clientId));

      // 2. Prepare service data with client ID
      let mainPackageId = service.mainPackageId;
      if (!mainPackageId || mainPackageId === "unknown") {
         const [defaultPackage] = await tx.select().from(mainPackages).limit(1);
         if (defaultPackage) {
           mainPackageId = defaultPackage.id;
         }
      }

      const serviceToCreate = { 
        ...service, 
        clientId: newClient.id,
        mainPackageId: mainPackageId || "unknown" 
      };

      // 3. Create Service
      const serviceId = randomUUID();
      await tx.insert(clientServices).values({ ...serviceToCreate, id: serviceId });
      const [newService] = await tx.select().from(clientServices).where(eq(clientServices.id, serviceId));

      // 3.b Seed deliverables from sub-package definition if exists
      if (serviceToCreate.subPackageId) {
        const [sp] = await tx.select().from(subPackages).where(eq(subPackages.id, serviceToCreate.subPackageId)).limit(1);
        const spDeliverables = this.toDeliverableDefinitions(sp?.deliverables);
        for (const d of spDeliverables) {
          const labelAr = d.labelAr || d.label || "";
          const labelEn = d.labelEn || d.label || "";
          const target = this.getDeliverableTarget(d);

          await tx.insert(serviceDeliverables).values({
            id: randomUUID(),
            serviceId,
            key: d.key || (labelEn || labelAr || "item"),
            labelAr: labelAr || (labelEn || "Item"),
            labelEn: labelEn || (labelAr || "Item"),
            target,
            completed: 0,
            icon: d.icon,
            isBoolean: !!d.isBoolean
          });
        }
      }

      return { client: newClient, service: newService };
    });
  }

  // ========== CLIENT SERVICES METHODS ==========

  async getClientServices(clientId?: string): Promise<(ClientService & { deliverables: ServiceDeliverableSnapshot[] })[]> {
    try {
      let services;
      if (clientId) {
        services = await db.select().from(clientServices).where(eq(clientServices.clientId, clientId));
      } else {
        services = await db.select().from(clientServices);
      }

      if (services.length === 0) return [];

      const serviceIds = services.map(s => s.id);
      const deliverables = await db.select().from(serviceDeliverables)
        .where(inArray(serviceDeliverables.serviceId, serviceIds));

      return services.map(service => ({
        ...service,
        deliverables: deliverables.filter(d => d.serviceId === service.id).map(d => ({
          key: d.key,
          label: d.labelAr, 
          labelAr: d.labelAr,
          labelEn: d.labelEn,
          target: d.target,
          completed: d.completed,
          isBoolean: Boolean(d.isBoolean)
        }))
      }));
    } catch (error) {
      console.error("Error fetching client services:", error);
      return [];
    }
  }

  async createClientService(service: InsertClientService): Promise<ClientService> {
    try {
      // Ensure mainPackageId is valid
      let mainPackageId = service.mainPackageId;
      
      // If unknown or empty, try to find a fallback
      if (!mainPackageId || mainPackageId === "unknown") {
         const [defaultPackage] = await db.select().from(mainPackages).limit(1);
         if (defaultPackage) {
           mainPackageId = defaultPackage.id;
         }
      }

      const serviceToCreate = { ...service, mainPackageId };
      const serviceId = randomUUID();
      await db.insert(clientServices).values({ ...serviceToCreate, id: serviceId });
      const result = await db.select().from(clientServices).where(eq(clientServices.id, serviceId));
      const created = result[0];

      // Seed deliverables from sub-package if present and no explicit deliverables were provided
      const incomingDeliverables = this.toDeliverableDefinitions((service as InsertClientService & { deliverables?: unknown }).deliverables);
      if (incomingDeliverables.length === 0 && service.subPackageId) {
        const [sp] = await db.select().from(subPackages).where(eq(subPackages.id, service.subPackageId)).limit(1);
        const spDeliverables = this.toDeliverableDefinitions(sp?.deliverables);
        for (const d of spDeliverables) {
          const labelAr = d.labelAr || d.label || "";
          const labelEn = d.labelEn || d.label || "";
          const target = this.getDeliverableTarget(d);

          await db.insert(serviceDeliverables).values({
            id: randomUUID(),
            serviceId,
            key: d.key || (labelEn || labelAr || "item"),
            labelAr: labelAr || (labelEn || "Item"),
            labelEn: labelEn || (labelAr || "Item"),
            target,
            completed: 0,
            icon: d.icon,
            isBoolean: !!d.isBoolean,
          });
        }
      }

      return created;
    } catch (error) {
      console.error("Error creating client service:", error);
      throw error;
    }
  }

  async updateClientService(id: string, service: Partial<InsertClientService>): Promise<ClientService | undefined> {
    try {
      // Get existing service to check for status change
      const existing = await db.select().from(clientServices).where(eq(clientServices.id, id));
      const existingService = existing[0];

      console.log(`[updateClientService] id=${id} service=`, JSON.stringify(service), `existingStatus=${existingService?.status}`);

      await db
        .update(clientServices)
        .set(service)
        .where(eq(clientServices.id, id));
      const result = await db.select().from(clientServices).where(eq(clientServices.id, id));
      const updatedService = result[0];

      // Auto-create income transaction when a one-time service is completed
      if (updatedService && service.status === "completed" && existingService?.status !== "completed") {
        console.log(`[updateClientService] Service completed, creating transaction...`);
        await this.createTransactionForCompletedService(updatedService);
      } else {
        console.log(`[updateClientService] NOT creating transaction: updatedService=${!!updatedService}, status=${service.status}, existingStatus=${existingService?.status}`);
      }

      return updatedService;
    } catch (error) {
      console.error("Error updating client service:", error);
      return undefined;
    }
  }

  private async createTransactionForCompletedService(service: ClientService): Promise<void> {
    try {
      if (!service.price || !service.currency) return;

      // Check billing type from linked sub-package
      let billingType = "one_time";
      if (service.subPackageId) {
        const subPackagesList = await db.select().from(subPackages).where(eq(subPackages.id, service.subPackageId));
        if (subPackagesList.length > 0) {
          billingType = subPackagesList[0].billingType || "one_time";
        }
      }

      // Only auto-create transactions for one-time/project services, not monthly
      if (billingType === "monthly") {
        console.log(`[AutoTxn] Skipping monthly service: ${service.serviceName}`);
        return;
      }

      // Check if there's already a transaction for this service
      const existingTransactions = await db.select().from(transactions)
        .where(and(eq(transactions.relatedType, "client_service"), eq(transactions.relatedId, service.id)));
      if (existingTransactions.length > 0) {
        console.log(`[AutoTxn] Transaction already exists for service: ${service.serviceName} (${service.id})`);
        return;
      }

      // Create an income transaction
      const transactionId = randomUUID();
      const today = new Date().toISOString().split("T")[0];
      console.log(`[AutoTxn] Creating income transaction for completed service: ${service.serviceName}, amount: ${service.price} ${service.currency}`);
      await db.insert(transactions).values({
        id: transactionId,
        type: "income",
        category: "services",
        amount: service.price,
        currency: service.currency,
        description: `Completed service: ${service.serviceName}`,
        date: today,
        relatedType: "client_service",
        relatedId: service.id,
        clientId: service.clientId,
        serviceId: service.id,
        status: "completed",
      });
      console.log(`[AutoTxn] Transaction created: ${transactionId}`);
    } catch (error) {
      console.error("[AutoTxn] Error creating transaction for completed service:", error);
    }
  }

  async updateServiceDeliverables(serviceId: string, deliverables: ServiceDeliverableSnapshot[]): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        for (const d of deliverables) {
          // Check if exists
          const existing = await tx.select().from(serviceDeliverables).where(
            and(
              eq(serviceDeliverables.serviceId, serviceId),
              eq(serviceDeliverables.key, d.key)
            )
          );
          
          if (existing.length > 0) {
            await tx.update(serviceDeliverables).set({
              labelAr: d.labelAr || d.label, 
              labelEn: d.labelEn || d.label, 
              target: d.target,
              completed: d.completed,
              isBoolean: d.isBoolean,
              updatedAt: new Date()
            }).where(eq(serviceDeliverables.id, existing[0].id));
          } else {
            await tx.insert(serviceDeliverables).values({
              id: randomUUID(),
              serviceId,
              key: d.key,
              labelAr: d.labelAr || d.label,
              labelEn: d.labelEn || d.label,
              target: d.target,
              completed: d.completed,
              isBoolean: d.isBoolean
            });
          }
        }
      });
    } catch (error) {
      console.error("Error updating service deliverables:", error);
      throw error;
    }
  }

  async deleteClientService(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Delete related data first
      await tx.delete(serviceDeliverables).where(eq(serviceDeliverables.serviceId, id));
      await tx.delete(workActivityLogs).where(eq(workActivityLogs.serviceId, id));
      
      // Delete service
      await tx.delete(clientServices).where(eq(clientServices.id, id));
      return true;
    });
  }

  // ========== PACKAGES METHODS ==========

  async getMainPackages(): Promise<MainPackage[]> {
    try {
      return await db.select().from(mainPackages).orderBy(mainPackages.order);
    } catch (error) {
      console.error("Error fetching main packages:", error);
      return [];
    }
  }

  async createMainPackage(pkg: InsertMainPackage): Promise<MainPackage> {
    const id = randomUUID();
    await db.insert(mainPackages).values({ ...pkg, id });
    const result = await db.select().from(mainPackages).where(eq(mainPackages.id, id));
    return result[0];
  }

  async updateMainPackage(id: string, pkg: Partial<InsertMainPackage>): Promise<MainPackage | undefined> {
    await db
      .update(mainPackages)
      .set({ ...pkg, updatedAt: new Date() })
      .where(eq(mainPackages.id, id));
    const result = await db.select().from(mainPackages).where(eq(mainPackages.id, id));
    return result[0];
  }

  async deleteMainPackage(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Delete sub-packages first
      await tx.delete(subPackages).where(eq(subPackages.mainPackageId, id));
      // Delete main package
      await tx.delete(mainPackages).where(eq(mainPackages.id, id));
      return true;
    });
  }

  async getSubPackages(mainPackageId?: string): Promise<SubPackage[]> {
    try {
      if (mainPackageId) {
        return await db.select().from(subPackages).where(eq(subPackages.mainPackageId, mainPackageId)).orderBy(subPackages.order);
      }
      return await db.select().from(subPackages).orderBy(subPackages.order);
    } catch (error) {
      console.error("Error fetching sub packages:", error);
      return [];
    }
  }

  async createSubPackage(pkg: InsertSubPackage): Promise<SubPackage> {
    const id = randomUUID();
    await db.insert(subPackages).values({ ...pkg, id });
    const result = await db.select().from(subPackages).where(eq(subPackages.id, id));
    return result[0];
  }

  async updateSubPackage(id: string, pkg: Partial<InsertSubPackage>): Promise<SubPackage | undefined> {
    await db
      .update(subPackages)
      .set({ ...pkg, updatedAt: new Date() })
      .where(eq(subPackages.id, id));
    const result = await db.select().from(subPackages).where(eq(subPackages.id, id));
    return result[0];
  }

  async deleteSubPackage(id: string): Promise<boolean> {
    await db.delete(subPackages).where(eq(subPackages.id, id));
    return true;
  }

  // ========== INVOICES METHODS ==========

  async getInvoices(clientId?: string): Promise<Invoice[]> {
    try {
      if (clientId) {
        return await db.select().from(invoices).where(eq(invoices.clientId, clientId)).orderBy(desc(invoices.createdAt));
      }
      return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
    } catch (error) {
      console.error("Error fetching invoices:", error);
      return [];
    }
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    try {
      const result = await db.select().from(invoices).where(eq(invoices.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching invoice:", error);
      return undefined;
    }
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const id = randomUUID();
      const preparedInvoice = await this.prepareInvoicePayload(tx, invoice);
      await tx.insert(invoices).values({ ...preparedInvoice, id });
      const result = await tx.select().from(invoices).where(eq(invoices.id, id));
      const createdInvoice = result[0];
      await this.syncInvoicePayment(tx, createdInvoice);
      return createdInvoice;
    });
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    return await db.transaction(async (tx) => {
      const existingInvoices = await tx.select().from(invoices).where(eq(invoices.id, id));
      const existingInvoice = existingInvoices[0];
      
      if (!existingInvoice) return undefined;

      const preparedInvoice = await this.prepareInvoicePayload(tx, invoice, existingInvoice);

      await tx
        .update(invoices)
        .set({ ...preparedInvoice, updatedAt: new Date() })
        .where(eq(invoices.id, id));

      const updatedInvoices = await tx.select().from(invoices).where(eq(invoices.id, id));
      const updatedInvoice = updatedInvoices[0];
      await this.syncInvoicePayment(tx, updatedInvoice);

      return updatedInvoice;
    });
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const existingRows = await tx.select().from(invoices).where(eq(invoices.id, id));
      const existingInvoice = existingRows[0];
      if (!existingInvoice) {
        return true;
      }

      const linkedPayment = await this.findInvoicePaymentByInvoiceId(tx, id);
      if (linkedPayment) {
        await tx.delete(transactions).where(
          and(eq(transactions.relatedType, "client_payment"), eq(transactions.relatedId, linkedPayment.id))
        );
        await tx.delete(clientPayments).where(eq(clientPayments.id, linkedPayment.id));
      }

      await tx.delete(invoices).where(eq(invoices.id, id));
      return true;
    });
  }

  // ========== EMPLOYEES METHODS ==========

  async getEmployees(): Promise<Employee[]> {
    try {
      return await db.select().from(employees).orderBy(employees.name);
    } catch (error) {
      console.error("Error fetching employees:", error);
      return [];
    }
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    try {
      const result = await db.select().from(employees).where(eq(employees.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching employee:", error);
      return undefined;
    }
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    await db.insert(employees).values({ ...employee, id });
    const result = await db.select().from(employees).where(eq(employees.id, id));
    return result[0];
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    await db.transaction(async (tx) => {
      // 1. Load previous record for change detection
      const [prevEmp] = await tx.select().from(employees).where(eq(employees.id, id)).limit(1);

      // 2. Update Employee record
      await tx
        .update(employees)
        .set({ ...employee, updatedAt: new Date() })
        .where(eq(employees.id, id));

      // Load the updated employee to get email for cross-sync
      const [updatedEmp] = await tx.select().from(employees).where(eq(employees.id, id)).limit(1);

      // 3. Sync roleId, isActive and profileImage to User record(s) to ensure auth reflects employee status
      const updateUserPayload: Partial<Pick<InsertUser, "roleId" | "isActive" | "avatar">> = {};
      if (typeof employee.roleId !== "undefined") {
        updateUserPayload.roleId = employee.roleId;
      }
      if (typeof employee.isActive !== "undefined") {
        updateUserPayload.isActive = employee.isActive;
      }
      if (typeof employee.profileImage !== "undefined") {
        updateUserPayload.avatar = employee.profileImage;
      }
      if (Object.keys(updateUserPayload).length > 0) {
        // Users linked by employeeId
        const linkedUsers = await tx.select().from(users).where(eq(users.employeeId, id));
        if (linkedUsers.length > 0) {
          await tx.update(users)
            .set(updateUserPayload)
            .where(eq(users.employeeId, id));
        }
        // Users linked by email (legacy)
        if (updatedEmp?.email) {
          await tx.update(users)
            .set(updateUserPayload)
            .where(eq(users.email, updatedEmp.email));
        }

        if (typeof employee.isActive !== "undefined" && employee.isActive === false) {
          const affected: string[] = [];
          for (const u of linkedUsers) {
            if (u.id) affected.push(u.id);
          }
          if (updatedEmp?.email) {
            const mailUsers = await tx.select().from(users).where(eq(users.email, updatedEmp.email));
            for (const u of mailUsers) {
              if (u.id) affected.push(u.id);
            }
          }
          const uniq = Array.from(new Set(affected));
          for (const uid of uniq) {
            await db.execute(sql.raw(`DELETE FROM \`sessions\` WHERE \`data\` LIKE '%"userId":"${uid}"%'`));
          }
        }
      }

      // 4. Notify admins on activation status changes
      if (prevEmp && typeof employee.isActive !== "undefined" && updatedEmp) {
        const statusChanged = employee.isActive !== prevEmp.isActive;
        if (statusChanged) {
          const adminRole = await tx.select().from(roles).where(eq(roles.name, "admin")).limit(1);
          const adminRoleId = adminRole[0]?.id;
          if (adminRoleId) {
            const admins = await tx.select().from(users).where(eq(users.roleId, adminRoleId));
            const titleAr = employee.isActive ? "تم تفعيل حساب موظف" : "تم تعطيل حساب موظف";
            const titleEn = employee.isActive ? "Employee Account Activated" : "Employee Account Deactivated";
            const msgAr = `${updatedEmp.name} (${updatedEmp.email})`;
            const msgEn = `${updatedEmp.nameEn || updatedEmp.name} (${updatedEmp.email})`;
            for (const au of admins) {
              await tx.insert(notifications).values({
                id: randomUUID(),
                userId: au.id,
                type: "system",
                titleAr,
                titleEn,
                messageAr: msgAr,
                messageEn: msgEn,
                read: false,
                relatedId: updatedEmp.id,
                relatedType: "employee",
              });
            }
          }
        }
      }
    });

    const result = await db.select().from(employees).where(eq(employees.id, id));
    return result[0];
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // 0. Load employee to access email for legacy-linked users
      const [emp] = await tx.select().from(employees).where(eq(employees.id, id)).limit(1);
      const empEmail = emp?.email;

      // 1. Delete Payroll Payments and related Transactions
      const payments = await tx.select({ id: payrollPayments.id }).from(payrollPayments).where(eq(payrollPayments.employeeId, id));
      const paymentIds = payments.map(p => p.id);
      
      if (paymentIds.length > 0) {
        await tx.delete(transactions).where(
          and(
            eq(transactions.relatedType, "payroll_payment"),
            inArray(transactions.relatedId, paymentIds)
          )
        );
        await tx.delete(payrollPayments).where(inArray(payrollPayments.id, paymentIds));
      }

      // 2. Delete Salaries
      await tx.delete(employeeSalaries).where(eq(employeeSalaries.employeeId, id));

      // 3. Delete Work Sessions
      await tx.delete(workSessions).where(eq(workSessions.employeeId, id));

      // 4. Delete Calendar Events
      await tx.delete(calendarEvents).where(eq(calendarEvents.employeeId, id));

      // 5. Delete Users (Hard Delete as requested)
      // First, we need to handle notifications or other user-related data if any
      const byEmployeeId = await tx.select({ id: users.id }).from(users).where(eq(users.employeeId, id));
      const byEmail = empEmail ? await tx.select({ id: users.id }).from(users).where(eq(users.email, empEmail)) : [];
      const userIds = Array.from(new Set([...byEmployeeId, ...byEmail].map(u => u.id)));

      if (userIds.length > 0) {
        for (const uid of userIds) {
          await db.execute(sql.raw(`DELETE FROM \`sessions\` WHERE \`data\` LIKE '%"userId":"${uid}"%'`));
        }
        await tx.delete(notifications).where(inArray(notifications.userId, userIds));
        await tx.delete(users).where(inArray(users.id, userIds));
      }
      
      // 5.b Clean up pending invitations and password resets for this email (to allow re-inviting)
      if (empEmail) {
        await tx.delete(invitations).where(eq(invitations.email, empEmail));
        await tx.delete(passwordResets).where(eq(passwordResets.email, empEmail));
      }

      // 6. Unlink Client Services (Sales Rep)
      await tx.update(clientServices).set({ salesEmployeeId: null }).where(eq(clientServices.salesEmployeeId, id));

      // 7. Delete Employee
      await tx.delete(employees).where(eq(employees.id, id));
      
      return true;
    });
  }

  // ========== SYSTEM SETTINGS METHODS ==========

  async getSystemSettings(): Promise<SystemSettings | undefined> {
    try {
      const result = await db.select().from(systemSettings).where(eq(systemSettings.id, "current"));
      return result[0];
    } catch (error) {
      console.error("Error fetching system settings:", error);
      return undefined;
    }
  }

  async updateSystemSettings(settings: InsertSystemSettings["settings"]): Promise<SystemSettings> {
    try {
      const existing = await this.getSystemSettings();
      if (existing) {
        await db
          .update(systemSettings)
          .set({ settings, updatedAt: new Date() })
          .where(eq(systemSettings.id, "current"));
        const result = await db.select().from(systemSettings).where(eq(systemSettings.id, "current"));
        return result[0];
      } else {
        await db
          .insert(systemSettings)
          .values({ id: "current", settings });
        const result = await db.select().from(systemSettings).where(eq(systemSettings.id, "current"));
        return result[0];
      }
    } catch (error) {
      console.error("Error updating system settings:", error);
      throw error;
    }
  }

  // ========== LEADS METHODS ==========

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.id, id));
    return result[0];
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    await db.insert(leads).values({ ...lead, id });
    const result = await db.select().from(leads).where(eq(leads.id, id));
    return result[0];
  }

  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    try {
      await db
        .update(leads)
        .set(lead)
        .where(eq(leads.id, id));
      const result = await db.select().from(leads).where(eq(leads.id, id));
      return result[0];
    } catch (error) {
      console.error("Error updating lead:", error);
      return undefined;
    }
  }

  async deleteLead(id: string): Promise<boolean> {
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  async convertLeadToClient(leadId: string): Promise<Client> {
    console.log(`[Storage] convertLeadToClient called for leadId: ${leadId}`);
    return await db.transaction(async (tx) => {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));
      if (!lead) {
        console.error(`[Storage] Lead not found: ${leadId}`);
        throw new Error("Lead not found");
      }

      console.log(`[Storage] Found lead:`, JSON.stringify(lead, null, 2));

      let newClient: Client;
      
      // Check if this lead has preserved client data
      if (lead.preservedClientData) {
        console.log(`[Storage] Restoring preserved client data`);
        const preservedData = lead.preservedClientData as PreservedClientData;
        const preservedClient = preservedData.client;
        const preservedServices = preservedData.services;

        // Restore the client
        const restoredClientId = randomUUID();
        const restoredClientValues: InsertClient = {
          name: preservedClient.name ?? lead.name,
          email: preservedClient.email || null,
          phone: preservedClient.phone || null,
          company: preservedClient.company || null,
          country: preservedClient.country || null,
          source: preservedClient.source || null,
          status: "active",
          salesOwnerId: preservedClient.salesOwnerId || null,
          assignedManagerId: preservedClient.assignedManagerId || null,
          salesOwners: Array.isArray(preservedClient.salesOwners) ? preservedClient.salesOwners : [],
          assignedStaff: Array.isArray(preservedClient.assignedStaff) ? preservedClient.assignedStaff : [],
          convertedFromLeadId: leadId,
          leadCreatedAt: lead.createdAt || null,
          notes: preservedClient.notes || null,
        };
        await tx.insert(clients).values({
          id: restoredClientId,
          ...restoredClientValues,
        });
        [newClient] = await tx.select().from(clients).where(eq(clients.id, restoredClientId));

        // Restore services
        if (preservedServices && Array.isArray(preservedServices)) {
          for (const service of preservedServices) {
            if (!service.mainPackageId || !service.serviceName || !service.startDate) {
              continue;
            }

            const restoredServiceValues: InsertClientService = {
              clientId: newClient.id,
              mainPackageId: service.mainPackageId,
              subPackageId: service.subPackageId || null,
              serviceName: service.serviceName,
              serviceNameEn: service.serviceNameEn || null,
              startDate: service.startDate,
              endDate: service.endDate || null,
              status: service.status || "not_started",
              price: service.price ?? null,
              currency: service.currency || null,
              salesEmployeeId: service.salesEmployeeId || null,
              executionEmployeeIds: Array.isArray(service.executionEmployeeIds) ? service.executionEmployeeIds : [],
              notes: service.notes || null,
            };

            await tx.insert(clientServices).values({
              id: randomUUID(),
              ...restoredServiceValues,
              completedAt: service.completedAt ? new Date(service.completedAt) : null,
            });
          }
        }
      } else {
        console.log(`[Storage] Converting standard lead to client`);
        // Standard Lead -> Client conversion (no prior history)
        const clientValues = {
          name: lead.name,
          email: lead.email || null,
          phone: lead.phone || null,
          company: lead.company || null,
          country: lead.country || null,
          source: lead.source || null,
          status: "active",
          salesOwnerId: lead.negotiatorId || null,
          salesOwners: lead.negotiatorId ? [lead.negotiatorId] : [],
          convertedFromLeadId: leadId,
          leadCreatedAt: lead.createdAt || null, 
          notes: [
            lead.notes,
            lead.dealValue ? `Deal Value: ${lead.dealValue} ${lead.dealCurrency || ''}` : null
          ].filter(Boolean).join('\n\n') || null,
        };
        console.log(`[Storage] Client values:`, JSON.stringify(clientValues, null, 2));

        const convertedClientId = randomUUID();
        await tx.insert(clients).values({ ...clientValues, id: convertedClientId });
        [newClient] = await tx.select().from(clients).where(eq(clients.id, convertedClientId));

        // Create a default service for the new client
        const [defaultPackage] = await tx.select().from(mainPackages).limit(1);
        const mainPackageId = defaultPackage?.id || "unknown";
        console.log(`[Storage] Using mainPackageId: ${mainPackageId}`);

        const serviceValues = {
          clientId: newClient.id,
          mainPackageId: mainPackageId,
          serviceName: lead.dealValue ? "Converted Deal" : "New Service",
          serviceNameEn: lead.dealValue ? "Converted Deal" : "New Service",
          startDate: new Date().toISOString().split('T')[0],
          price: lead.dealValue || 0,
          currency: (lead.dealCurrency as string) || "USD",
          status: "in_progress",
          salesEmployeeId: lead.negotiatorId || null,
          notes: lead.notes || null, 
        };
        console.log(`[Storage] Service values:`, JSON.stringify(serviceValues, null, 2));

        const serviceId = randomUUID();
        await tx.insert(clientServices).values({ ...serviceValues, id: serviceId });
      }

      // Delete the lead
      console.log(`[Storage] Deleting lead: ${leadId}`);
      await tx.delete(leads).where(eq(leads.id, leadId));

      console.log(`[Storage] Conversion successful, new client ID: ${newClient.id}`);
      return newClient;
    });
  }
}

export const storage = new DatabaseStorage();
