import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Client, ClientStatus } from "../types/client";

type AppStore = {
  clients: Client[];
  addClient: (c: Client) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  addServiceToClient: (clientId: string, service: Client["services"][number]) => void;
  updateService: (clientId: string, serviceId: string, patch: Partial<Client["services"][number]>) => void;
  getClientStatus: (client: Client) => ClientStatus;
};

const Ctx = createContext<AppStore | null>(null);

const seedClients: Client[] = [
  {
    id: "c1",
    kind: "confirmed",
    status: "active",
    name: "مطعم الشرق",
    company: "Al-Sharq Restaurant",
    email: "info@alsharq-restaurant.com",
    phone: "+90 532 444 5566",
    country: "Saudi",
    salesOwnerId: "e_sales_ahmed",
    accountManagerId: "e_pm_khaled",
    createdAt: "2026-01-10",
    services: [
      {
        id: "s1",
        mainCategory: "Social Media",
        subPackage: "Gold",
        price: 300,
        currency: "USD",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        status: "in_progress",
        deliverables: {
          type: "social",
          postsTotal: 20, postsDone: 6,
          reelsTotal: 10, reelsDone: 2,
          storiesTotal: 30, storiesDone: 9,
          reportTotal: 1, reportDone: 0,
        },
      },
      {
        id: "s2",
        mainCategory: "Branding",
        subPackage: "Logo",
        price: 150,
        currency: "EUR",
        startDate: "2026-01-05",
        endDate: "2026-01-20",
        status: "delayed",
        deliverables: {
          type: "logo",
          conceptsTotal: 3, conceptsDone: 1,
          revisionsTotal: 2, revisionsDone: 0,
          finalFilesTotal: 1, finalFilesDone: 0,
        },
      },
    ],
  },
];

// Pure function to compute client status from services
function computeClientStatus(client: Client): ClientStatus {
  if (client.status === "archived") return "archived";
  const hasServices = client.services.length > 0;
  const allCompleted = hasServices && client.services.every(s => s.status === "completed");
  if (allCompleted) return "finished";
  return client.status;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(seedClients);

  const api = useMemo<AppStore>(() => ({
    clients,
    
    getClientStatus: computeClientStatus,
    
    addClient: (c) => setClients((p) => [c, ...p]),
    
    updateClient: (id, patch) =>
      setClients((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    
    addServiceToClient: (clientId, service) =>
      setClients((p) =>
        p.map((c) => (c.id === clientId ? { ...c, services: [service, ...c.services] } : c))
      ),
    
    // When updating a service, also check if all services are now completed
    // and automatically update client status to "finished"
    updateService: (clientId, serviceId, patch) =>
      setClients((p) =>
        p.map((c) => {
          if (c.id !== clientId) return c;
          
          const updatedServices = c.services.map((s) => 
            s.id === serviceId ? { ...s, ...patch } : s
          );
          
          // Check if all services are now completed
          const allCompleted = updatedServices.length > 0 && 
            updatedServices.every(s => s.status === "completed");
          
          // Auto-update status to finished if all services are completed
          const newStatus = allCompleted && c.status !== "archived" ? "finished" : c.status;
          
          return {
            ...c,
            services: updatedServices,
            status: newStatus,
          };
        })
      ),
  }), [clients]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAppStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppStore must be used inside AppStoreProvider");
  return v;
}
