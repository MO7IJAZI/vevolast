import { Express, Request, Response } from "express";
import { requireClientAuth } from "./auth";
import { db } from "./db";
import { clientServices, serviceDeliverables } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export function registerClientPortalRoutes(app: Express) {
  // Get client's services (work tracking)
  app.get("/api/client/services", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId;
      
      if (!clientId) {
        return res.status(400).json({ error: "Client ID not found in session" });
      }
      
      const services = await db.select().from(clientServices).where(eq(clientServices.clientId, clientId));
      
      // Get deliverables for each service
      const servicesWithDeliverables = await Promise.all(
        services.map(async (service) => {
          const deliverables = await db
            .select()
            .from(serviceDeliverables)
            .where(eq(serviceDeliverables.serviceId, service.id));
          
          // Calculate progress based on target/completed values
          const totalTarget = deliverables.reduce((sum, d) => sum + d.target, 0);
          const totalCompleted = deliverables.reduce((sum, d) => sum + d.completed, 0);
          const progress = totalTarget > 0 
            ? Math.round((totalCompleted / totalTarget) * 100) 
            : 0;
          
          return {
            id: service.id,
            serviceName: service.serviceName,
            serviceNameEn: service.serviceNameEn,
            status: service.status,
            startDate: service.startDate,
            endDate: service.endDate,
            progress,
            totalDeliverables: deliverables.length,
            completedDeliverables: deliverables.filter(d => d.completed >= d.target).length,
            deliverables: deliverables.map(d => ({
              id: d.id,
              key: d.key,
              labelAr: d.labelAr,
              labelEn: d.labelEn,
              target: d.target,
              completed: d.completed,
              icon: d.icon,
              isBoolean: d.isBoolean,
            })),
          };
        })
      );
      
      res.json(servicesWithDeliverables);
    } catch (error) {
      console.error("Get client services error:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Get client's service summary (for dashboard)
  app.get("/api/client/services/summary", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId;
      
      if (!clientId) {
        return res.status(400).json({ error: "Client ID not found in session" });
      }
      
      const services = await db.select().from(clientServices).where(eq(clientServices.clientId, clientId));
      
      let totalProgress = 0;
      let totalDeliverables = 0;
      let completedDeliverables = 0;
      
      await Promise.all(
        services.map(async (service) => {
          const deliverables = await db
            .select()
            .from(serviceDeliverables)
            .where(eq(serviceDeliverables.serviceId, service.id));
          
          totalDeliverables += deliverables.reduce((sum, d) => sum + d.target, 0);
          completedDeliverables += deliverables.reduce((sum, d) => sum + d.completed, 0);
        })
      );
      
      const overallProgress = totalDeliverables > 0 
        ? Math.round((completedDeliverables / totalDeliverables) * 100) 
        : 0;
      
      const summary = {
        totalServices: services.length,
        inProgress: services.filter(s => s.status === "in_progress").length,
        completed: services.filter(s => s.status === "completed").length,
        notStarted: services.filter(s => s.status === "not_started").length,
        delayed: services.filter(s => s.status === "delayed").length,
        overallProgress,
        totalDeliverables,
        completedDeliverables,
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Get client services summary error:", error);
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  // Get client's invoices (placeholder - will integrate with actual invoices when available)
  app.get("/api/client/invoices", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId;
      
      if (!clientId) {
        return res.status(400).json({ error: "Client ID not found in session" });
      }
      
      // Return empty array for now - will be populated from DataContext invoices
      res.json([]);
    } catch (error) {
      console.error("Get client invoices error:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });
}
