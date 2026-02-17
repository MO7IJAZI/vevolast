import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  goalFormSchema,
  insertTransactionSchema,
  insertClientPaymentSchema,
  insertPayrollPaymentSchema,
  insertEmployeeSalarySchema,
  insertCalendarEventSchema,
  insertNotificationSchema,
  insertWorkSessionSchema,
  WorkSegmentSchema,
  BreakTypeEnum,
  insertClientSchema,
  insertLeadSchema,
  insertClientServiceSchema,
  insertMainPackageSchema,
  insertSubPackageSchema,
  insertInvoiceSchema,
  insertEmployeeSchema,
  insertSystemSettingsSchema,
  // attendance,
  // insertAttendanceSchema
} from "@shared/schema";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage/routes";
import { getExchangeRates, convertCurrency, refreshExchangeRates } from "./exchangeRates";
import { requireAdmin, requirePermission } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Goals API
  
  // Get all goals
  app.get("/api/goals", async (req, res) => {
    try {
      const goals = await storage.getGoals();
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  // Get single goal
  app.get("/api/goals/:id", async (req, res) => {
    try {
      const goal = await storage.getGoal(req.params.id);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      console.error("Error fetching goal:", error);
      res.status(500).json({ error: "Failed to fetch goal" });
    }
  });

  // Create goal
  app.post("/api/goals", async (req, res) => {
    try {
      const validated = goalFormSchema.parse(req.body);
      const goal = await storage.createGoal(validated as any);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid goal data", details: error.errors });
      }
      console.error("Error creating goal:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  // Update goal
  app.patch("/api/goals/:id", requirePermission("edit_goals"), async (req, res) => {
    try {
      const validated = goalFormSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(req.params.id, validated as any);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid goal data", details: error.errors });
      }
      console.error("Error updating goal:", error);
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  // Delete goal
  app.delete("/api/goals/:id", requirePermission("edit_goals"), async (req, res) => {
    try {
      const deleted = await storage.deleteGoal(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  // Clients API
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", requirePermission("edit_clients"), async (req, res) => {
    try {
      const validated = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validated);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.post("/api/clients-with-service", async (req, res) => {
    try {
      const { client, service } = req.body;
      const validatedClient = insertClientSchema.parse(client);
      // Validate service data (excluding clientId which is created during transaction)
      const validatedService = insertClientServiceSchema.omit({ clientId: true }).parse(service);
      
      const result = await storage.createClientWithService(validatedClient, validatedService);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating client with service:", error);
      res.status(500).json({ error: "Failed to create client with service" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const validated = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validated);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.post("/api/clients/:id/convert", async (req, res) => {
    try {
      const lead = await storage.convertClientToLead(req.params.id);
      res.status(201).json(lead);
    } catch (error) {
      console.error("Error converting client to lead:", error);
      res.status(500).json({ error: "Failed to convert client to lead" });
    }
  });

  app.delete("/api/clients/:id", requirePermission("archive_clients"), async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      if (client.status === "archived") {
        const deleted = await storage.deleteClient(req.params.id);
        if (!deleted) {
          return res.status(500).json({ error: "Failed to delete client" });
        }
        res.status(204).send();
        return;
      }
      const archived = await storage.archiveClient(req.params.id);
      if (!archived) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Client Services API
  app.get("/api/client-services", async (req, res) => {
    try {
      const { clientId } = req.query;
      const services = await storage.getClientServices(clientId as string);
      res.json(services);
    } catch (error) {
      console.error("Error fetching client services:", error);
      res.status(500).json({ error: "Failed to fetch client services" });
    }
  });

  app.post("/api/client-services", async (req, res) => {
    try {
      const validated = insertClientServiceSchema.parse(req.body);
      const service = await storage.createClientService(validated);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      console.error("Error creating client service:", error);
      res.status(500).json({ error: "Failed to create client service" });
    }
  });

  app.patch("/api/client-services/:id", async (req, res) => {
    try {
      const validated = insertClientServiceSchema.partial().parse(req.body);
      const service = await storage.updateClientService(req.params.id, validated);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      console.error("Error updating client service:", error);
      res.status(500).json({ error: "Failed to update client service" });
    }
  });

  app.delete("/api/client-services/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteClientService(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client service:", error);
      res.status(500).json({ error: "Failed to delete client service" });
    }
  });

  // ========== PACKAGES API ROUTES ==========

  app.get("/api/main-packages", async (req, res) => {
    try {
      const packages = await storage.getMainPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching main packages:", error);
      res.status(500).json({ error: "Failed to fetch main packages" });
    }
  });

  app.post("/api/main-packages", requireAdmin, async (req, res) => {
    try {
      const validated = insertMainPackageSchema.parse(req.body);
      const pkg = await storage.createMainPackage(validated);
      res.status(201).json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid package data", details: error.errors });
      }
      console.error("Error creating main package:", error);
      res.status(500).json({ error: "Failed to create main package" });
    }
  });

  app.patch("/api/main-packages/:id", requireAdmin, async (req, res) => {
    try {
      const validated = insertMainPackageSchema.partial().parse(req.body);
      const pkg = await storage.updateMainPackage(req.params.id as string, validated);
      if (!pkg) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid package data", details: error.errors });
      }
      console.error("Error updating main package:", error);
      res.status(500).json({ error: "Failed to update main package" });
    }
  });

  app.delete("/api/main-packages/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteMainPackage(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting main package:", error);
      res.status(500).json({ error: "Failed to delete main package" });
    }
  });

  app.get("/api/sub-packages", async (req, res) => {
    try {
      const { mainPackageId } = req.query;
      const packages = await storage.getSubPackages(mainPackageId as string);
      if (req.session?.userRole !== "admin") {
        const safePackages = packages.map(pkg => {
          const { price, currency, ...safePkg } = pkg;
          return safePkg;
        });
        return res.json(safePackages);
      }
      res.json(packages);
    } catch (error) {
      console.error("Error fetching sub packages:", error);
      res.status(500).json({ error: "Failed to fetch sub packages" });
    }
  });

  app.post("/api/sub-packages", requireAdmin, async (req, res) => {
    try {
      const validated = insertSubPackageSchema.parse(req.body);
      const pkg = await storage.createSubPackage(validated);
      res.status(201).json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid package data", details: error.errors });
      }
      console.error("Error creating sub package:", error);
      res.status(500).json({ error: "Failed to create sub package" });
    }
  });

  app.patch("/api/sub-packages/:id", requireAdmin, async (req, res) => {
    try {
      const validated = insertSubPackageSchema.partial().parse(req.body);
      const pkg = await storage.updateSubPackage(req.params.id as string, validated);
      if (!pkg) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid package data", details: error.errors });
      }
      console.error("Error updating sub package:", error);
      res.status(500).json({ error: "Failed to update sub package" });
    }
  });

  app.delete("/api/sub-packages/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteSubPackage(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sub package:", error);
      res.status(500).json({ error: "Failed to delete sub package" });
    }
  });

  // ========== INVOICES API ROUTES ==========

  app.get("/api/invoices", requireAdmin, async (req, res) => {
    try {
      const { clientId } = req.query;
      const invoices = await storage.getInvoices(clientId as string);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", requireAdmin, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id as string);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", requireAdmin, async (req, res) => {
    try {
      const validated = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validated);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", requireAdmin, async (req, res) => {
    try {
      const validated = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id as string, validated);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // ========== EMPLOYEES API ROUTES ==========

  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      
      // Filter out salary information for non-admins
      if (req.session?.userRole !== "admin") {
        const safeEmployees = employees.map(emp => {
          const { salaryType, salaryAmount, rate, rateType, salaryCurrency, salaryNotes, ...safeEmp } = emp;
          return safeEmp;
        });
        return res.json(safeEmployees);
      }
      
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Check if user is admin or viewing their own profile (matched by email)
      const isAdmin = req.session?.userRole === "admin";
      const isSelf = req.session?.userEmail === employee.email;

      if (!isAdmin && !isSelf) {
        const { salaryType, salaryAmount, rate, rateType, salaryCurrency, salaryNotes, ...safeEmployee } = employee;
        return res.json(safeEmployee);
      }

      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", requireAdmin, async (req, res) => {
    try {
      const validated = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validated);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      console.error("Error creating employee:", error);
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const isAdmin = req.session?.userRole === "admin";
      const isSelf = req.session?.userEmail === employee.email;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ error: "Forbidden: You can only edit your own profile" });
      }

      // If not admin (self-update), prevent updating sensitive fields
      let dataToUpdate = req.body;
      if (!isAdmin) {
        // Remove sensitive fields from the update payload
        const { 
          salaryType, salaryAmount, rate, rateType, salaryCurrency, salaryNotes, // Salary info
          role, roleAr, department, jobTitle, // Job info (should be admin controlled)
          isActive, // Status
          ...safeData 
        } = req.body;
        dataToUpdate = safeData;
      }

      const validated = insertEmployeeSchema.partial().parse(dataToUpdate);
      const updatedEmployee = await storage.updateEmployee(req.params.id, validated);
      
      // If returning the updated object to non-admin, strip sensitive fields again
      if (!isAdmin) {
        const { salaryType, salaryAmount, rate, rateType, salaryCurrency, salaryNotes, ...safeEmployee } = updatedEmployee!;
        return res.json(safeEmployee);
      }

      res.json(updatedEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      console.error("Error updating employee:", error);
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Leads API
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validated = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validated);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid lead data", details: error.errors });
      }
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const validated = insertLeadSchema.partial().parse(req.body);
      const lead = await storage.updateLead(req.params.id, validated);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid lead data", details: error.errors });
      }
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLead(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  app.post("/api/leads/:id/convert", async (req, res) => {
    try {
      const client = await storage.convertLeadToClient(req.params.id);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error converting lead to client:", error);
      if (error instanceof Error) {
        console.error("Stack trace:", error.stack);
      }
      if (error instanceof Error && error.message === "Lead not found") {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.status(500).json({ error: "Failed to convert lead to client", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // System Settings API
  app.get("/api/system-settings", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings?.settings || {});
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  });

  app.post("/api/system-settings", async (req, res) => {
    try {
      const validated = insertSystemSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSystemSettings(validated);
      res.json(settings.settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid settings data", details: error.errors });
      }
      console.error("Error updating system settings:", error);
      res.status(500).json({ error: "Failed to update system settings" });
    }
  });

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // ========== FINANCE API ROUTES ==========

  // Get exchange rates (cached, auto-refresh)
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const rates = await getExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  // Force refresh exchange rates (admin only)
  app.post("/api/exchange-rates/refresh", async (req, res) => {
    try {
      const rates = await refreshExchangeRates();
      if (rates) {
        res.json(rates);
      } else {
        res.status(500).json({ error: "Failed to refresh exchange rates" });
      }
    } catch (error) {
      console.error("Error refreshing exchange rates:", error);
      res.status(500).json({ error: "Failed to refresh exchange rates" });
    }
  });

  // Convert currency amount
  app.get("/api/convert-currency", async (req, res) => {
    try {
      const { amount, from, to } = req.query;
      if (!amount || !from || !to) {
        return res.status(400).json({ error: "Missing required parameters: amount, from, to" });
      }
      const converted = await convertCurrency(Number(amount), String(from), String(to));
      res.json({ original: Number(amount), from, to, converted });
    } catch (error) {
      console.error("Error converting currency:", error);
      res.status(500).json({ error: "Failed to convert currency" });
    }
  });

  // Get all transactions (with optional filters)
  app.get("/api/transactions", requireAdmin, async (req, res) => {
    try {
      const { type, month, year, clientId, employeeId } = req.query;
      const transactions = await storage.getTransactions({
        type: type as string,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        clientId: clientId as string,
        employeeId: employeeId as string,
      });
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Create transaction
  app.post("/api/transactions", requireAdmin, async (req, res) => {
    try {
      const validated = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validated);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      }
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // Update transaction
  app.patch("/api/transactions/:id", requireAdmin, async (req, res) => {
    try {
      const validated = insertTransactionSchema.partial().parse(req.body);
      const updated = await storage.updateTransaction(req.params.id as string, validated);
      if (!updated) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      }
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // Delete transaction
  app.delete("/api/transactions/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteTransaction(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Get client payments
  app.get("/api/client-payments", requireAdmin, async (req, res) => {
    try {
      const { clientId, month, year } = req.query;
      const payments = await storage.getClientPayments({
        clientId: clientId as string,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      });
      res.json(payments);
    } catch (error) {
      console.error("Error fetching client payments:", error);
      res.status(500).json({ error: "Failed to fetch client payments" });
    }
  });

  // Create client payment (also creates income transaction)
  app.post("/api/client-payments", requireAdmin, async (req, res) => {
    try {
      const validated = insertClientPaymentSchema.parse(req.body);
      const payment = await storage.createClientPayment(validated);
      
      // Auto-create income transaction
      await storage.createTransaction({
        description: `Client Payment - ${payment.month}/${payment.year}`,
        amount: validated.amount,
        currency: validated.currency,
        type: "income",
        category: "other", // Default category, could be refined
        date: validated.paymentDate,
        relatedId: payment.id,
        relatedType: "client_payment",
        status: "completed",
        clientId: validated.clientId,
        serviceId: validated.serviceId,
        notes: validated.notes || "Auto-generated from client payment",
      });

      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      console.error("Error creating client payment:", error);
      res.status(500).json({ error: "Failed to create client payment" });
    }
  });

  // Update client payment
  app.patch("/api/client-payments/:id", requireAdmin, async (req, res) => {
    try {
      const validated = insertClientPaymentSchema.partial().parse(req.body);
      const updated = await storage.updateClientPayment(req.params.id as string, validated);
      if (!updated) {
        return res.status(404).json({ error: "Client payment not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      console.error("Error updating client payment:", error);
      res.status(500).json({ error: "Failed to update client payment" });
    }
  });

  // Delete client payment
  app.delete("/api/client-payments/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteClientPayment(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ error: "Client payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client payment:", error);
      res.status(500).json({ error: "Failed to delete client payment" });
    }
  });

  // Get payroll payments
  app.get("/api/payroll-payments", requireAdmin, async (req, res) => {
    try {
      const { employeeId, month, year } = req.query;
      const payments = await storage.getPayrollPayments({
        employeeId: employeeId as string,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      });
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payroll payments:", error);
      res.status(500).json({ error: "Failed to fetch payroll payments" });
    }
  });

  // Create payroll payment (also creates expense transaction)
  app.post("/api/payroll-payments", requireAdmin, async (req, res) => {
    try {
      const validated = insertPayrollPaymentSchema.parse(req.body);
      const payment = await storage.createPayrollPayment(validated);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payroll data", details: error.errors });
      }
      console.error("Error creating payroll payment:", error);
      res.status(500).json({ error: "Failed to create payroll payment" });
    }
  });

  // Update payroll payment
  app.patch("/api/payroll-payments/:id", requireAdmin, async (req, res) => {
    try {
      const validated = insertPayrollPaymentSchema.partial().parse(req.body);
      const updated = await storage.updatePayrollPayment(req.params.id as string, validated);
      if (!updated) {
        return res.status(404).json({ error: "Payroll payment not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payroll data", details: error.errors });
      }
      console.error("Error updating payroll payment:", error);
      res.status(500).json({ error: "Failed to update payroll payment" });
    }
  });

  // Delete payroll payment
  app.delete("/api/payroll-payments/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deletePayrollPayment(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ error: "Payroll payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payroll payment:", error);
      res.status(500).json({ error: "Failed to delete payroll payment" });
    }
  });

  // Get employee salaries
  app.get("/api/employee-salaries", requireAdmin, async (req, res) => {
    try {
      const salaries = await storage.getEmployeeSalaries();
      res.json(salaries);
    } catch (error) {
      console.error("Error fetching employee salaries:", error);
      res.status(500).json({ error: "Failed to fetch employee salaries" });
    }
  });

  // Get or create employee salary
  app.get("/api/employee-salaries/:employeeId", requireAdmin, async (req, res) => {
    try {
      const employeeId = Array.isArray(req.params.employeeId) ? req.params.employeeId[0] : req.params.employeeId;
      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID is required" });
      }
      const salary = await storage.getEmployeeSalary(employeeId);
      res.json(salary);
    } catch (error) {
      console.error("Error fetching employee salary:", error);
      res.status(500).json({ error: "Failed to fetch employee salary" });
    }
  });

  // Update/create employee salary
  app.put("/api/employee-salaries/:employeeId", requireAdmin, async (req, res) => {
    try {
      const employeeId = Array.isArray(req.params.employeeId) ? req.params.employeeId[0] : req.params.employeeId;
      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID is required" });
      }
      const validated = insertEmployeeSalarySchema.partial().parse(req.body);
      const salary = await storage.upsertEmployeeSalary(employeeId, validated);
      res.json(salary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid salary data", details: error.errors });
      }
      console.error("Error updating employee salary:", error);
      res.status(500).json({ error: "Failed to update employee salary" });
    }
  });

  // Get finance summary (totals for overview)
  app.get("/api/finance-summary", requireAdmin, async (req, res) => {
    try {
      const { month, year, displayCurrency } = req.query;
      const summary = await storage.getFinanceSummary({
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        displayCurrency: (displayCurrency as string) || "USD",
      });
      res.json(summary);
    } catch (error) {
      console.error("Error fetching finance summary:", error);
      res.status(500).json({ error: "Failed to fetch finance summary" });
    }
  });

  // ========== CALENDAR EVENTS API ROUTES ==========

  // Get all calendar events (with filters)
  app.get("/api/calendar-events", async (req, res) => {
    try {
      const { startDate, endDate, eventType, status, clientId, employeeId } = req.query;
      const events = await storage.getCalendarEvents({
        startDate: startDate as string,
        endDate: endDate as string,
        eventType: eventType as string,
        status: status as string,
        clientId: clientId as string,
        employeeId: employeeId as string,
      });
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  // Get single calendar event
  app.get("/api/calendar-events/:id", async (req, res) => {
    try {
      const event = await storage.getCalendarEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      res.status(500).json({ error: "Failed to fetch calendar event" });
    }
  });

  // Create calendar event
  app.post("/api/calendar-events", async (req, res) => {
    try {
      const validated = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(validated);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid event data", details: error.errors });
      }
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  // Update calendar event
  app.patch("/api/calendar-events/:id", async (req, res) => {
    try {
      const validated = insertCalendarEventSchema.partial().parse(req.body);
      const event = await storage.updateCalendarEvent(req.params.id, validated);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid event data", details: error.errors });
      }
      console.error("Error updating calendar event:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  // Delete calendar event
  app.delete("/api/calendar-events/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCalendarEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  // ========== NOTIFICATIONS API ROUTES ==========

  // Get all notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId, status, startDate, endDate } = req.query;
      const notificationList = await storage.getNotifications({
        userId: userId as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json(notificationList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Create notification
  app.post("/api/notifications", async (req, res) => {
    try {
      const validated = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validated);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid notification data", details: error.errors });
      }
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const success = await storage.markNotificationRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", async (req, res) => {
    try {
      const { userId } = z.object({ userId: z.string().optional() }).parse(req.body);
      const success = await storage.markAllNotificationsRead(userId || "");
      res.json({ success });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Snooze notification
  app.patch("/api/notifications/:id/snooze", async (req, res) => {
    try {
      const { snoozedUntil } = z.object({ snoozedUntil: z.string() }).parse(req.body);
      const success = await storage.snoozeNotification(req.params.id, snoozedUntil);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid snooze data", details: error.errors });
      }
      console.error("Error snoozing notification:", error);
      res.status(500).json({ error: "Failed to snooze notification" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNotification(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // =====================
  // Work Sessions API
  // =====================

  // Get work sessions with filters
  app.get("/api/work-sessions", async (req, res) => {
    try {
      const { employeeId, date, startDate, endDate, status } = req.query;
      const sessions = await storage.getWorkSessions({
        employeeId: employeeId as string,
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string,
      });
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching work sessions:", error);
      res.status(500).json({ error: "Failed to fetch work sessions" });
    }
  });

  // Get today's session for an employee
  app.get("/api/work-sessions/today/:employeeId", async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      let session = await storage.getWorkSessionByEmployeeAndDate(req.params.employeeId, today);
      
      if (!session) {
        // Create a new session for today if none exists
        session = await storage.createWorkSession({
          employeeId: req.params.employeeId,
          date: today,
          status: "not_started",
          segments: [],
          totalDuration: 0,
          breakDuration: 0,
        });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching today's work session:", error);
      res.status(500).json({ error: "Failed to fetch today's work session" });
    }
  });

  // Start work
  app.post("/api/work-sessions/:id/start", async (req, res) => {
    try {
      const session = await storage.getWorkSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.status !== "not_started") {
        return res.status(400).json({ error: "Session already started" });
      }

      const now = new Date().toISOString();
      const segments = [{ type: "work", startAt: now }];
      
      const updated = await storage.updateWorkSession(req.params.id, {
        startTime: new Date(),
        status: "working",
        segments: segments,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error starting work:", error);
      res.status(500).json({ error: "Failed to start work" });
    }
  });

  // Take break
  app.post("/api/work-sessions/:id/break", async (req, res) => {
    try {
      const { breakType, note } = z.object({
        breakType: z.enum(["short", "long", "lunch", "meeting", "other"]).optional(),
        note: z.string().optional()
      }).parse(req.body);
      
      const session = await storage.getWorkSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.status !== "working") {
        return res.status(400).json({ error: "Cannot take break when not working" });
      }

      const now = new Date().toISOString();
      const segments = (session.segments as any[]) || [];
      
      // End current work segment
      if (segments.length > 0 && segments[segments.length - 1].type === "work" && !segments[segments.length - 1].endAt) {
        segments[segments.length - 1].endAt = now;
      }
      
      // Start break segment
      segments.push({
        type: "break",
        breakType: breakType || "short",
        note: note || undefined,
        startAt: now,
      });

      // Calculate current totals
      const totals = calculateTotals(segments);
      
      const updated = await storage.updateWorkSession(req.params.id, {
        status: "on_break",
        segments: segments,
        totalDuration: totals.workSeconds,
        breakDuration: totals.breakSeconds,
      });
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid break data", details: error.errors });
      }
      console.error("Error taking break:", error);
      res.status(500).json({ error: "Failed to take break" });
    }
  });

  // Resume work
  app.post("/api/work-sessions/:id/resume", async (req, res) => {
    try {
      const session = await storage.getWorkSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.status !== "on_break") {
        return res.status(400).json({ error: "Cannot resume when not on break" });
      }

      const now = new Date().toISOString();
      const segments = (session.segments as any[]) || [];
      
      // End current break segment
      if (segments.length > 0 && segments[segments.length - 1].type === "break" && !segments[segments.length - 1].endAt) {
        segments[segments.length - 1].endAt = now;
      }
      
      // Start new work segment
      segments.push({ type: "work", startAt: now });

      // Calculate current totals
      const totals = calculateTotals(segments);
      
      const updated = await storage.updateWorkSession(req.params.id, {
        status: "working",
        segments: segments,
        totalDuration: totals.workSeconds,
        breakDuration: totals.breakSeconds,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error resuming work:", error);
      res.status(500).json({ error: "Failed to resume work" });
    }
  });

  // End day
  app.post("/api/work-sessions/:id/end", async (req, res) => {
    try {
      const session = await storage.getWorkSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.status === "not_started" || session.status === "ended") {
        return res.status(400).json({ error: "Cannot end this session" });
      }

      const now = new Date().toISOString();
      const segments = (session.segments as any[]) || [];
      
      // End current segment (work or break)
      if (segments.length > 0 && !segments[segments.length - 1].endAt) {
        segments[segments.length - 1].endAt = now;
      }

      // Calculate final totals
      const totals = calculateTotals(segments);
      
      const updated = await storage.updateWorkSession(req.params.id, {
        endTime: new Date(),
        status: "ended",
        segments: segments,
        totalDuration: totals.workSeconds,
        breakDuration: totals.breakSeconds,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error ending day:", error);
      res.status(500).json({ error: "Failed to end day" });
    }
  });

  // Admin: Reopen a session (allow employee to continue)
  app.post("/api/work-sessions/:id/reopen", async (req, res) => {
    try {
      const session = await storage.getWorkSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.status !== "ended") {
        return res.status(400).json({ error: "Can only reopen ended sessions" });
      }

      const now = new Date().toISOString();
      const segments = (session.segments as any[]) || [];
      
      // Start new work segment
      segments.push({ type: "work", startAt: now });
      
      const updated = await storage.updateWorkSession(req.params.id, {
        endTime: null,
        status: "working",
        segments: segments,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error reopening session:", error);
      res.status(500).json({ error: "Failed to reopen session" });
    }
  });

  return httpServer;
}

// Helper function to calculate work and break totals
function calculateTotals(segments: any[]): { workSeconds: number; breakSeconds: number } {
  let workSeconds = 0;
  let breakSeconds = 0;
  const now = new Date().getTime();

  for (const segment of segments) {
    const startTime = new Date(segment.startAt).getTime();
    const endTime = segment.endAt ? new Date(segment.endAt).getTime() : now;
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    if (segment.type === "work") {
      workSeconds += durationSeconds;
    } else if (segment.type === "break") {
      breakSeconds += durationSeconds;
    }
  }

  return { workSeconds, breakSeconds };
}
