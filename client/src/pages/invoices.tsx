import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";

export default function InvoicesPage() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();

  if (!isAdmin) {
    setLocation("/");
    return null;
  }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoices] = useState<any[]>([]);

  const content = {
    ar: {
      title: "الفواتير",
      emptyTitle: "لا توجد فواتير بعد",
      emptySubtitle: "أنشئ فواتير احترافية لعملائك وتتبع المدفوعات",
      createInvoice: "إنشاء فاتورة",
      createFirstInvoice: "أنشئ أول فاتورة",
      clientName: "اسم العميل",
      amount: "المبلغ",
      dueDate: "تاريخ الاستحقاق",
      save: "حفظ",
      cancel: "إلغاء",
    },
    en: {
      title: "Invoices",
      emptyTitle: "No invoices yet",
      emptySubtitle: "Create professional invoices for your clients and track payments",
      createInvoice: "Create Invoice",
      createFirstInvoice: "Create first invoice",
      clientName: "Client Name",
      amount: "Amount",
      dueDate: "Due Date",
      save: "Save",
      cancel: "Cancel",
    },
  };

  const t = content[language];

  if (invoices.length === 0) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <Button onClick={() => setIsModalOpen(true)} data-testid="button-create-invoice">
            <Plus className="h-4 w-4 me-2" />
            {t.createInvoice}
          </Button>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t.emptyTitle}</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {t.emptySubtitle}
            </p>
            <Button onClick={() => setIsModalOpen(true)} data-testid="button-create-first-invoice">
              <Plus className="h-4 w-4 me-2" />
              {t.createFirstInvoice}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.createInvoice}</DialogTitle>
              <DialogDescription>
                {language === "ar" ? "أنشئ فاتورة جديدة" : "Create a new invoice"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t.clientName}</Label>
                <Input placeholder={t.clientName} data-testid="input-client-name" />
              </div>
              <div className="space-y-2">
                <Label>{t.amount}</Label>
                <Input type="number" placeholder="0" data-testid="input-amount" />
              </div>
              <div className="space-y-2">
                <Label>{t.dueDate}</Label>
                <DateInput data-testid="input-due-date" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                {t.cancel}
              </Button>
              <Button data-testid="button-save-invoice">{t.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Button onClick={() => setIsModalOpen(true)} data-testid="button-create-invoice">
          <Plus className="h-4 w-4 me-2" />
          {t.createInvoice}
        </Button>
      </div>
    </div>
  );
}
