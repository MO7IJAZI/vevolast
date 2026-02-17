
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
  users, goals, serviceDeliverables, workActivityLogs, serviceReports, clientUsers
} from "@shared/schema";
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

interface WorkSessionFilters {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
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
  
  getFinanceSummary(params: FinanceSummaryParams): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    overdueAmount: number;
    payrollRemaining: number;
    displayCurrency: string;
  }>;

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
  getClientServices(clientId?: string): Promise<ClientService[]>;
  createClientService(service: InsertClientService): Promise<ClientService>;
  updateClientService(id: string, service: Partial<InsertClientService>): Promise<ClientService | undefined>;
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
  updateSystemSettings(settings: any): Promise<SystemSettings>;

  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  convertLeadToClient(leadId: string): Promise<Client>;
}

export class DatabaseStorage implements IStorage {
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
        conditions.push(and(eq(transactions.relatedId, filters.clientId), eq(transactions.relatedType, "invoice")));
      }

      if (filters.employeeId) {
        conditions.push(and(eq(transactions.relatedId, filters.employeeId), eq(transactions.relatedType, "salary")));
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
    const id = randomUUID();
    await db.insert(transactions).values({ ...transaction, id });
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    await db.update(transactions).set(transaction).where(eq(transactions.id, id));
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async deleteTransaction(id: string): Promise<boolean> {
    await db.delete(transactions).where(eq(transactions.id, id));
    return true;
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
    // Create the client payment
    const paymentId = randomUUID();
    await db.insert(clientPayments).values({ ...payment, id: paymentId });
    const paymentResult = await db.select().from(clientPayments).where(eq(clientPayments.id, paymentId));
    const createdPayment = paymentResult[0];
    
    // Also create an income transaction
    const transactionId = randomUUID();
    await db.insert(transactions).values({
      id: transactionId,
      description: "Client payment",
      amount: payment.amount,
      currency: payment.currency,
      type: "income",
      category: "client_payment", // Corrected from 'other' to match enum if needed, or use 'other'
      date: payment.paymentDate,
      clientId: payment.clientId,
      serviceId: payment.serviceId,
      relatedId: createdPayment.id,
      relatedType: "client_payment",
      status: "completed",
    });
    
    return createdPayment;
  }

  async updateClientPayment(id: string, payment: Partial<InsertClientPayment>): Promise<ClientPayment | undefined> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(clientPayments).where(eq(clientPayments.id, id));
      if (existing.length === 0) {
        return undefined;
      }
      await tx.update(clientPayments).set(payment).where(eq(clientPayments.id, id));
      const updated = await tx.select().from(clientPayments).where(eq(clientPayments.id, id));
      const updatedPayment = updated[0];

      await tx.update(transactions)
        .set({
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
          date: updatedPayment.paymentDate,
          clientId: updatedPayment.clientId,
          serviceId: updatedPayment.serviceId,
        })
        .where(and(eq(transactions.relatedType, "client_payment"), eq(transactions.relatedId, id)));

      return updatedPayment;
    });
  }

  async deleteClientPayment(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
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
    // Create the payroll payment
    const paymentId = randomUUID();
    await db.insert(payrollPayments).values({ ...payment, id: paymentId });
    const paymentResult = await db.select().from(payrollPayments).where(eq(payrollPayments.id, paymentId));
    const createdPayment = paymentResult[0];
    
    // Also create an expense transaction
    const transactionId = randomUUID();
    await db.insert(transactions).values({
      id: transactionId,
      type: "expense",
      category: "salaries",
      amount: payment.amount,
      currency: payment.currency,
      description: "Salary payment",
      date: payment.paymentDate,
      relatedId: createdPayment.id,
      relatedType: "payroll_payment",
    });
    
    return createdPayment;
  }

  async updatePayrollPayment(id: string, payment: Partial<InsertPayrollPayment>): Promise<PayrollPayment | undefined> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(payrollPayments).where(eq(payrollPayments.id, id));
      if (existing.length === 0) {
        return undefined;
      }
      const previous = existing[0];
      await tx.update(payrollPayments).set(payment).where(eq(payrollPayments.id, id));
      const updated = await tx.select().from(payrollPayments).where(eq(payrollPayments.id, id));
      const updatedPayment = updated[0];

      await tx.update(transactions)
        .set({
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
          date: updatedPayment.paymentDate,
        })
        .where(and(eq(transactions.relatedType, "payroll_payment"), eq(transactions.relatedId, id)));

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

  async getFinanceSummary(params: FinanceSummaryParams): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    overdueAmount: number;
    payrollRemaining: number;
    displayCurrency: string;
  }> {
    const { month, year, displayCurrency } = params;
    const now = new Date();
    const currentMonth = month || (now.getMonth() + 1);
    const currentYear = year || now.getFullYear();

    // Get all transactions for the period
    const allTransactions = await this.getTransactions({ month: currentMonth, year: currentYear });
    
    // Calculate totals with currency conversion
    let totalIncome = 0;
    let totalExpenses = 0;
    
    for (const t of allTransactions) {
      const converted = await convertCurrency(t.amount, t.currency, displayCurrency);
      if (t.type === "income") {
        totalIncome += converted;
      } else {
        totalExpenses += converted;
      }
    }

    // Get employee salaries to calculate payroll remaining
    const salaries = await this.getEmployeeSalaries();
    const payrollPaymentsThisMonth = await this.getPayrollPayments({ month: currentMonth, year: currentYear });
    
    let totalExpectedSalaries = 0;
    let totalPaidSalaries = 0;
    
    for (const salary of salaries) {
      if (salary.type === "monthly" && salary.amount) {
        const converted = await convertCurrency(salary.amount, salary.currency, displayCurrency);
        totalExpectedSalaries += converted;
      }
    }
    
    for (const payment of payrollPaymentsThisMonth) {
      const converted = await convertCurrency(payment.amount, payment.currency, displayCurrency);
      totalPaidSalaries += converted;
    }

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round((totalIncome - totalExpenses) * 100) / 100,
      overdueAmount: 0, // To be calculated based on client expected payments
      payrollRemaining: Math.round((totalExpectedSalaries - totalPaidSalaries) * 100) / 100,
      displayCurrency,
    };
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

      return { client: newClient, service: newService };
    });
  }

  // ========== CLIENT SERVICES METHODS ==========

  async getClientServices(clientId?: string): Promise<ClientService[]> {
    try {
      if (clientId) {
        return await db.select().from(clientServices).where(eq(clientServices.clientId, clientId));
      }
      return await db.select().from(clientServices);
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
      return result[0];
    } catch (error) {
      console.error("Error creating client service:", error);
      throw error;
    }
  }

  async updateClientService(id: string, service: Partial<InsertClientService>): Promise<ClientService | undefined> {
    try {
      await db
        .update(clientServices)
        .set(service)
        .where(eq(clientServices.id, id));
      const result = await db.select().from(clientServices).where(eq(clientServices.id, id));
      return result[0];
    } catch (error) {
      console.error("Error updating client service:", error);
      return undefined;
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
    const id = randomUUID();
    await db.insert(invoices).values({ ...invoice, id });
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0];
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id));
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0];
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await db.delete(invoices).where(eq(invoices.id, id));
    return true;
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
    await db
      .update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employees.id, id));
    const result = await db.select().from(employees).where(eq(employees.id, id));
    return result[0];
  }

  async deleteEmployee(id: string): Promise<boolean> {
    await db.delete(employees).where(eq(employees.id, id));
    return true;
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

  async updateSystemSettings(settings: any): Promise<SystemSettings> {
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
        const preservedData = lead.preservedClientData as any;
        const preservedClient = preservedData.client;
        const preservedServices = preservedData.services;

        // Restore the client
        const restoredClientId = randomUUID();
        await tx.insert(clients).values({
          id: restoredClientId,
          name: preservedClient.name,
          email: preservedClient.email || null,
          phone: preservedClient.phone || null,
          company: preservedClient.company || null,
          country: preservedClient.country || null,
          source: preservedClient.source || null,
          status: "active", // Force status to active as requested
          salesOwnerId: preservedClient.salesOwnerId || null,
          salesOwners: preservedClient.salesOwners || [],
          convertedFromLeadId: leadId,
          leadCreatedAt: lead.createdAt || null, 
          notes: preservedClient.notes || null,
        });
        [newClient] = await tx.select().from(clients).where(eq(clients.id, restoredClientId));

        // Restore services
        if (preservedServices && Array.isArray(preservedServices)) {
          for (const service of preservedServices) {
             // Ensure required fields are present and safe
             await tx.insert(clientServices).values({
               ...service,
               id: randomUUID(), // Generate new ID
               clientId: newClient.id, // Link to new client
               // Explicitly handle potentially problematic fields if they were in the spread object
               updatedAt: undefined,
               createdAt: undefined,
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
