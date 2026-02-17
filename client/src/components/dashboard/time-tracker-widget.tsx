import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Play,
  Pause,
  Coffee,
  Square,
  Timer,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface WorkSession {
  id: string;
  employeeId: string;
  date: string;
  status: "not_started" | "working" | "on_break" | "ended";
  startTime: string | null;
  endTime: string | null;
  segments: any[];
  totalDuration: number;
  breakDuration: number;
}

type BreakType = "lunch" | "short" | "meeting" | "other";

export function TimeTrackerWidget() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<BreakType>("short");
  const [breakNote, setBreakNote] = useState("");

  const t = {
    ar: {
      title: "متتبع الوقت",
      notStarted: "لم يبدأ بعد",
      working: "جاري العمل",
      onBreak: "في استراحة",
      ended: "انتهى اليوم",
      startWork: "بدء العمل",
      takeBreak: "استراحة",
      resume: "استئناف",
      endDay: "إنهاء اليوم",
      workTime: "وقت العمل",
      breakTime: "وقت الاستراحة",
      totalTime: "الوقت الكلي",
      breakTypes: {
        lunch: "استراحة غداء",
        short: "استراحة قصيرة",
        meeting: "اجتماع",
        other: "أخرى",
      },
      breakModalTitle: "اختر نوع الاستراحة",
      breakModalDesc: "حدد سبب استراحتك",
      noteLabel: "ملاحظة (اختياري)",
      confirm: "تأكيد",
      cancel: "إلغاء",
      loading: "جاري التحميل...",
    },
    en: {
      title: "Time Tracker",
      notStarted: "Not Started",
      working: "Working",
      onBreak: "On Break",
      ended: "Day Ended",
      startWork: "Start Work",
      takeBreak: "Take Break",
      resume: "Resume",
      endDay: "End Day",
      workTime: "Work Time",
      breakTime: "Break Time",
      totalTime: "Total Time",
      breakTypes: {
        lunch: "Lunch Break",
        short: "Short Break",
        meeting: "Meeting",
        other: "Other",
      },
      breakModalTitle: "Select Break Type",
      breakModalDesc: "Choose the reason for your break",
      noteLabel: "Note (optional)",
      confirm: "Confirm",
      cancel: "Cancel",
      loading: "Loading...",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const { data: session, isLoading } = useQuery<WorkSession>({
    queryKey: ["/api/work-sessions/today", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/work-sessions/today/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const startWorkMutation = useMutation({
    mutationFn: async () => {
      if (!session?.id) throw new Error("No session");
      return apiRequest("POST", `/api/work-sessions/${session.id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/today"] });
      toast({ title: language === "ar" ? "تم بدء العمل" : "Work started" });
    },
    onError: () => {
      toast({ title: language === "ar" ? "حدث خطأ" : "Error", variant: "destructive" });
    },
  });

  const takeBreakMutation = useMutation({
    mutationFn: async ({ breakType, note }: { breakType: BreakType; note?: string }) => {
      if (!session?.id) throw new Error("No session");
      return apiRequest("POST", `/api/work-sessions/${session.id}/break`, { breakType, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/today"] });
      setBreakModalOpen(false);
      setBreakNote("");
      toast({ title: language === "ar" ? "تم بدء الاستراحة" : "Break started" });
    },
    onError: () => {
      toast({ title: language === "ar" ? "حدث خطأ" : "Error", variant: "destructive" });
    },
  });

  const resumeWorkMutation = useMutation({
    mutationFn: async () => {
      if (!session?.id) throw new Error("No session");
      return apiRequest("POST", `/api/work-sessions/${session.id}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/today"] });
      toast({ title: language === "ar" ? "تم استئناف العمل" : "Work resumed" });
    },
    onError: () => {
      toast({ title: language === "ar" ? "حدث خطأ" : "Error", variant: "destructive" });
    },
  });

  const endDayMutation = useMutation({
    mutationFn: async () => {
      if (!session?.id) throw new Error("No session");
      return apiRequest("POST", `/api/work-sessions/${session.id}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/today"] });
      toast({ title: language === "ar" ? "تم إنهاء اليوم" : "Day ended" });
    },
    onError: () => {
      toast({ title: language === "ar" ? "حدث خطأ" : "Error", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!session || session.status === "not_started" || session.status === "ended") {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      try {
        const segments = session.segments || [];
        let workSeconds = 0;
        const now = Date.now();

        for (const segment of segments) {
          if (segment.type === "work") {
            const start = new Date(segment.startAt).getTime();
            const end = segment.endAt ? new Date(segment.endAt).getTime() : now;
            workSeconds += Math.floor((end - start) / 1000);
          }
        }
        return workSeconds;
      } catch {
        return 0;
      }
    };

    setElapsedSeconds(calculateElapsed());

    const interval = setInterval(() => {
      if (session.status === "working") {
        setElapsedSeconds(calculateElapsed());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = () => {
    if (!session) return null;
    
    const statusColors = {
      not_started: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      working: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      on_break: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      ended: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    };

    const statusLabels = {
      not_started: content.notStarted,
      working: content.working,
      on_break: content.onBreak,
      ended: content.ended,
    };

    return (
      <Badge className={statusColors[session.status]}>
        {statusLabels[session.status]}
      </Badge>
    );
  };

  const getTotals = () => {
    return { 
      workSeconds: session?.totalDuration || 0, 
      breakSeconds: session?.breakDuration || 0 
    };
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card data-testid="card-time-tracker-widget">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {content.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totals = getTotals();
  const displaySeconds = session?.status === "working" ? elapsedSeconds : totals.workSeconds;

  return (
    <>
      <Card data-testid="card-time-tracker-widget">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {content.title}
          </CardTitle>
          {getStatusBadge()}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-4">
            <div className="text-4xl font-mono font-bold tracking-wider" data-testid="text-elapsed-time">
              {formatTime(displaySeconds)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {content.workTime}
            </p>
          </div>

          {session?.status === "ended" && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatTime(totals.workSeconds)}
                </p>
                <p className="text-xs text-muted-foreground">{content.workTime}</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {formatTime(totals.breakSeconds)}
                </p>
                <p className="text-xs text-muted-foreground">{content.breakTime}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {session?.status === "not_started" && (
              <Button
                className="flex-1"
                onClick={() => startWorkMutation.mutate()}
                disabled={startWorkMutation.isPending}
                data-testid="button-start-work"
              >
                <Play className="h-4 w-4 me-2" />
                {content.startWork}
              </Button>
            )}

            {session?.status === "working" && (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setBreakModalOpen(true)}
                  disabled={takeBreakMutation.isPending}
                  data-testid="button-take-break"
                >
                  <Coffee className="h-4 w-4 me-2" />
                  {content.takeBreak}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => endDayMutation.mutate()}
                  disabled={endDayMutation.isPending}
                  data-testid="button-end-day"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </>
            )}

            {session?.status === "on_break" && (
              <>
                <Button
                  className="flex-1"
                  onClick={() => resumeWorkMutation.mutate()}
                  disabled={resumeWorkMutation.isPending}
                  data-testid="button-resume-work"
                >
                  <Play className="h-4 w-4 me-2" />
                  {content.resume}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => endDayMutation.mutate()}
                  disabled={endDayMutation.isPending}
                  data-testid="button-end-day-break"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </>
            )}

            {session?.status === "ended" && (
              <div className="w-full text-center py-2">
                <p className="text-sm text-muted-foreground">
                  {content.ended}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={breakModalOpen} onOpenChange={setBreakModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{content.breakModalTitle}</DialogTitle>
            <DialogDescription>{content.breakModalDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup
              value={selectedBreakType}
              onValueChange={(val) => setSelectedBreakType(val as BreakType)}
              className="grid grid-cols-2 gap-3"
            >
              {(["lunch", "short", "meeting", "other"] as BreakType[]).map((type) => (
                <div key={type} className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value={type} id={`break-${type}`} />
                  <Label htmlFor={`break-${type}`} className="cursor-pointer">
                    {content.breakTypes[type]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <div className="space-y-2">
              <Label htmlFor="break-note">{content.noteLabel}</Label>
              <Textarea
                id="break-note"
                value={breakNote}
                onChange={(e) => setBreakNote(e.target.value)}
                placeholder="..."
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBreakModalOpen(false)}>
              {content.cancel}
            </Button>
            <Button
              onClick={() => takeBreakMutation.mutate({ breakType: selectedBreakType, note: breakNote || undefined })}
              disabled={takeBreakMutation.isPending}
              data-testid="button-confirm-break"
            >
              {content.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
