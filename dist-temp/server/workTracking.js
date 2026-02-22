import { db } from "./db.js";
import { randomUUID } from "crypto";
import { clientServices, serviceDeliverables, serviceReports, workActivityLogs } from "../shared/schema.js";
import { eq, inArray, desc } from "drizzle-orm";
import { requireAuth } from "./auth.js";
export function registerWorkTrackingRoutes(app) {
    // Get all client services with deliverables
    app.get("/api/work-tracking", requireAuth, async (req, res) => {
        try {
            const { clientId, status, employeeId, mainPackageId } = req.query;
            let services = await db.select().from(clientServices).orderBy(desc(clientServices.createdAt));
            // Filter by clientId
            if (clientId && typeof clientId === "string") {
                services = services.filter(s => s.clientId === clientId);
            }
            // Filter by status
            if (status && typeof status === "string") {
                services = services.filter(s => s.status === status);
            }
            // Filter by employee (sales or execution)
            if (employeeId && typeof employeeId === "string") {
                services = services.filter(s => s.salesEmployeeId === employeeId ||
                    (Array.isArray(s.executionEmployeeIds) && s.executionEmployeeIds.includes(employeeId)));
            }
            // Filter by main package
            if (mainPackageId && typeof mainPackageId === "string") {
                services = services.filter(s => s.mainPackageId === mainPackageId);
            }
            // Get deliverables for all services
            const serviceIds = services.map(s => s.id);
            let allDeliverables = [];
            if (serviceIds.length > 0) {
                allDeliverables = await db.select().from(serviceDeliverables).where(inArray(serviceDeliverables.serviceId, serviceIds));
            }
            // Combine services with their deliverables
            const servicesWithDeliverables = services.map(service => ({
                ...service,
                deliverables: allDeliverables.filter(d => d.serviceId === service.id),
                progress: calculateServiceProgress(allDeliverables.filter(d => d.serviceId === service.id)),
            }));
            res.json(servicesWithDeliverables);
        }
        catch (error) {
            console.error("Error fetching work tracking:", error);
            res.status(500).json({ error: "Failed to fetch work tracking data" });
        }
    });
    // Get work tracking services for a specific client (must be before :id route)
    app.get("/api/work-tracking/client/:clientId", requireAuth, async (req, res) => {
        try {
            const clientId = req.params.clientId;
            const services = await db.select().from(clientServices)
                .where(eq(clientServices.clientId, clientId))
                .orderBy(desc(clientServices.createdAt));
            // Get deliverables for all services
            const serviceIds = services.map(s => s.id);
            let allDeliverables = [];
            if (serviceIds.length > 0) {
                allDeliverables = await db.select().from(serviceDeliverables).where(inArray(serviceDeliverables.serviceId, serviceIds));
            }
            // Calculate progress for each service
            const servicesWithProgress = services.map(service => {
                const delivs = allDeliverables.filter(d => d.serviceId === service.id);
                const progress = calculateServiceProgress(delivs);
                return {
                    id: service.id,
                    serviceName: service.serviceName,
                    serviceNameEn: service.serviceNameEn,
                    status: service.status,
                    progress,
                };
            });
            res.json(servicesWithProgress);
        }
        catch (error) {
            console.error("Error fetching client services:", error);
            res.status(500).json({ error: "Failed to fetch client services" });
        }
    });
    // Get single service with deliverables
    app.get("/api/work-tracking/:id", requireAuth, async (req, res) => {
        try {
            const id = req.params.id;
            const [service] = await db.select().from(clientServices).where(eq(clientServices.id, id)).limit(1);
            if (!service) {
                return res.status(404).json({ error: "Service not found" });
            }
            const deliverables = await db.select().from(serviceDeliverables).where(eq(serviceDeliverables.serviceId, id));
            res.json({
                ...service,
                deliverables,
                progress: calculateServiceProgress(deliverables),
            });
        }
        catch (error) {
            console.error("Error fetching service:", error);
            res.status(500).json({ error: "Failed to fetch service" });
        }
    });
    // Create new client service with deliverables
    app.post("/api/work-tracking", requireAuth, async (req, res) => {
        try {
            const { deliverables: deliverablesList, ...serviceData } = req.body;
            const serviceId = serviceData.id ?? randomUUID();
            await db.insert(clientServices).values({ ...serviceData, id: serviceId });
            const [newService] = await db.select().from(clientServices).where(eq(clientServices.id, serviceId));
            // Insert deliverables if provided
            if (deliverablesList && deliverablesList.length > 0) {
                const deliverablesToInsert = deliverablesList.map((d) => ({
                    ...d,
                    id: randomUUID(),
                    serviceId: newService.id,
                }));
                await db.insert(serviceDeliverables).values(deliverablesToInsert);
            }
            // Fetch complete service with deliverables
            const insertedDeliverables = await db.select().from(serviceDeliverables).where(eq(serviceDeliverables.serviceId, newService.id));
            // Log activity
            await db.insert(workActivityLogs).values({
                id: randomUUID(),
                serviceId: newService.id,
                action: "created",
                newValue: JSON.stringify({ serviceName: newService.serviceName }),
            });
            res.status(201).json({
                ...newService,
                deliverables: insertedDeliverables,
                progress: calculateServiceProgress(insertedDeliverables),
            });
        }
        catch (error) {
            console.error("Error creating service:", error);
            res.status(500).json({ error: "Failed to create service" });
        }
    });
    // Update service
    app.patch("/api/work-tracking/:id", requireAuth, async (req, res) => {
        try {
            const id = req.params.id;
            const { deliverables: deliverablesList, ...updateData } = req.body;
            // Get current service for activity log
            const [currentService] = await db.select().from(clientServices).where(eq(clientServices.id, id)).limit(1);
            if (!currentService) {
                return res.status(404).json({ error: "Service not found" });
            }
            // Update service
            await db.update(clientServices)
                .set({ ...updateData, updatedAt: new Date() })
                .where(eq(clientServices.id, id));
            const [updatedService] = await db.select().from(clientServices).where(eq(clientServices.id, id));
            // Log status change if applicable
            if (updateData.status && updateData.status !== currentService.status) {
                await db.insert(workActivityLogs).values({
                    id: randomUUID(),
                    serviceId: id,
                    action: "status_changed",
                    previousValue: currentService.status,
                    newValue: updateData.status,
                });
                // If completed, set completedAt
                if (updateData.status === "completed") {
                    await db.update(clientServices)
                        .set({ completedAt: new Date() })
                        .where(eq(clientServices.id, id));
                }
            }
            // Fetch deliverables
            const serviceDeliverablesList = await db.select().from(serviceDeliverables).where(eq(serviceDeliverables.serviceId, id));
            res.json({
                ...updatedService,
                deliverables: serviceDeliverablesList,
                progress: calculateServiceProgress(serviceDeliverablesList),
            });
        }
        catch (error) {
            console.error("Error updating service:", error);
            res.status(500).json({ error: "Failed to update service" });
        }
    });
    // Update deliverable progress
    app.patch("/api/work-tracking/:serviceId/deliverables/:deliverableId", requireAuth, async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const deliverableId = req.params.deliverableId;
            const { completed } = req.body;
            // Get current deliverable
            const [currentDeliverable] = await db.select().from(serviceDeliverables)
                .where(eq(serviceDeliverables.id, deliverableId))
                .limit(1);
            if (!currentDeliverable) {
                return res.status(404).json({ error: "Deliverable not found" });
            }
            // Update deliverable
            await db.update(serviceDeliverables)
                .set({ completed, updatedAt: new Date() })
                .where(eq(serviceDeliverables.id, deliverableId));
            const [updatedDeliverable] = await db.select().from(serviceDeliverables).where(eq(serviceDeliverables.id, deliverableId));
            // Log activity
            await db.insert(workActivityLogs).values({
                id: randomUUID(),
                serviceId,
                deliverableId,
                action: "updated",
                previousValue: String(currentDeliverable.completed),
                newValue: String(completed),
            });
            // Check if all deliverables are complete
            const allDeliverables = await db.select().from(serviceDeliverables).where(eq(serviceDeliverables.serviceId, serviceId));
            const allComplete = allDeliverables.every(d => d.isBoolean ? d.completed >= 1 : d.completed >= d.target);
            // If all complete, update service status
            if (allComplete) {
                await db.update(clientServices)
                    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
                    .where(eq(clientServices.id, serviceId));
            }
            res.json(updatedDeliverable);
        }
        catch (error) {
            console.error("Error updating deliverable:", error);
            res.status(500).json({ error: "Failed to update deliverable" });
        }
    });
    // Mark service as complete
    app.post("/api/work-tracking/:id/complete", requireAuth, async (req, res) => {
        try {
            const id = req.params.id;
            await db.update(clientServices)
                .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
                .where(eq(clientServices.id, id));
            const [updatedService] = await db.select().from(clientServices).where(eq(clientServices.id, id));
            if (!updatedService) {
                return res.status(404).json({ error: "Service not found" });
            }
            // Log activity
            await db.insert(workActivityLogs).values({
                id: randomUUID(),
                serviceId: id,
                action: "completed",
                newValue: "marked_complete",
            });
            res.json(updatedService);
        }
        catch (error) {
            console.error("Error completing service:", error);
            res.status(500).json({ error: "Failed to complete service" });
        }
    });
    // Delete service
    app.delete("/api/work-tracking/:id", requireAuth, async (req, res) => {
        try {
            const id = req.params.id;
            // Delete deliverables first
            await db.delete(serviceDeliverables).where(eq(serviceDeliverables.serviceId, id));
            // Delete activity logs
            await db.delete(workActivityLogs).where(eq(workActivityLogs.serviceId, id));
            // Delete reports
            await db.delete(serviceReports).where(eq(serviceReports.serviceId, id));
            // Delete service
            await db.delete(clientServices).where(eq(clientServices.id, id));
            res.json({ message: "Service deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting service:", error);
            res.status(500).json({ error: "Failed to delete service" });
        }
    });
    // Get work tracking stats for dashboard
    app.get("/api/work-tracking/stats/summary", requireAuth, async (req, res) => {
        try {
            const allServices = await db.select().from(clientServices);
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            // Filter services completed this month
            const completedThisMonth = allServices.filter(s => {
                if (s.completedAt) {
                    const completedDate = new Date(s.completedAt);
                    return completedDate.getMonth() === currentMonth &&
                        completedDate.getFullYear() === currentYear;
                }
                return false;
            });
            // Calculate delayed services (past end date but not completed)
            const delayedServices = allServices.filter(s => {
                if (s.endDate && s.status !== "completed") {
                    return new Date(s.endDate) < now;
                }
                return false;
            });
            // Active services
            const activeServices = allServices.filter(s => s.status === "in_progress" || s.status === "not_started");
            // Get all deliverables for progress calculation
            const serviceIds = allServices.map(s => s.id);
            let allDeliverables = [];
            if (serviceIds.length > 0) {
                allDeliverables = await db.select().from(serviceDeliverables).where(inArray(serviceDeliverables.serviceId, serviceIds));
            }
            // Calculate overall progress
            let totalTarget = 0;
            let totalCompleted = 0;
            allDeliverables.forEach(d => {
                if (d.isBoolean) {
                    totalTarget += 1;
                    totalCompleted += d.completed >= 1 ? 1 : 0;
                }
                else {
                    totalTarget += d.target;
                    totalCompleted += Math.min(d.completed, d.target);
                }
            });
            const overallProgress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
            // Get recent services with their progress
            const recentServices = allServices
                .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            })
                .slice(0, 5)
                .map(service => {
                const delivs = allDeliverables.filter(d => d.serviceId === service.id);
                const svcTarget = delivs.reduce((sum, d) => sum + (d.target || 0), 0);
                const svcCompleted = delivs.reduce((sum, d) => sum + (d.completed || 0), 0);
                const progress = svcTarget > 0
                    ? Math.round((svcCompleted / svcTarget) * 100)
                    : (service.status === "completed" ? 100 : 0);
                return {
                    id: service.id,
                    serviceName: service.serviceName,
                    serviceNameEn: service.serviceNameEn,
                    status: service.status,
                    progress,
                    clientId: service.clientId,
                };
            });
            res.json({
                totalServices: allServices.length,
                completedServices: allServices.filter(s => s.status === "completed").length,
                inProgressServices: allServices.filter(s => s.status === "in_progress").length,
                notStartedServices: allServices.filter(s => s.status === "not_started").length,
                delayedServices: delayedServices.length,
                overallProgress,
                recentServices,
            });
        }
        catch (error) {
            console.error("Error fetching stats:", error);
            res.status(500).json({ error: "Failed to fetch stats" });
        }
    });
    // Get employee-specific stats
    app.get("/api/work-tracking/stats/employee/:employeeId", requireAuth, async (req, res) => {
        try {
            const employeeId = req.params.employeeId;
            const allServices = await db.select().from(clientServices);
            const now = new Date();
            // Services where employee is sales owner
            const asSalesServices = allServices.filter(s => s.salesEmployeeId === employeeId);
            // Services where employee is in execution team
            const asExecutionServices = allServices.filter(s => Array.isArray(s.executionEmployeeIds) && s.executionEmployeeIds.includes(employeeId));
            // Combined services (unique)
            const combinedServiceIds = new Set([
                ...asSalesServices.map(s => s.id),
                ...asExecutionServices.map(s => s.id)
            ]);
            const allEmployeeServices = allServices.filter(s => combinedServiceIds.has(s.id));
            // Count by status
            const completedServices = allEmployeeServices.filter(s => s.status === "completed").length;
            const inProgressServices = allEmployeeServices.filter(s => s.status === "in_progress").length;
            const notStartedServices = allEmployeeServices.filter(s => s.status === "not_started").length;
            // Delayed services
            const delayedServices = allEmployeeServices.filter(s => {
                if (s.endDate && s.status !== "completed") {
                    return new Date(s.endDate) < now;
                }
                return false;
            }).length;
            // Get deliverables for progress calculation
            const serviceIds = allEmployeeServices.map(s => s.id);
            let allDeliverables = [];
            if (serviceIds.length > 0) {
                allDeliverables = await db.select().from(serviceDeliverables).where(inArray(serviceDeliverables.serviceId, serviceIds));
            }
            // Calculate average progress
            const progressValues = allEmployeeServices.map(service => {
                const delivs = allDeliverables.filter(d => d.serviceId === service.id);
                if (delivs.length === 0)
                    return service.status === "completed" ? 100 : 0;
                const totalTarget = delivs.reduce((sum, d) => sum + (d.target || 0), 0);
                const totalCompleted = delivs.reduce((sum, d) => sum + (d.completed || 0), 0);
                return totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
            });
            const averageProgress = progressValues.length > 0
                ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
                : 0;
            // Recent services (limit 5)
            const recentServices = allEmployeeServices
                .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            })
                .slice(0, 5)
                .map(service => {
                const delivs = allDeliverables.filter(d => d.serviceId === service.id);
                const totalTarget = delivs.reduce((sum, d) => sum + (d.target || 0), 0);
                const totalCompleted = delivs.reduce((sum, d) => sum + (d.completed || 0), 0);
                const progress = totalTarget > 0
                    ? Math.round((totalCompleted / totalTarget) * 100)
                    : (service.status === "completed" ? 100 : 0);
                return {
                    id: service.id,
                    serviceName: service.serviceName,
                    serviceNameEn: service.serviceNameEn,
                    status: service.status,
                    progress,
                };
            });
            res.json({
                totalAssigned: allEmployeeServices.length,
                asSalesEmployee: asSalesServices.length,
                asExecutionEmployee: asExecutionServices.length,
                completedServices,
                inProgressServices,
                notStartedServices,
                delayedServices,
                averageProgress,
                recentServices,
            });
        }
        catch (error) {
            console.error("Error fetching employee stats:", error);
            res.status(500).json({ error: "Failed to fetch employee stats" });
        }
    });
    // Get activity log for a service
    app.get("/api/work-tracking/:id/activity", requireAuth, async (req, res) => {
        try {
            const id = req.params.id;
            const activities = await db.select().from(workActivityLogs)
                .where(eq(workActivityLogs.serviceId, id))
                .orderBy(desc(workActivityLogs.createdAt));
            res.json(activities);
        }
        catch (error) {
            console.error("Error fetching activity log:", error);
            res.status(500).json({ error: "Failed to fetch activity log" });
        }
    });
}
function calculateServiceProgress(deliverables) {
    if (deliverables.length === 0)
        return 0;
    let totalTarget = 0;
    let totalCompleted = 0;
    deliverables.forEach(d => {
        if (d.isBoolean) {
            totalTarget += 1;
            totalCompleted += d.completed >= 1 ? 1 : 0;
        }
        else {
            totalTarget += d.target;
            totalCompleted += Math.min(d.completed, d.target);
        }
    });
    return totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
}
