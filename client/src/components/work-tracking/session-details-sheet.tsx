import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { 
  Play, 
  Coffee, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeJsonParse } from "@/utils/safeJson";

interface SessionDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any | null;
}

export function SessionDetailsSheet({ open, onOpenChange, session }: SessionDetailsSheetProps) {
  const { language } = useLanguage();

  if (!session) return null;

  const segments = typeof session.segments === 'string' 
    ? safeJsonParse(session.segments, []) 
    : (session.segments || []);

  const t = {
    ar: {
      title: "تفاصيل جلسة العمل",
      date: "التاريخ",
      employee: "الموظف",
      status: "الحالة",
      totalDuration: "إجمالي العمل",
      timeline: "سجل النشاط",
      work: "عمل",
      break: "استراحة",
      started: "بدأ في",
      ended: "انتهى في",
      duration: "المدة",
      notes: "ملاحظات",
      type: "النوع",
      breakType: {
        short: "استراحة قصيرة",
        lunch: "غداء",
        meeting: "اجتماع",
        other: "أخرى"
      }
    },
    en: {
      title: "Work Session Details",
      date: "Date",
      employee: "Employee",
      status: "Status",
      totalDuration: "Total Work Duration",
      timeline: "Activity Log",
      work: "Work",
      break: "Break",
      started: "Started at",
      ended: "Ended at",
      duration: "Duration",
      notes: "Notes",
      type: "Type",
      breakType: {
        short: "Short Break",
        lunch: "Lunch",
        meeting: "Meeting",
        other: "Other"
      }
    }
  };

  const content = language === "ar" ? t.ar : t.en;
  const isRtl = language === "ar";

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "hh:mm:ss a");
  };

  const calculateDuration = (start: string, end?: string) => {
    const startDate = new Date(start).getTime();
    const endDate = end ? new Date(end).getTime() : Date.now();
    const diff = endDate - startDate;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000); // Optional seconds

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-hidden flex flex-col" side={isRtl ? "left" : "right"}>
        <SheetHeader>
          <SheetTitle>{content.title}</SheetTitle>
          <SheetDescription>
            {session.date}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex items-center gap-4">
          <EmployeeAvatar 
            name={session.employee?.name || "Unknown"} 
            nameEn={session.employee?.nameEn} 
            profileImage={session.employee?.profileImage}
            size="lg" 
          />
          <div>
            <h3 className="font-semibold text-lg">
              {language === 'ar' ? session.employee?.name : (session.employee?.nameEn || session.employee?.name)}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={session.status === "working" ? "default" : "secondary"}>
                {session.status}
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {content.timeline}
          </h4>

          <ScrollArea className="h-[400px] pr-4">
            <div className="relative pl-6 border-l-2 border-muted ml-2 space-y-8 pb-4">
              {segments.map((segment: any, index: number) => {
                const isWork = segment.type === "work";
                const Icon = isWork ? Play : Coffee;
                
                return (
                  <div key={index} className="relative">
                    {/* Timeline dot */}
                    <div className={cn(
                      "absolute -left-[31px] top-0 p-1.5 rounded-full border-2 border-background",
                      isWork ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                    )}>
                      <Icon className="h-3 w-3" />
                    </div>

                    <div className="bg-card border rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {isWork ? content.work : content.break}
                          {!isWork && segment.breakType && (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({content.breakType[segment.breakType as keyof typeof content.breakType] || segment.breakType})
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {calculateDuration(segment.startAt, segment.endAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="block text-[10px] uppercase opacity-70 mb-0.5">{content.started}</span>
                          <span className="font-mono text-foreground">{formatTime(segment.startAt)}</span>
                        </div>
                        {segment.endAt ? (
                          <div>
                            <span className="block text-[10px] uppercase opacity-70 mb-0.5">{content.ended}</span>
                            <span className="font-mono text-foreground">{formatTime(segment.endAt)}</span>
                          </div>
                        ) : (
                          <div className="flex items-end">
                            <Badge variant="outline" className="animate-pulse border-green-500 text-green-600 h-5 px-1.5 text-[10px]">
                              Active
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {segment.note && (
                        <div className="mt-2 pt-2 border-t text-xs italic text-muted-foreground">
                          "{segment.note}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {segments.length === 0 && (
                <div className="text-sm text-muted-foreground italic pl-2">
                  No activity recorded yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
