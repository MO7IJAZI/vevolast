import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { safeJsonParse } from "@/utils/safeJson";
import {
  Calendar as CalendarIcon,
  Search,
  RefreshCw,
  Clock,
  Play,
  Coffee,
  CheckCircle2,
  FileText,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WorkSession {
  id: string;
  employeeId: string;
  date: string;
  status: "not_started" | "working" | "on_break" | "ended";
  startAt: string | null;
  endAt: string | null;
  segments: string;
  totals: string;
  employee?: any; // Enriched from backend
}

// Timer Component
function SessionTimer({ initialMs, status, segments }: { initialMs: number, status: string, segments: any[] }) {
  const [elapsed, setElapsed] = useState(initialMs);

  useEffect(() => {
    // Helper function to calculate exact elapsed time from segments
    const calculateTotalWorkTime = () => {
      // If status is ended or not started, rely on initialMs (which comes from stored total)
      // BUT if we suspect initialMs might be stale or 0, we can recalc from segments
      if (!segments || segments.length === 0) return initialMs;

      let totalWorkMs = 0;
      const now = Date.now();

      for (const segment of segments) {
        if (segment.type === 'work') {
          const start = new Date(segment.startAt).getTime();
          const end = segment.endAt ? new Date(segment.endAt).getTime() : (status === 'working' ? now : start);
          
          // If endAt is missing and status is NOT working (e.g. paused/break), 
          // technically that segment should have an endAt. 
          // If it doesn't, it might be a data issue, or we assume it ended when the break started?
          // Actually, if status is 'on_break', the last work segment SHOULD have an endAt.
          
          totalWorkMs += (end - start);
        }
      }
      
      return totalWorkMs;
    };

    // Initial calculation
    setElapsed(calculateTotalWorkTime());

    // Only tick if currently working
    if (status !== "working") {
      return;
    }

    const interval = setInterval(() => {
      setElapsed(calculateTotalWorkTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [initialMs, status, segments]);

  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

  return (
    <span className={cn("font-mono font-medium", status === "working" ? "text-green-600 dark:text-green-400 animate-pulse" : "")}>
      {hours}h {minutes}m {<span className="text-xs text-muted-foreground">:{seconds.toString().padStart(2, '0')}s</span>}
    </span>
  );
}

export default function WorkSessionsPage() {
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { employees } = useData();
  
  // Filters
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Determine if user can see all employees
  const canViewAll = isAdmin || user?.role === "manager";

  // Fetch data
  const { data: workSessions, isLoading, refetch } = useQuery<WorkSession[]>({
    queryKey: ["/api/work-sessions", employeeFilter, statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // If user can view all, use the filter. Otherwise, the backend forces their ID anyway.
      // But for UI clarity, we can explicitly send it or just rely on backend.
      // If not admin/manager, we don't even show the filter, so 'all' here means 'my sessions' effectively.
      if (canViewAll && employeeFilter !== "all") {
        params.append("employeeId", employeeFilter);
      } else if (!canViewAll && user?.id) {
         // Optionally send my ID, though backend enforces it
         params.append("employeeId", user.id);
      }

      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter) params.append("date", dateFilter);
      
      const res = await fetch(`/api/work-sessions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch work sessions");
      return res.json();
    }
  });

  // Calculate Summary Stats
  const stats = useMemo(() => {
    if (!workSessions) return { totalHours: 0, activeCount: 0, endedCount: 0 };
    
    let totalMs = 0;
    let active = 0;
    let ended = 0;

    workSessions.forEach(session => {
      let totals: any = {};
      totals = typeof session.totals === 'string' 
        ? safeJsonParse(session.totals, {}) 
        : (session.totals || {});
      
      totalMs += (totals.totalWorkingMs || 0);
      
      if (session.status === "working" || session.status === "on_break") active++;
      if (session.status === "ended") ended++;
    });

    const totalHours = totalMs / (1000 * 60 * 60);
    
    return {
      totalHours,
      activeCount: active,
      endedCount: ended
    };
  }, [workSessions]);

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const t = {
    ar: {
      title: "تقرير جلسات العمل",
      subtitle: "عرض وتحليل ساعات عمل الموظفين",
      refresh: "تحديث",
      employee: "الموظف",
      date: "التاريخ",
      status: "الحالة",
      startTime: "وقت البدء",
      endTime: "وقت الانتهاء",
      totalHours: "إجمالي الساعات",
      actions: "إجراءات",
      filterEmployee: "تصفية حسب الموظف",
      filterStatus: "تصفية حسب الحالة",
      allEmployees: "جميع الموظفين",
      allStatuses: "جميع الحالات",
      searchDate: "بحث بالتاريخ",
      noData: "لا توجد جلسات عمل مطابقة",
      working: "يعمل الآن",
      onBreak: "في استراحة",
      ended: "منتهي",
      notStarted: "لم يبدأ",
      totalLogged: "إجمالي الساعات المسجلة",
      activeSessions: "جلسات نشطة",
      completedSessions: "جلسات مكتملة",
    },
    en: {
      title: "Work Sessions Report",
      subtitle: "View and analyze employee work hours",
      refresh: "Refresh",
      employee: "Employee",
      date: "Date",
      status: "Status",
      startTime: "Start Time",
      endTime: "End Time",
      totalHours: "Total Hours",
      actions: "Actions",
      filterEmployee: "Filter by Employee",
      filterStatus: "Filter by Status",
      allEmployees: "All Employees",
      allStatuses: "All Statuses",
      searchDate: "Search by Date",
      noData: "No matching work sessions found",
      working: "Working",
      onBreak: "On Break",
      ended: "Ended",
      notStarted: "Not Started",
      totalLogged: "Total Hours Logged",
      activeSessions: "Active Sessions",
      completedSessions: "Completed Sessions",
    }
  };

  const content = language === "ar" ? t.ar : t.en;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
          <p className="text-muted-foreground">{content.subtitle}</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {content.refresh}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {content.totalLogged}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {content.activeSessions}
            </CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {content.completedSessions}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.endedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            {canViewAll && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{content.filterEmployee}</label>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={content.allEmployees} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{content.allEmployees}</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{language === 'ar' ? emp.name : emp.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{content.filterStatus}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={content.allStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{content.allStatuses}</SelectItem>
                  <SelectItem value="working">{content.working}</SelectItem>
                  <SelectItem value="on_break">{content.onBreak}</SelectItem>
                  <SelectItem value="ended">{content.ended}</SelectItem>
                  <SelectItem value="not_started">{content.notStarted}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{content.searchDate}</label>
              <Input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setEmployeeFilter("all");
                  setStatusFilter("all");
                  setDateFilter("");
                }}
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{content.employee}</TableHead>
              <TableHead className="text-start">{content.date}</TableHead>
              <TableHead className="text-start">{content.status}</TableHead>
              <TableHead className="text-start">{content.startTime}</TableHead>
              <TableHead className="text-start">{content.endTime}</TableHead>
              <TableHead className="text-start">{content.totalHours}</TableHead>
              <TableHead className="text-end">{content.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array(5).fill(0).map((_, i) => (
                 <TableRow key={i}>
                   <TableCell><div className="h-8 bg-muted rounded animate-pulse" /></TableCell>
                   <TableCell><div className="h-8 bg-muted rounded animate-pulse" /></TableCell>
                   <TableCell><div className="h-8 bg-muted rounded animate-pulse" /></TableCell>
                   <TableCell><div className="h-8 bg-muted rounded animate-pulse" /></TableCell>
                   <TableCell><div className="h-8 bg-muted rounded animate-pulse" /></TableCell>
                   <TableCell><div className="h-8 bg-muted rounded animate-pulse" /></TableCell>
                   <TableCell><div className="h-8 bg-muted rounded animate-pulse" /></TableCell>
                 </TableRow>
               ))
            ) : workSessions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {content.noData}
                </TableCell>
              </TableRow>
            ) : (
              workSessions?.map((session) => {
                const employee = session.employee || employees.find(e => e.id === session.employeeId);
                
                let totals: any = {};
                totals = typeof session.totals === 'string' 
                  ? safeJsonParse(session.totals, {}) 
                  : (session.totals || {});

                const totalMs = (totals.totalWorkingMs || 0);
                const segments = typeof session.segments === 'string'
                  ? safeJsonParse(session.segments, [])
                  : (session.segments || []);

                // Get Start Time and End Time
                // Use session.startAt / session.endAt or derive from segments
                // The interface has startAt/endAt. Let's try to use those first.
                // If null, try to find from segments.
                let startTimeDisplay = "-";
                let endTimeDisplay = "-";
                
                if (session.startAt) {
                  startTimeDisplay = format(new Date(session.startAt), "hh:mm a");
                } else if (segments.length > 0) {
                   const first = segments[0] as any;
                   if (first && first.startAt) {
                     startTimeDisplay = format(new Date(first.startAt), "hh:mm a");
                   }
                }

                if (session.endAt) {
                  endTimeDisplay = format(new Date(session.endAt), "hh:mm a");
                } else if (session.status === 'ended' && segments.length > 0) {
                   const last = segments[segments.length - 1] as any;
                   if (last && last.endAt) {
                     endTimeDisplay = format(new Date(last.endAt), "hh:mm a");
                   }
                }

                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <EmployeeAvatar 
                          name={employee?.name || "Unknown"} 
                          nameEn={employee?.nameEn || ""} 
                          profileImage={employee?.profileImage || undefined}
                          size="sm" 
                        />
                        <span className="font-medium">{language === 'ar' ? (employee?.name || "Unknown") : (employee?.nameEn || employee?.name || "Unknown")}</span>
                      </div>
                    </TableCell>
                    <TableCell>{session.date}</TableCell>
                    <TableCell>
                      <Badge variant={session.status === "ended" ? "secondary" : "outline"} className="gap-1">
                        {session.status === "working" && <Play className="h-3 w-3 fill-current" />}
                        {session.status === "on_break" && <Coffee className="h-3 w-3" />}
                        {session.status === "ended" && <CheckCircle2 className="h-3 w-3" />}
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {startTimeDisplay}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {endTimeDisplay}
                    </TableCell>
                    <TableCell className="font-mono">
                      <SessionTimer initialMs={totalMs} status={session.status} segments={segments} />
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
