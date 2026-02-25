import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "./db";
import { users, invitations, passwordResets, clientUsers, Permission } from "../shared/schema.js";
import { eq, and, gt } from "drizzle-orm";
import { sendInvitationEmail, sendPasswordResetEmail } from "./email";

const SALT_ROUNDS = 12;
const INVITE_EXPIRY_HOURS = 72;
const RESET_EXPIRY_HOURS = 24;

declare module "express-session" {
  interface SessionData {
    userId: string;
    userEmail: string;
    userRole: string;
    userName: string;
    userPermissions: string[];
    isClientUser?: boolean;
    clientId?: string;
  }
}

// Default permissions for each role
// All available permissions - aligned with PermissionEnum in shared/schema.ts
export const roleDefaultPermissions: Record<string, string[]> = {
  admin: [
    "view_clients", "edit_clients", "archive_clients", 
    "view_leads", "edit_leads",
    "create_packages", "edit_packages", 
    "view_invoices", "create_invoices", "edit_invoices",
    "view_goals", "edit_goals", 
    "view_finance", "edit_finance",
    "assign_employees", "edit_work_tracking", 
    "view_employees", "edit_employees",
    "view_reports"
  ],
  sales: [
    "view_clients", "edit_clients", 
    "view_leads", "edit_leads",
    "view_goals", 
    "view_packages"
  ],
  execution: [
    "view_clients", 
    "view_goals", 
    "edit_work_tracking",
    "view_packages"
  ],
  finance: [
    "view_clients", 
    "view_goals", 
    "view_finance", 
    "view_invoices", "create_invoices", "edit_invoices"
  ],
  viewer: [
    "view_clients", 
    "view_leads", 
    "view_goals",
    "view_packages"
  ],
};

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const passwordSchema = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
};

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < passwordSchema.minLength) {
    errors.push("Password must be at least 8 characters");
  }
  if (!passwordSchema.hasUppercase.test(password)) {
    errors.push("Password must contain an uppercase letter");
  }
  if (!passwordSchema.hasLowercase.test(password)) {
    errors.push("Password must contain a lowercase letter");
  }
  if (!passwordSchema.hasNumber.test(password)) {
    errors.push("Password must contain a number");
  }
  if (!passwordSchema.hasSpecial.test(password)) {
    errors.push("Password must contain a special character");
  }
  
  return { valid: errors.length === 0, errors };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized: Please log in again" });
  }
  if (req.session.isClientUser) {
    return res.status(403).json({ error: "Forbidden: Staff access required" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    console.log(`[Auth] requireAdmin failed: No active session. Session ID: ${req.sessionID}`);
    return res.status(401).json({ error: "Unauthorized: Please log in again" });
  }
  if (req.session.userRole !== "admin") {
    console.log(`[Auth] requireAdmin failed: User role is '${req.session.userRole}', expected 'admin'. User ID: ${req.session.userId}`);
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.session.isClientUser) {
      return res.status(403).json({ error: "Staff access required" });
    }
    if (req.session.userRole === "admin") {
      return next();
    }
    const userPermissions = req.session.userPermissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));
    if (!hasPermission) {
      return res.status(403).json({ error: "Permission denied" });
    }
    next();
  };
}

export function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || !req.session.isClientUser) {
    return res.status(401).json({ error: "Client authentication required" });
  }
  next();
}

export async function seedAdminUser() {
  // Use ENV secrets for admin credentials (do NOT hardcode)
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminEmail || !adminPassword) {
    console.log("⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not set in environment secrets. Skipping admin seed.");
    return;
  }
  
  try {
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    if (existingAdmin.length === 0) {
      const hashedPassword = await hashPassword(adminPassword);
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: adminEmail,
        password: hashedPassword,
        name: "أسامة أنور",
        nameEn: "Osama Anwar",
        role: "admin",
        permissions: roleDefaultPermissions.admin,
        department: "admin",
        isActive: true,
      });
      console.log("✅ Admin user created successfully:", adminEmail);
    } else {
      // Update password hash if it changed and ensure all permissions are set
      const hashedPassword = await hashPassword(adminPassword);
      await db.update(users)
        .set({ 
          password: hashedPassword,
          permissions: roleDefaultPermissions.admin,
          isActive: true,
        })
        .where(eq(users.id, existingAdmin[0].id));
      console.log("✅ Admin user updated:", adminEmail);
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}

function getUserPermissions(user: { role: string; permissions: any }): string[] {
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  return roleDefaultPermissions[user.role] || [];
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      if (!user) {
        return res.status(401).json({ error: "EMAIL_NOT_FOUND" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: "ACCOUNT_DEACTIVATED" });
      }
      
      const isValid = await comparePassword(password, user.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "WRONG_PASSWORD" });
      }
      
      await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));
      
      const permissions = getUserPermissions(user);
      
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = user.role;
      req.session.userName = user.name;
      req.session.userPermissions = permissions;
      req.session.isClientUser = false;
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        nameEn: user.nameEn,
        role: user.role,
        department: user.department,
        permissions,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      // Check if client user
      if (req.session.isClientUser) {
        const [clientUser] = await db.select().from(clientUsers).where(eq(clientUsers.id, req.session.userId)).limit(1);
        
        if (!clientUser || !clientUser.isActive) {
          req.session.destroy(() => {});
          return res.status(401).json({ error: "Not authenticated" });
        }
        
        return res.json({
          id: clientUser.id,
          email: clientUser.email,
          name: clientUser.clientName,
          nameEn: clientUser.clientNameEn,
          clientId: clientUser.clientId,
          isClientUser: true,
        });
      }
      
      // Staff user
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      
      if (!user || !user.isActive) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const permissions = getUserPermissions(user);
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        nameEn: user.nameEn,
        role: user.role,
        department: user.department,
        permissions,
        isClientUser: false,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Auth check failed" });
    }
  });

  app.post("/api/auth/invite", requireAdmin, async (req, res) => {
    try {
      const { email, name, nameEn, role, department, employeeId, permissions } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required" });
      }
      
      const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }
      
      const token = generateToken();
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
      
      const resolvedRole = role || "employee";
      const requestedPermissions = Array.isArray(permissions)
        ? permissions.filter((p: unknown) => typeof p === "string" && p.length > 0)
        : [];
      const resolvedPermissions =
        requestedPermissions.length > 0 ? requestedPermissions : roleDefaultPermissions[resolvedRole] || [];

      await db.insert(invitations).values({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        token,
        name,
        nameEn,
        role: resolvedRole,
        permissions: resolvedPermissions,
        department,
        employeeId,
        invitedBy: req.session.userId,
        expiresAt,
      });
      
      const emailSent = await sendInvitationEmail(
        email.toLowerCase(),
        name,
        token,
        resolvedRole
      );
      
      res.json({
        message: "Invitation created",
        inviteLink: `/set-password?token=${token}`,
        expiresAt,
        emailSent,
      });
    } catch (error) {
      console.error("Invite error:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/auth/invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.token, token),
            gt(invitations.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }
      
      if (invitation.usedAt) {
        return res.status(400).json({ error: "Invitation has already been used" });
      }
      
      res.json({
        email: invitation.email,
        name: invitation.name,
        nameEn: invitation.nameEn,
      });
    } catch (error) {
      console.error("Invite check error:", error);
      res.status(500).json({ error: "Failed to check invitation" });
    }
  });

  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }
      
      const validation = validatePassword(password);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid password", details: validation.errors });
      }
      
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.token, token),
            gt(invitations.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }
      
      if (invitation.usedAt) {
        return res.status(400).json({ error: "Invitation has already been used" });
      }
      
      const hashedPassword = await hashPassword(password);
      const userId = crypto.randomUUID();
      
      await db.insert(users).values({
        id: userId,
        email: invitation.email,
        password: hashedPassword,
        name: invitation.name || "",
        nameEn: invitation.nameEn,
        role: invitation.role,
        permissions: Array.isArray(invitation.permissions) && invitation.permissions.length > 0
          ? invitation.permissions
          : roleDefaultPermissions[invitation.role] || [],
        department: invitation.department,
        employeeId: invitation.employeeId,
        isActive: true,
      });
      
      await db.update(invitations).set({ usedAt: new Date() }).where(eq(invitations.id, invitation.id));
      
      // Auto-login after password set
      const permissions = Array.isArray(invitation.permissions) && invitation.permissions.length > 0
        ? invitation.permissions
        : roleDefaultPermissions[invitation.role] || [];

      req.session.userId = userId;
      req.session.userEmail = invitation.email;
      req.session.userRole = invitation.role;
      req.session.userName = invitation.name || "";
      req.session.userPermissions = permissions;
      req.session.isClientUser = false;

      res.json({ message: "Password set successfully. You can now login." });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      res.json({ message: "If this email exists, a reset link will be sent" });
      
      if (!user) return;
      
      const token = generateToken();
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);
      
      await db.insert(passwordResets).values({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        token,
        expiresAt,
      });
      
      // Try to send email, but also log reset link for testing
      const APP_URL = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`
        : process.env.APP_URL || "http://localhost:5000";
      const resetLink = `${APP_URL}/reset-password?token=${token}`;
      console.log(`\n===== PASSWORD RESET LINK =====`);
      console.log(`Email: ${email.toLowerCase()}`);
      console.log(`Link: ${resetLink}`);
      console.log(`Expires: ${expiresAt.toISOString()}`);
      console.log(`================================\n`);
      
      await sendPasswordResetEmail(email.toLowerCase(), token);
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.get("/api/auth/reset/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const [reset] = await db
        .select()
        .from(passwordResets)
        .where(
          and(
            eq(passwordResets.token, token),
            gt(passwordResets.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!reset || reset.usedAt) {
        return res.status(404).json({ error: "Invalid or expired reset link" });
      }
      
      res.json({ email: reset.email });
    } catch (error) {
      console.error("Reset check error:", error);
      res.status(500).json({ error: "Failed to check reset link" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }
      
      const validation = validatePassword(password);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid password", details: validation.errors });
      }
      
      const [reset] = await db
        .select()
        .from(passwordResets)
        .where(
          and(
            eq(passwordResets.token, token),
            gt(passwordResets.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!reset || reset.usedAt) {
        return res.status(404).json({ error: "Invalid or expired reset link" });
      }
      
      const hashedPassword = await hashPassword(password);
      
      await db.update(users).set({ password: hashedPassword }).where(eq(users.email, reset.email));
      await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));
      
      res.json({ message: "Password reset successfully. You can now login." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new passwords are required" });
      }
      
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid password", details: validation.errors });
      }
      
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const isValid = await comparePassword(currentPassword, user.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        nameEn: users.nameEn,
        role: users.role,
        department: users.department,
        employeeId: users.employeeId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      }).from(users);
      
      res.json(allUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/toggle-active", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [user] = await db.select().from(users).where(eq(users.id, id as string)).limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.id === req.session!.userId) {
        return res.status(400).json({ error: "Cannot deactivate yourself" });
      }
      
      await db.update(users).set({ isActive: !user.isActive }).where(eq(users.id, id as string));
      
      res.json({ message: "User status updated", isActive: !user.isActive });
    } catch (error) {
      console.error("Toggle user active error:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Update user role and permissions
  app.patch("/api/users/:id/permissions", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role, permissions } = req.body;
      
      const [user] = await db.select().from(users).where(eq(users.id, id as string)).limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updateData: { role?: string; permissions?: string[] } = {};
      if (role) updateData.role = role;
      if (permissions) updateData.permissions = permissions;
      
      await db.update(users).set(updateData).where(eq(users.id, id as string));
      
      res.json({ message: "User permissions updated" });
    } catch (error) {
      console.error("Update permissions error:", error);
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  // ===== CLIENT PORTAL AUTHENTICATION =====
  
  // Client login
  app.post("/api/client/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const [clientUser] = await db.select().from(clientUsers).where(eq(clientUsers.email, email.toLowerCase())).limit(1);
      
      if (!clientUser) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      if (!clientUser.isActive) {
        return res.status(401).json({ error: "Account is deactivated" });
      }
      
      const isValid = await comparePassword(password, clientUser.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      await db.update(clientUsers).set({ lastLogin: new Date() }).where(eq(clientUsers.id, clientUser.id));
      
      req.session.userId = clientUser.id;
      req.session.userEmail = clientUser.email;
      req.session.userName = clientUser.clientName;
      req.session.userRole = "client";
      req.session.userPermissions = [];
      req.session.isClientUser = true;
      req.session.clientId = clientUser.clientId;
      
      res.json({
        id: clientUser.id,
        email: clientUser.email,
        name: clientUser.clientName,
        nameEn: clientUser.clientNameEn,
        clientId: clientUser.clientId,
        isClientUser: true,
      });
    } catch (error) {
      console.error("Client login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Create client user account (admin only)
  app.post("/api/client-users", requireAdmin, async (req, res) => {
    try {
      const { email, password, clientId, clientName, clientNameEn } = req.body;
      
      if (!email || !password || !clientId || !clientName) {
        return res.status(400).json({ error: "Email, password, clientId, and clientName are required" });
      }
      
      const [existingUser] = await db.select().from(clientUsers).where(eq(clientUsers.email, email.toLowerCase())).limit(1);
      
      if (existingUser) {
        return res.status(400).json({ error: "Client user with this email already exists" });
      }
      
      const hashedPassword = await hashPassword(password);
      
      const clientUserId = crypto.randomUUID();
      await db.insert(clientUsers).values({
        id: clientUserId,
        email: email.toLowerCase(),
        password: hashedPassword,
        clientId,
        clientName,
        clientNameEn,
        isActive: true,
      });
      const [newClientUser] = await db.select().from(clientUsers).where(eq(clientUsers.id, clientUserId));
      
      res.json({
        id: newClientUser.id,
        email: newClientUser.email,
        clientId: newClientUser.clientId,
        clientName: newClientUser.clientName,
        message: "Client account created successfully",
      });
    } catch (error) {
      console.error("Create client user error:", error);
      res.status(500).json({ error: "Failed to create client account" });
    }
  });

  // Get all client users (admin only)
  app.get("/api/client-users", requireAdmin, async (req, res) => {
    try {
      const allClientUsers = await db.select({
        id: clientUsers.id,
        email: clientUsers.email,
        clientId: clientUsers.clientId,
        clientName: clientUsers.clientName,
        clientNameEn: clientUsers.clientNameEn,
        isActive: clientUsers.isActive,
        createdAt: clientUsers.createdAt,
        lastLogin: clientUsers.lastLogin,
      }).from(clientUsers);
      
      res.json(allClientUsers);
    } catch (error) {
      console.error("Get client users error:", error);
      res.status(500).json({ error: "Failed to fetch client users" });
    }
  });

  // Get client user by client ID (admin only)
  app.get("/api/client-users/by-client/:clientId", requireAdmin, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const [clientUser] = await db.select({
        id: clientUsers.id,
        email: clientUsers.email,
        clientId: clientUsers.clientId,
        clientName: clientUsers.clientName,
        clientNameEn: clientUsers.clientNameEn,
        isActive: clientUsers.isActive,
        createdAt: clientUsers.createdAt,
        lastLogin: clientUsers.lastLogin,
      }).from(clientUsers).where(eq(clientUsers.clientId, clientId as string)).limit(1);
      
      if (!clientUser) {
        return res.json(null);
      }
      
      res.json(clientUser);
    } catch (error) {
      console.error("Get client user error:", error);
      res.status(500).json({ error: "Failed to fetch client user" });
    }
  });

  // Toggle client user active status (admin only)
  app.patch("/api/client-users/:id/toggle-active", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [clientUser] = await db.select().from(clientUsers).where(eq(clientUsers.id, id as string)).limit(1);
      
      if (!clientUser) {
        return res.status(404).json({ error: "Client user not found" });
      }
      
      await db.update(clientUsers).set({ isActive: !clientUser.isActive }).where(eq(clientUsers.id, id as string));
      
      res.json({ message: "Client user status updated", isActive: !clientUser.isActive });
    } catch (error) {
      console.error("Toggle client user active error:", error);
      res.status(500).json({ error: "Failed to update client user status" });
    }
  });
}
