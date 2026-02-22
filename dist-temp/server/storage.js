import { transactions, clientPayments, payrollPayments, employeeSalaries, calendarEvents, notifications, workSessions, clients, leads, clientServices, mainPackages, subPackages, invoices, employees, systemSettings, users, goals, serviceDeliverables, workActivityLogs, serviceReports, clientUsers } from "../shared/schema.js";
import { db } from "./db";
import { randomUUID } from "crypto";
import { eq, and, desc, or, isNull, sql, inArray } from "drizzle-orm";
import { convertCurrency } from "./exchangeRates";
export class DatabaseStorage {
    async getUser(id) {
        const result = await db.select().from(users).where(eq(users.id, id));
        return result[0];
    }
    async getUserByUsername(username) {
        const result = await db.select().from(users).where(eq(users.email, username));
        return result[0];
    }
    async createUser(insertUser) {
        const id = randomUUID();
        await db.insert(users).values({ ...insertUser, id });
        const result = await db.select().from(users).where(eq(users.id, id));
        return result[0];
    }
    async getGoals() {
        return await db.select().from(goals);
    }
    async getGoal(id) {
        const result = await db.select().from(goals).where(eq(goals.id, id));
        return result[0];
    }
    async createGoal(insertGoal) {
        const id = randomUUID();
        await db.insert(goals).values({ ...insertGoal, id });
        const result = await db.select().from(goals).where(eq(goals.id, id));
        return result[0];
    }
    async updateGoal(id, updates) {
        await db
            .update(goals)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(goals.id, id));
        const result = await db.select().from(goals).where(eq(goals.id, id));
        return result[0];
    }
    async deleteGoal(id) {
        await db.delete(goals).where(eq(goals.id, id));
        return true;
    }
    async getTransactions(filters) {
        try {
            let conditions = [];
            if (filters.type) {
                conditions.push(eq(transactions.type, filters.type));
            }
            if (filters.month && filters.year) {
                const monthStr = filters.month.toString().padStart(2, "0");
                const yearStr = filters.year.toString();
                // date is stored as "YYYY-MM-DD"
                conditions.push(sql `${transactions.date} LIKE ${yearStr + "-" + monthStr + "%"}`);
            }
            else if (filters.year) {
                conditions.push(sql `${transactions.date} LIKE ${filters.year.toString() + "%"}`);
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
        }
        catch (error) {
            console.error("Error fetching transactions:", error);
            return [];
        }
    }
    async createTransaction(transaction) {
        const id = randomUUID();
        await db.insert(transactions).values({ ...transaction, id });
        const result = await db.select().from(transactions).where(eq(transactions.id, id));
        return result[0];
    }
    async updateTransaction(id, transaction) {
        await db.update(transactions).set(transaction).where(eq(transactions.id, id));
        const result = await db.select().from(transactions).where(eq(transactions.id, id));
        return result[0];
    }
    async deleteTransaction(id) {
        await db.delete(transactions).where(eq(transactions.id, id));
        return true;
    }
    async getClientPayments(filters) {
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
        }
        catch (error) {
            console.error("Error fetching client payments:", error);
            return [];
        }
    }
    async createClientPayment(payment) {
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
    async updateClientPayment(id, payment) {
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
    async deleteClientPayment(id) {
        return await db.transaction(async (tx) => {
            await tx.delete(transactions).where(and(eq(transactions.relatedType, "client_payment"), eq(transactions.relatedId, id)));
            await tx.delete(clientPayments).where(eq(clientPayments.id, id));
            return true;
        });
    }
    async getPayrollPayments(filters) {
        try {
            let conditions = [];
            if (filters.employeeId) {
                conditions.push(eq(payrollPayments.employeeId, filters.employeeId));
            }
            if (filters.month && filters.year) {
                const period = `${filters.year}-${filters.month.toString().padStart(2, '0')}`;
                conditions.push(eq(payrollPayments.period, period));
            }
            else if (filters.year !== undefined) {
                conditions.push(sql `${payrollPayments.period} LIKE ${filters.year.toString() + "%"}`);
            }
            const query = db.select().from(payrollPayments).orderBy(desc(payrollPayments.createdAt));
            if (conditions.length > 0) {
                return await query.where(and(...conditions));
            }
            return await query;
        }
        catch (error) {
            console.error("Error fetching payroll payments:", error);
            return [];
        }
    }
    async createPayrollPayment(payment) {
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
    async updatePayrollPayment(id, payment) {
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
    async deletePayrollPayment(id) {
        return await db.transaction(async (tx) => {
            await tx.delete(transactions)
                .where(and(eq(transactions.relatedType, "payroll_payment"), eq(transactions.relatedId, id)));
            await tx.delete(payrollPayments).where(eq(payrollPayments.id, id));
            return true;
        });
    }
    async getEmployeeSalaries() {
        try {
            return await db.select().from(employeeSalaries);
        }
        catch (error) {
            console.error("Error fetching employee salaries:", error);
            return [];
        }
    }
    async getEmployeeSalary(employeeId) {
        try {
            const result = await db.select().from(employeeSalaries).where(eq(employeeSalaries.employeeId, employeeId));
            return result[0] || null;
        }
        catch (error) {
            console.error("Error fetching employee salary:", error);
            return null;
        }
    }
    async upsertEmployeeSalary(employeeId, data) {
        const existing = await this.getEmployeeSalary(employeeId);
        if (existing) {
            await db
                .update(employeeSalaries)
                .set(data)
                .where(eq(employeeSalaries.employeeId, employeeId));
            const result = await db.select().from(employeeSalaries).where(eq(employeeSalaries.employeeId, employeeId));
            return result[0];
        }
        else {
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
    async getFinanceSummary(params) {
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
            }
            else {
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
        // Calculate Overdue Amount
        // Get all client services and payments to calculate overdue
        const allServices = await this.getClientServices();
        const allPayments = await this.getClientPayments({});
        const allSubPackages = await this.getSubPackages();
        const subPackageMap = new Map(allSubPackages.map(sp => [sp.id, sp]));
        let overdueAmount = 0;
        const todayStr = now.toISOString().split('T')[0];
        for (const service of allServices) {
            if (!service.price || service.status === 'cancelled')
                continue;
            const subPackage = service.subPackageId ? subPackageMap.get(service.subPackageId) : null;
            const billingType = subPackage?.billingType || 'one_time';
            const servicePrice = await convertCurrency(service.price, service.currency || 'USD', displayCurrency);
            if (billingType === 'monthly') {
                // For monthly services, check if payment for THIS month is made
                // Only if service is active
                if (service.status === 'active') {
                    const servicePaymentsThisMonth = allPayments.filter(p => p.serviceId === service.id &&
                        p.month === currentMonth &&
                        p.year === currentYear);
                    let totalPaid = 0;
                    for (const p of servicePaymentsThisMonth) {
                        const paymentAmount = await convertCurrency(p.amount, p.currency, displayCurrency);
                        totalPaid += paymentAmount;
                    }
                    if (totalPaid < servicePrice - 1) {
                        overdueAmount += (servicePrice - totalPaid);
                    }
                }
            }
            else {
                // For one-time/project services
                // Check if service has end date is past or today
                if (service.endDate && service.endDate < todayStr) {
                    // Calculate total paid for this service (lifetime)
                    const servicePayments = allPayments.filter(p => p.serviceId === service.id);
                    let totalPaid = 0;
                    for (const p of servicePayments) {
                        const paymentAmount = await convertCurrency(p.amount, p.currency, displayCurrency);
                        totalPaid += paymentAmount;
                    }
                    if (totalPaid < servicePrice - 1) {
                        overdueAmount += (servicePrice - totalPaid);
                    }
                }
            }
        }
        return {
            totalIncome: Math.round(totalIncome * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            netProfit: Math.round((totalIncome - totalExpenses) * 100) / 100,
            overdueAmount: Math.round(overdueAmount * 100) / 100,
            payrollRemaining: Math.round((totalExpectedSalaries - totalPaidSalaries) * 100) / 100,
            displayCurrency,
        };
    }
    // ========== CALENDAR EVENTS METHODS ==========
    async getCalendarEvents(filters) {
        try {
            let conditions = [];
            if (filters.startDate) {
                conditions.push(sql `${calendarEvents.date} >= ${filters.startDate}`);
            }
            if (filters.endDate) {
                conditions.push(sql `${calendarEvents.date} <= ${filters.endDate}`);
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
        }
        catch (error) {
            console.error("Error fetching calendar events:", error);
            return [];
        }
    }
    async getCalendarEvent(id) {
        try {
            const result = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error fetching calendar event:", error);
            return undefined;
        }
    }
    async createCalendarEvent(event) {
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
            }
            catch (error) {
                console.error("Error creating notification for task:", error);
            }
        }
        return createdEvent;
    }
    async updateCalendarEvent(id, updates) {
        try {
            await db
                .update(calendarEvents)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(calendarEvents.id, id));
            const result = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error updating calendar event:", error);
            return undefined;
        }
    }
    async deleteCalendarEvent(id) {
        await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
        return true;
    }
    // ========== NOTIFICATIONS METHODS ==========
    async getNotifications(filters) {
        try {
            const today = new Date();
            let conditions = [
                or(isNull(notifications.snoozedUntil), sql `${notifications.snoozedUntil} <= ${today}`)
            ];
            if (filters.userId) {
                conditions.push(or(eq(notifications.userId, filters.userId), isNull(notifications.userId)));
            }
            const query = db.select().from(notifications).orderBy(desc(notifications.createdAt));
            return await query.where(and(...conditions));
        }
        catch (error) {
            console.error("Error fetching notifications:", error);
            return [];
        }
    }
    async createNotification(notification) {
        const id = randomUUID();
        await db.insert(notifications).values({ ...notification, id });
        const result = await db.select().from(notifications).where(eq(notifications.id, id));
        return result[0];
    }
    async markNotificationRead(id) {
        try {
            await db
                .update(notifications)
                .set({ read: true })
                .where(eq(notifications.id, id));
            return true;
        }
        catch (error) {
            console.error("Error marking notification read:", error);
            return false;
        }
    }
    async markAllNotificationsRead(userId) {
        try {
            await db
                .update(notifications)
                .set({ read: true })
                .where(and(eq(notifications.read, false), or(eq(notifications.userId, userId), isNull(notifications.userId))));
            return true;
        }
        catch (error) {
            console.error("Error marking all notifications read:", error);
            return false;
        }
    }
    async snoozeNotification(id, snoozedUntil) {
        try {
            await db
                .update(notifications)
                .set({ snoozedUntil: new Date(snoozedUntil) })
                .where(eq(notifications.id, id));
            return true;
        }
        catch (error) {
            console.error("Error snoozing notification:", error);
            return false;
        }
    }
    async deleteNotification(id) {
        await db.delete(notifications).where(eq(notifications.id, id));
        return true;
    }
    // ========== WORK SESSIONS METHODS ==========
    async getWorkSessions(filters) {
        try {
            let conditions = [];
            if (filters.employeeId) {
                conditions.push(eq(workSessions.employeeId, filters.employeeId));
            }
            if (filters.date) {
                conditions.push(eq(workSessions.date, filters.date));
            }
            if (filters.startDate) {
                conditions.push(sql `${workSessions.date} >= ${filters.startDate}`);
            }
            if (filters.endDate) {
                conditions.push(sql `${workSessions.date} <= ${filters.endDate}`);
            }
            if (filters.status) {
                conditions.push(eq(workSessions.status, filters.status));
            }
            const query = db.select().from(workSessions).orderBy(desc(workSessions.date));
            if (conditions.length > 0) {
                return await query.where(and(...conditions));
            }
            return await query;
        }
        catch (error) {
            console.error("Error fetching work sessions:", error);
            return [];
        }
    }
    async getWorkSession(id) {
        const result = await db.select().from(workSessions).where(eq(workSessions.id, id));
        return result[0];
    }
    async getWorkSessionByEmployeeAndDate(employeeId, date) {
        const result = await db.select().from(workSessions).where(and(eq(workSessions.employeeId, employeeId), eq(workSessions.date, date)));
        return result[0];
    }
    async createWorkSession(session) {
        const id = randomUUID();
        await db.insert(workSessions).values({ ...session, id });
        const result = await db.select().from(workSessions).where(eq(workSessions.id, id));
        return result[0];
    }
    async updateWorkSession(id, session) {
        try {
            await db
                .update(workSessions)
                .set({ ...session, updatedAt: new Date() })
                .where(eq(workSessions.id, id));
            const result = await db.select().from(workSessions).where(eq(workSessions.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error updating work session:", error);
            return undefined;
        }
    }
    // ========== CLIENTS METHODS ==========
    async getClients() {
        return await db.select().from(clients).orderBy(desc(clients.createdAt));
    }
    async getClient(id) {
        const result = await db.select().from(clients).where(eq(clients.id, id));
        return result[0];
    }
    async createClient(client) {
        const id = randomUUID();
        await db.insert(clients).values({ ...client, id });
        const result = await db.select().from(clients).where(eq(clients.id, id));
        return result[0];
    }
    async updateClient(id, client) {
        try {
            await db
                .update(clients)
                .set(client)
                .where(eq(clients.id, id));
            const result = await db.select().from(clients).where(eq(clients.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error updating client:", error);
            return undefined;
        }
    }
    async deleteClient(id) {
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
    async archiveClient(id) {
        try {
            await db
                .update(clients)
                .set({ status: "archived" })
                .where(eq(clients.id, id));
            const result = await db.select().from(clients).where(eq(clients.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error archiving client:", error);
            return undefined;
        }
    }
    async convertClientToLead(clientId) {
        return await db.transaction(async (tx) => {
            // 1. Get client
            const [client] = await tx.select().from(clients).where(eq(clients.id, clientId));
            if (!client)
                throw new Error("Client not found");
            // 2. Get services
            const services = await tx.select().from(clientServices).where(eq(clientServices.clientId, clientId));
            // 3. Format services into notes
            let servicesNote = "";
            if (services.length > 0) {
                servicesNote = "\n\n--- Service History (from Client phase) ---\n";
                servicesNote += services.map(s => `- ${s.serviceName} (${s.status}): ${s.price || 0} ${s.currency || ''} [${s.startDate} - ${s.endDate || 'Ongoing'}]`).join("\n");
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
    async createClientWithService(client, service) {
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
    async getClientServices(clientId) {
        try {
            let services;
            if (clientId) {
                services = await db.select().from(clientServices).where(eq(clientServices.clientId, clientId));
            }
            else {
                services = await db.select().from(clientServices);
            }
            if (services.length === 0)
                return [];
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
                    isBoolean: d.isBoolean
                }))
            }));
        }
        catch (error) {
            console.error("Error fetching client services:", error);
            return [];
        }
    }
    async createClientService(service) {
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
        }
        catch (error) {
            console.error("Error creating client service:", error);
            throw error;
        }
    }
    async updateClientService(id, service) {
        try {
            await db
                .update(clientServices)
                .set(service)
                .where(eq(clientServices.id, id));
            const result = await db.select().from(clientServices).where(eq(clientServices.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error updating client service:", error);
            return undefined;
        }
    }
    async updateServiceDeliverables(serviceId, deliverables) {
        try {
            await db.transaction(async (tx) => {
                for (const d of deliverables) {
                    // Check if exists
                    const existing = await tx.select().from(serviceDeliverables).where(and(eq(serviceDeliverables.serviceId, serviceId), eq(serviceDeliverables.key, d.key)));
                    if (existing.length > 0) {
                        await tx.update(serviceDeliverables).set({
                            labelAr: d.labelAr || d.label,
                            labelEn: d.labelEn || d.label,
                            target: d.target,
                            completed: d.completed,
                            isBoolean: d.isBoolean,
                            updatedAt: new Date()
                        }).where(eq(serviceDeliverables.id, existing[0].id));
                    }
                    else {
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
        }
        catch (error) {
            console.error("Error updating service deliverables:", error);
            throw error;
        }
    }
    async deleteClientService(id) {
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
    async getMainPackages() {
        try {
            return await db.select().from(mainPackages).orderBy(mainPackages.order);
        }
        catch (error) {
            console.error("Error fetching main packages:", error);
            return [];
        }
    }
    async createMainPackage(pkg) {
        const id = randomUUID();
        await db.insert(mainPackages).values({ ...pkg, id });
        const result = await db.select().from(mainPackages).where(eq(mainPackages.id, id));
        return result[0];
    }
    async updateMainPackage(id, pkg) {
        await db
            .update(mainPackages)
            .set({ ...pkg, updatedAt: new Date() })
            .where(eq(mainPackages.id, id));
        const result = await db.select().from(mainPackages).where(eq(mainPackages.id, id));
        return result[0];
    }
    async deleteMainPackage(id) {
        return await db.transaction(async (tx) => {
            // Delete sub-packages first
            await tx.delete(subPackages).where(eq(subPackages.mainPackageId, id));
            // Delete main package
            await tx.delete(mainPackages).where(eq(mainPackages.id, id));
            return true;
        });
    }
    async getSubPackages(mainPackageId) {
        try {
            if (mainPackageId) {
                return await db.select().from(subPackages).where(eq(subPackages.mainPackageId, mainPackageId)).orderBy(subPackages.order);
            }
            return await db.select().from(subPackages).orderBy(subPackages.order);
        }
        catch (error) {
            console.error("Error fetching sub packages:", error);
            return [];
        }
    }
    async createSubPackage(pkg) {
        const id = randomUUID();
        await db.insert(subPackages).values({ ...pkg, id });
        const result = await db.select().from(subPackages).where(eq(subPackages.id, id));
        return result[0];
    }
    async updateSubPackage(id, pkg) {
        await db
            .update(subPackages)
            .set({ ...pkg, updatedAt: new Date() })
            .where(eq(subPackages.id, id));
        const result = await db.select().from(subPackages).where(eq(subPackages.id, id));
        return result[0];
    }
    async deleteSubPackage(id) {
        await db.delete(subPackages).where(eq(subPackages.id, id));
        return true;
    }
    // ========== INVOICES METHODS ==========
    async getInvoices(clientId) {
        try {
            if (clientId) {
                return await db.select().from(invoices).where(eq(invoices.clientId, clientId)).orderBy(desc(invoices.createdAt));
            }
            return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
        }
        catch (error) {
            console.error("Error fetching invoices:", error);
            return [];
        }
    }
    async getInvoice(id) {
        try {
            const result = await db.select().from(invoices).where(eq(invoices.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error fetching invoice:", error);
            return undefined;
        }
    }
    async createInvoice(invoice) {
        const id = randomUUID();
        await db.insert(invoices).values({ ...invoice, id });
        const result = await db.select().from(invoices).where(eq(invoices.id, id));
        return result[0];
    }
    async updateInvoice(id, invoice) {
        return await db.transaction(async (tx) => {
            // Get existing invoice to check previous status
            const existingInvoices = await tx.select().from(invoices).where(eq(invoices.id, id));
            const existingInvoice = existingInvoices[0];
            if (!existingInvoice)
                return undefined;
            // Update the invoice
            await tx
                .update(invoices)
                .set({ ...invoice, updatedAt: new Date() })
                .where(eq(invoices.id, id));
            const updatedInvoices = await tx.select().from(invoices).where(eq(invoices.id, id));
            const updatedInvoice = updatedInvoices[0];
            // Check if status changed to "paid" and wasn't already paid
            if (invoice.status === "paid" && existingInvoice.status !== "paid") {
                const paymentDateStr = updatedInvoice.paidDate || new Date().toISOString().split('T')[0];
                const paymentDate = new Date(paymentDateStr);
                const month = paymentDate.getMonth() + 1;
                const year = paymentDate.getFullYear();
                // Create Client Payment
                const paymentId = randomUUID();
                const paymentData = {
                    clientId: updatedInvoice.clientId,
                    serviceId: updatedInvoice.serviceId,
                    amount: updatedInvoice.amount,
                    currency: updatedInvoice.currency,
                    paymentDate: paymentDateStr,
                    month,
                    year,
                    paymentMethod: updatedInvoice.paymentMethod || "bank_transfer",
                    notes: `Payment for Invoice #${updatedInvoice.invoiceNumber}`,
                };
                await tx.insert(clientPayments).values({ ...paymentData, id: paymentId });
                // Create Transaction (Income)
                const transactionId = randomUUID();
                await tx.insert(transactions).values({
                    id: transactionId,
                    type: "income",
                    category: "client_payment",
                    amount: updatedInvoice.amount,
                    currency: updatedInvoice.currency,
                    date: paymentDateStr,
                    description: `Invoice Payment #${updatedInvoice.invoiceNumber}`,
                    relatedType: "client_payment",
                    relatedId: paymentId,
                    clientId: updatedInvoice.clientId,
                    serviceId: updatedInvoice.serviceId,
                });
            }
            return updatedInvoice;
        });
    }
    async deleteInvoice(id) {
        await db.delete(invoices).where(eq(invoices.id, id));
        return true;
    }
    // ========== EMPLOYEES METHODS ==========
    async getEmployees() {
        try {
            return await db.select().from(employees).orderBy(employees.name);
        }
        catch (error) {
            console.error("Error fetching employees:", error);
            return [];
        }
    }
    async getEmployee(id) {
        try {
            const result = await db.select().from(employees).where(eq(employees.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error fetching employee:", error);
            return undefined;
        }
    }
    async createEmployee(employee) {
        const id = randomUUID();
        await db.insert(employees).values({ ...employee, id });
        const result = await db.select().from(employees).where(eq(employees.id, id));
        return result[0];
    }
    async updateEmployee(id, employee) {
        await db
            .update(employees)
            .set({ ...employee, updatedAt: new Date() })
            .where(eq(employees.id, id));
        const result = await db.select().from(employees).where(eq(employees.id, id));
        return result[0];
    }
    async deleteEmployee(id) {
        await db.delete(employees).where(eq(employees.id, id));
        return true;
    }
    // ========== SYSTEM SETTINGS METHODS ==========
    async getSystemSettings() {
        try {
            const result = await db.select().from(systemSettings).where(eq(systemSettings.id, "current"));
            return result[0];
        }
        catch (error) {
            console.error("Error fetching system settings:", error);
            return undefined;
        }
    }
    async updateSystemSettings(settings) {
        try {
            const existing = await this.getSystemSettings();
            if (existing) {
                await db
                    .update(systemSettings)
                    .set({ settings, updatedAt: new Date() })
                    .where(eq(systemSettings.id, "current"));
                const result = await db.select().from(systemSettings).where(eq(systemSettings.id, "current"));
                return result[0];
            }
            else {
                await db
                    .insert(systemSettings)
                    .values({ id: "current", settings });
                const result = await db.select().from(systemSettings).where(eq(systemSettings.id, "current"));
                return result[0];
            }
        }
        catch (error) {
            console.error("Error updating system settings:", error);
            throw error;
        }
    }
    // ========== LEADS METHODS ==========
    async getLeads() {
        return await db.select().from(leads).orderBy(desc(leads.createdAt));
    }
    async getLead(id) {
        const result = await db.select().from(leads).where(eq(leads.id, id));
        return result[0];
    }
    async createLead(lead) {
        const id = randomUUID();
        await db.insert(leads).values({ ...lead, id });
        const result = await db.select().from(leads).where(eq(leads.id, id));
        return result[0];
    }
    async updateLead(id, lead) {
        try {
            await db
                .update(leads)
                .set(lead)
                .where(eq(leads.id, id));
            const result = await db.select().from(leads).where(eq(leads.id, id));
            return result[0];
        }
        catch (error) {
            console.error("Error updating lead:", error);
            return undefined;
        }
    }
    async deleteLead(id) {
        await db.delete(leads).where(eq(leads.id, id));
        return true;
    }
    async convertLeadToClient(leadId) {
        console.log(`[Storage] convertLeadToClient called for leadId: ${leadId}`);
        return await db.transaction(async (tx) => {
            const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));
            if (!lead) {
                console.error(`[Storage] Lead not found: ${leadId}`);
                throw new Error("Lead not found");
            }
            console.log(`[Storage] Found lead:`, JSON.stringify(lead, null, 2));
            let newClient;
            // Check if this lead has preserved client data
            if (lead.preservedClientData) {
                console.log(`[Storage] Restoring preserved client data`);
                const preservedData = lead.preservedClientData;
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
            }
            else {
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
                    currency: lead.dealCurrency || "USD",
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
