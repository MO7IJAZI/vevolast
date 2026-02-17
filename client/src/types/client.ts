export type Currency = "TRY" | "USD" | "EUR" | "SAR";

export type ClientKind = "lead" | "confirmed";
export type ClientStage =
  | "new"
  | "contacted"
  | "negotiation"
  | "won"
  | "lost";

export type ClientStatus =
  | "active"
  | "paused"
  | "finished"
  | "archived";

export type ServiceStatus = "in_progress" | "delayed" | "completed";

export type ServiceDeliverables =
  | {
      type: "social";
      postsTotal: number; postsDone: number;
      reelsTotal: number; reelsDone: number;
      storiesTotal: number; storiesDone: number;
      reportTotal?: number; reportDone?: number;
    }
  | {
      type: "logo";
      conceptsTotal: number; conceptsDone: number;
      revisionsTotal: number; revisionsDone: number;
      finalFilesTotal: number; finalFilesDone: number;
    }
  | {
      type: "website";
      requirementsDone: boolean;
      uiDone: boolean;
      devDone: boolean;
      contentDone: boolean;
      qaDone: boolean;
      launchDone: boolean;
    }
  | {
      type: "custom";
      itemsTotal: number; itemsDone: number;
      label?: string;
    };

export type ClientService = {
  id: string;
  mainCategory: string;
  subPackage: string;
  price: number;
  currency: Currency;
  startDate: string;
  endDate: string;
  status: ServiceStatus;
  deliverables?: ServiceDeliverables;
  salesOwnerId?: string;
  assigneeIds?: string[];
  notes?: string;
  completedAt?: string;
};

export type Client = {
  id: string;
  kind: ClientKind;
  status: ClientStatus;
  stage?: ClientStage;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  country?: string;
  salesOwnerId?: string;
  accountManagerId?: string;
  createdAt: string;
  services: ClientService[];
};
