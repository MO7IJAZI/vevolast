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
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function clearData() {
  console.log("Starting data clearing process...");

  // 1. Clear all tables
  console.log("Clearing all data...");
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
    await db.delete(subPackages);
    await db.delete(mainPackages);
    // Note: We are deleting all users to ensure a clean slate, then re-creating the admin.
    await db.delete(users);
    
    // We are deliberately NOT deleting systemSettings and exchangeRates as these are configuration tables
    // that might be annoying to lose. But if strict "empty" is required, uncomment below:
    // await db.delete(systemSettings);
    // await db.delete(exchangeRates);
    
    console.log("All data tables cleared.");
  } catch (error) {
    console.error("Error clearing data:", error);
    process.exit(1);
  }

  // 2. Re-create Admin User
  console.log("Restoring Admin user...");
  try {
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
      console.log("Admin user restored (email: admin@vevoline.com, pass: adminadmin123).");
  } catch (error) {
    console.error("Error restoring admin user:", error);
    process.exit(1);
  }

  console.log("Data clearing completed successfully.");
  process.exit(0);
}

clearData().catch((err) => {
  console.error("❌ Fatal error in clear script:", err);
  process.exit(1);
});
