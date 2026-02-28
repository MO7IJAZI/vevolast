import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "./db";
import { users, invitations, passwordResets, clientUsers, roles, employees, ALL_PERMISSIONS } from "../shared/schema.js";
import { eq, and, gt } from "drizzle-orm";
import { sendInvitationEmail, sendPasswordResetEmail } from "./email";

const SALT_ROUNDS = 12;
const INVITE_EXPIRY_HOURS = 72;
const RESET_EXPIRY_HOURS = 24;

declare module "express-session" {
  interface SessionData {
    userId: string;
    userEmail: string;
    userRole: string; // This will now be the role NAME (e.g., 'admin', 'employee')
    userRoleId: string; // New field
    userName: string;
    userPermissions: string[];
    isClientUser?: boolean;
    clientId?: string;
  }
}

// Generate all permissions array for Admin
export const getAllPermissions = () => {
  const permissions: string[] = [];
  // Ensure we are working with an object before iterating
  if (ALL_PERMISSIONS && typeof ALL_PERMISSIONS === 'object') {
    Object.entries(ALL_PERMISSIONS).forEach(([resource, actions]) => {
      // @ts-ignore
      if (Array.isArray(actions)) {
        actions.forEach(action => {
          permissions.push(`${resource}:${action}`);
        });
      }
    });
  }
  return permissions;
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

function normalizePermissions(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return Array.from(new Set(input.filter((p) => typeof p === "string")));
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return normalizePermissions(parsed);
    } catch {
      return [];
    }
  }
  if (typeof input === "object") {
    const out: string[] = [];
    for (const [resource, actions] of Object.entries(input)) {
      if (Array.isArray(actions)) {
        for (const a of actions) {
          if (typeof a === "string") out.push(`${resource}:${a}`);
        }
      }
    }
    return Array.from(new Set(out));
  }
  return [];
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

export function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized: Please log in again" });
  }
  if (!req.session.isClientUser) {
    return res.status(403).json({ error: "Forbidden: Client access required" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized: Please log in again" });
  }
  // Always verify role from DB to avoid stale session role
  db.select().from(users).where(eq(users.id, req.session.userId)).limit(1)
    .then(async (found) => {
      const user = found[0];
      if (!user || !user.isActive) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Unauthorized" });
      }
      let isAdmin = false;
      if (user.roleId) {
        const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
        isAdmin = role?.name === "admin";
      }
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      // Optionally keep session in sync
      req.session.userRole = "admin";
      next();
    })
    .catch(() => res.status(500).json({ error: "Auth check failed" }));
}

export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.session.isClientUser) {
      return res.status(403).json({ error: "Staff access required" });
    }

    try {
      // Load fresh user and role to avoid stale session permissions
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (!user || !user.isActive) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Unauthorized" });
      }

      let roleName = "employee";
      let rolePermissions: string[] = [];
      if (user.roleId) {
        const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
        if (role) {
          roleName = role.name;
          rolePermissions = normalizePermissions(role.permissions);
        }
      }
      if (roleName === "admin") {
        // Keep session synced for UI checks
        req.session.userRole = "admin";
        req.session.userPermissions = getAllPermissions();
        return next();
      }

      const userSpecific = normalizePermissions(user.permissions);
      const allPermissions = Array.from(new Set([...(rolePermissions || []), ...userSpecific]));
      // Keep session synced for UI checks
      req.session.userRole = roleName;
      req.session.userRoleId = user.roleId || "";
      req.session.userPermissions = allPermissions;

      const requiredPermission = `${resource}:${action}`;
      // If action is "view", allow access if the user has ANY permission on the same resource
      if (action === "view") {
        const hasAnyOnResource = allPermissions.some((p) => typeof p === "string" && p.startsWith(`${resource}:`));
        if (hasAnyOnResource) {
          return next();
        }
      }
      if (!allPermissions.includes(requiredPermission)) {
        return res.status(403).json({ error: `Permission denied: ${requiredPermission}` });
      }
      next();
    } catch (e) {
      return res.status(500).json({ error: "Auth check failed" });
    }
  };
}

export async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminEmail || !adminPassword) {
    console.log("⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seed.");
    return;
  }
  
  try {
    // 1. Ensure Admin Role Exists
    let [adminRole] = await db.select().from(roles).where(eq(roles.name, "admin")).limit(1);
    
    if (!adminRole) {
      const allPerms = getAllPermissions();
      const roleId = crypto.randomUUID();
      await db.insert(roles).values({
        id: roleId,
        name: "admin",
        nameAr: "مدير النظام",
        description: "Full access to all system features",
        permissions: allPerms,
        isSystem: true,
      });
      [adminRole] = await db.select().from(roles).where(eq(roles.id, roleId));
      console.log("✅ Admin Role created");
    } else {
       // Update admin permissions to ensure they have everything if new permissions were added
       const allPerms = getAllPermissions();
       await db.update(roles).set({ permissions: allPerms }).where(eq(roles.id, adminRole.id));
    }

    // 2. Ensure Employee Role Exists (Default)
    let [employeeRole] = await db.select().from(roles).where(eq(roles.name, "employee")).limit(1);
    if (!employeeRole) {
       await db.insert(roles).values({
        id: crypto.randomUUID(),
        name: "employee",
        nameAr: "موظف",
        description: "Basic employee access",
        permissions: [],
        isSystem: true,
      });
      console.log("✅ Employee Role created");
    }

    // 3. Ensure Admin User Exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    if (existingAdmin.length === 0) {
      const hashedPassword = await hashPassword(adminPassword);
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: adminEmail,
        password: hashedPassword,
        name: "Admin User",
        nameEn: "Admin User",
        roleId: adminRole.id,
        permissions: [],
        department: "admin",
        isActive: true,
      });
      console.log("✅ Admin user created successfully:", adminEmail);
    } else {
      // Update admin to link to the admin role if not already
      await db.update(users)
        .set({ 
           roleId: adminRole.id
        })
        .where(eq(users.id, existingAdmin[0].id));
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
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
      
      // Compare passwords - try to handle potential issues
      try {
        const isValid = await comparePassword(password, user.password);
        
        if (!isValid) {
          return res.status(401).json({ error: "WRONG_PASSWORD" });
        }
      } catch (err) {
        console.error("Password comparison error:", err);
        return res.status(500).json({ error: "Internal auth error" });
      }
      
      await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));
      
      // Fetch Role
      let roleName = "employee";
      let rolePermissions: string[] = [];
      
      if (user.roleId) {
        const [foundRole] = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
        if (foundRole) {
          roleName = foundRole.name;
          rolePermissions = (foundRole.permissions as string[]) || [];
        }
      }
      
      // Combine role permissions + user specific permissions
      const rolePermissionsList = Array.isArray(rolePermissions) ? rolePermissions : [];
      const userSpecificPermissions = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];
      const allPermissions = Array.from(new Set([...rolePermissionsList, ...userSpecificPermissions]));
      
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = roleName;
      req.session.userRoleId = user.roleId || "";
      req.session.userName = user.name;
      req.session.userPermissions = allPermissions;
      req.session.isClientUser = false;
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        nameEn: user.nameEn,
        role: roleName,
        roleId: user.roleId,
        department: user.department,
        permissions: allPermissions,
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

      // Fetch Role
      const [userRole] = await db.select().from(roles).where(eq(roles.id, user.roleId!)).limit(1);
      
      const rolePermissions = userRole?.permissions;
      const rolePermissionsList = normalizePermissions(rolePermissions);
      
      const userPermissions = user.permissions;
      const userSpecificPermissionsList = normalizePermissions(userPermissions);
      
      const allPermissions = Array.from(new Set([...rolePermissionsList, ...userSpecificPermissionsList]));
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        nameEn: user.nameEn,
        role: userRole?.name || "employee",
        roleId: user.roleId,
        department: user.department,
        permissions: allPermissions,
        isClientUser: false,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Auth check failed" });
    }
  });

  // ===== ROLES MANAGEMENT ROUTES =====
  
  app.get("/api/roles", requireAdmin, async (req, res) => {
    try {
      const allRoles = await db.select().from(roles);
      res.json(allRoles);
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/roles", requireAdmin, async (req, res) => {
    try {
      const { name, nameAr, description, permissions } = req.body;
      
      if (!name || !nameAr) {
        return res.status(400).json({ error: "Name and Arabic Name are required" });
      }

      // Check if role name exists
      const [existing] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
      if (existing) {
        return res.status(400).json({ error: "Role name already exists" });
      }

      const roleId = crypto.randomUUID();
      await db.insert(roles).values({
        id: roleId,
        name,
        nameAr,
        description,
        permissions: normalizePermissions(permissions),
      });

      const [newRole] = await db.select().from(roles).where(eq(roles.id, roleId));
      res.json(newRole);
    } catch (error) {
      console.error("Create role error:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.put("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, nameAr, description, permissions } = req.body;

      const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      if (role.name === "admin" && name !== "admin") {
         return res.status(400).json({ error: "Cannot rename admin role" });
      }

      await db.update(roles).set({
        name, nameAr, description, permissions: normalizePermissions(permissions)
      }).where(eq(roles.id, id));

      const [updatedRole] = await db.select().from(roles).where(eq(roles.id, id));
      res.json(updatedRole);
    } catch (error) {
       console.error("Update role error:", error);
       res.status(500).json({ error: "Failed to update role" });
    }
  });
  
  app.delete("/api/roles/:id", requireAdmin, async (req, res) => {
     try {
       const { id } = req.params;
       const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
       
       if (!role) {
         return res.status(404).json({ error: "Role not found" });
       }
       if (role.isSystem) {
         return res.status(400).json({ error: "Cannot delete system roles" });
       }

       // Check if users are assigned
       const assignedUsers = await db.select().from(users).where(eq(users.roleId, id));
       if (assignedUsers.length > 0) {
         return res.status(400).json({ error: `Cannot delete role: assigned to ${assignedUsers.length} user(s)` });
       }

       // Check if employees are linked to this role (FK constraint)
       const assignedEmployees = await db.select().from(employees).where(eq(employees.roleId, id));
       if (assignedEmployees.length > 0) {
         return res.status(400).json({ error: `Cannot delete role: assigned to ${assignedEmployees.length} employee(s)` });
       }

       await db.delete(roles).where(eq(roles.id, id));
       res.json({ message: "Role deleted successfully" });
     } catch (error) {
       console.error("Delete role error:", error);
       res.status(500).json({ error: "Failed to delete role" });
     }
  });

  // Admin endpoint: normalize all roles' permissions (repair corrupted formats)
  app.post("/api/roles/normalize-permissions", requireAdmin, async (_req, res) => {
    try {
      const all = await db.select().from(roles);
      for (const r of all) {
        const normalized = normalizePermissions(r.permissions);
        await db.update(roles).set({ permissions: normalized }).where(eq(roles.id, r.id));
      }
      res.json({ message: "Roles permissions normalized", count: all.length });
    } catch (error) {
      console.error("Normalize roles error:", error);
      res.status(500).json({ error: "Failed to normalize roles" });
    }
  });

  // Admin endpoint: normalize all users' specific permissions
  app.post("/api/users/normalize-permissions", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await db.select().from(users);
      for (const u of allUsers) {
        const normalized = normalizePermissions(u.permissions);
        await db.update(users).set({ permissions: normalized }).where(eq(users.id, u.id));
      }
      res.json({ message: "Users permissions normalized", count: allUsers.length });
    } catch (error) {
      console.error("Normalize users error:", error);
      res.status(500).json({ error: "Failed to normalize users" });
    }
  });

  // Inspect effective permissions for a given user (admin only)
  app.get("/api/users/:id/permissions", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      let roleName = "employee";
      let rolePermissions: string[] = [];
      if (user.roleId) {
        const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
        if (role) {
          roleName = role.name;
          rolePermissions = normalizePermissions(role.permissions);
        }
      }
      if (roleName === "admin") {
        return res.json({ role: roleName, permissions: getAllPermissions() });
      }
      const userSpecific = normalizePermissions(user.permissions);
      const allPermissions = Array.from(new Set([...(rolePermissions || []), ...userSpecific]));
      res.json({ role: roleName, permissions: allPermissions });
    } catch (error) {
      console.error("Get user permissions error:", error);
      res.status(500).json({ error: "Failed to get permissions" });
    }
  });

  app.post("/api/auth/invite", requireAdmin, async (req, res) => {
    try {
      const { email, name, nameEn, roleId, department, employeeId, permissions } = req.body;
      
      if (!email || !name || !roleId) {
        return res.status(400).json({ error: "Email, name and role are required" });
      }
      
      const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }
      
      const token = generateToken();
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
      
      await db.insert(invitations).values({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        token,
        name,
        nameEn,
        roleId: roleId,
        permissions: permissions || [],
        department,
        employeeId,
        invitedBy: req.session.userId,
        expiresAt,
      });
      
      // We might need to fetch the role name for the email
      const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);

      const emailSent = await sendInvitationEmail(
        email.toLowerCase(),
        name,
        token,
        role?.nameAr || "Employee"
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
        roleId: invitation.roleId,
        permissions: invitation.permissions || [],
        department: invitation.department,
        employeeId: invitation.employeeId,
        isActive: true,
      });
      
      await db.update(invitations).set({ usedAt: new Date() }).where(eq(invitations.id, invitation.id));
      
      // Destroy any existing session to ensure the user must log in with new credentials
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session after setting password:", err);
        }
      });
      
      res.json({ message: "Password set successfully. Please login." });
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
      // Join with roles
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        nameEn: users.nameEn,
        roleId: users.roleId,
        roleName: roles.name,
        roleNameAr: roles.nameAr,
        department: users.department,
        employeeId: users.employeeId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));
      
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
      const { roleId, permissions } = req.body;
      
      const [user] = await db.select().from(users).where(eq(users.id, id as string)).limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updateData: { roleId?: string; permissions?: string[] } = {};
      if (roleId) updateData.roleId = roleId;
      if (permissions) updateData.permissions = permissions;
      
      await db.update(users).set(updateData).where(eq(users.id, id as string));
      
      res.json({ message: "User permissions updated" });
    } catch (error) {
      console.error("Update permissions error:", error);
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  // Include client auth routes (unchanged for now as they use clientUsers table)
  // ... (keeping client routes as is, but we need to ensure we don't delete them)
  // I will just paste the previous client auth routes here to be safe
  
  app.post("/api/client/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
      const [clientUser] = await db.select().from(clientUsers).where(eq(clientUsers.email, email.toLowerCase())).limit(1);
      if (!clientUser) return res.status(401).json({ error: "Invalid email or password" });
      if (!clientUser.isActive) return res.status(401).json({ error: "Account is deactivated" });
      const isValid = await comparePassword(password, clientUser.password);
      if (!isValid) return res.status(401).json({ error: "Invalid email or password" });
      await db.update(clientUsers).set({ lastLogin: new Date() }).where(eq(clientUsers.id, clientUser.id));
      req.session.userId = clientUser.id;
      req.session.userEmail = clientUser.email;
      req.session.userName = clientUser.clientName;
      req.session.userRole = "client";
      req.session.userPermissions = [];
      req.session.isClientUser = true;
      req.session.clientId = clientUser.clientId;
      res.json({ id: clientUser.id, email: clientUser.email, name: clientUser.clientName, nameEn: clientUser.clientNameEn, clientId: clientUser.clientId, isClientUser: true });
    } catch (error) {
      console.error("Client login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/client-users", requireAdmin, async (req, res) => {
    try {
      const { email, password, clientId, clientName, clientNameEn } = req.body;
      if (!email || !password || !clientId || !clientName) return res.status(400).json({ error: "Email, password, clientId, and clientName are required" });
      const [existingUser] = await db.select().from(clientUsers).where(eq(clientUsers.email, email.toLowerCase())).limit(1);
      if (existingUser) return res.status(400).json({ error: "Client user with this email already exists" });
      const hashedPassword = await hashPassword(password);
      const clientUserId = crypto.randomUUID();
      await db.insert(clientUsers).values({ id: clientUserId, email: email.toLowerCase(), password: hashedPassword, clientId, clientName, clientNameEn, isActive: true });
      const [newClientUser] = await db.select().from(clientUsers).where(eq(clientUsers.id, clientUserId));
      res.json({ id: newClientUser.id, email: newClientUser.email, clientId: newClientUser.clientId, clientName: newClientUser.clientName, message: "Client account created successfully" });
    } catch (error) {
      console.error("Create client user error:", error);
      res.status(500).json({ error: "Failed to create client account" });
    }
  });

  app.get("/api/client-users", requireAdmin, async (req, res) => {
    try {
      const allClientUsers = await db.select({ id: clientUsers.id, email: clientUsers.email, clientId: clientUsers.clientId, clientName: clientUsers.clientName, clientNameEn: clientUsers.clientNameEn, isActive: clientUsers.isActive, createdAt: clientUsers.createdAt, lastLogin: clientUsers.lastLogin }).from(clientUsers);
      res.json(allClientUsers);
    } catch (error) {
      console.error("Get client users error:", error);
      res.status(500).json({ error: "Failed to fetch client users" });
    }
  });

  app.get("/api/client-users/by-client/:clientId", requireAdmin, async (req, res) => {
    try {
      const { clientId } = req.params;
      const [clientUser] = await db.select({ id: clientUsers.id, email: clientUsers.email, clientId: clientUsers.clientId, clientName: clientUsers.clientName, clientNameEn: clientUsers.clientNameEn, isActive: clientUsers.isActive, createdAt: clientUsers.createdAt, lastLogin: clientUsers.lastLogin }).from(clientUsers).where(eq(clientUsers.clientId, clientId as string)).limit(1);
      if (!clientUser) return res.json(null);
      res.json(clientUser);
    } catch (error) {
      console.error("Get client user error:", error);
      res.status(500).json({ error: "Failed to fetch client user" });
    }
  });

  app.patch("/api/client-users/:id/toggle-active", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const [clientUser] = await db.select().from(clientUsers).where(eq(clientUsers.id, id as string)).limit(1);
      if (!clientUser) return res.status(404).json({ error: "Client user not found" });
      await db.update(clientUsers).set({ isActive: !clientUser.isActive }).where(eq(clientUsers.id, id as string));
      res.json({ message: "Client user status updated", isActive: !clientUser.isActive });
    } catch (error) {
      console.error("Toggle client user active error:", error);
      res.status(500).json({ error: "Failed to update client user status" });
    }
  });
}
