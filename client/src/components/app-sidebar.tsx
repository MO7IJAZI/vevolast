import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Target,
  Users,
  Package,
  FileText,
  UserCircle,
  Calendar,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ClipboardList,
  Clock,
  Shield, // Import Shield
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import logoPath from "@assets/logo.png";

const menuItems = [
  { icon: LayoutDashboard, path: "/", labelKey: "nav.dashboard", permissions: [] },
  { icon: Target, path: "/goals", labelKey: "nav.goals", permissions: ["goals:view"] },
  { icon: Users, path: "/clients", labelKey: "nav.clients", permissions: ["clients:view", "leads:view"] },
  { icon: ClipboardList, path: "/work-tracking", labelKey: "nav.workTracking", permissions: ["clients:view", "work_tracking:edit"] },
  { icon: Clock, path: "/work-sessions", labelKey: "nav.workSessions", permissions: ["employees:view", "work_tracking:edit"] },
  { icon: Package, path: "/packages", labelKey: "nav.packages", permissions: ["packages:create", "packages:edit"] },
  { icon: FileText, path: "/invoices", labelKey: "nav.invoices", permissions: ["invoices:view", "invoices:create", "invoices:edit"] },
  { icon: UserCircle, path: "/employees", labelKey: "nav.employees", permissions: ["employees:view"] },
  { icon: Shield, path: "/roles", labelKey: "nav.roles", permissions: ["roles:view"] },
  { icon: TrendingUp, path: "/sales", labelKey: "nav.sales", permissions: ["clients:view", "clients:edit"] },
  { icon: Calendar, path: "/calendar", labelKey: "nav.calendar", permissions: [] },
  { icon: DollarSign, path: "/finance", labelKey: "nav.finance", permissions: ["finance:view"] },
  { icon: Settings, path: "/settings", labelKey: "nav.settings", permissions: ["settings:view"] },
];

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { t, direction } = useLanguage();
  const { hasAnyPermission, hasResourcePermission, isAdmin } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLogoClick = () => {
    navigate("/");
  };

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter((item) => {
    // Empty permissions array means everyone can see it
    if (item.permissions.length === 0) return true;
    // Admin can see everything
    if (isAdmin) return true;
    // Check if user has any of the required permissions
    if (hasAnyPermission(...item.permissions)) return true;
    // Fallback: if user has ANY permission on the resource, show the menu
    const resources = item.permissions
      .map((p) => (typeof p === "string" && p.includes(":")) ? p.split(":")[0] : "")
      .filter(Boolean);
    return resources.some((r) => hasResourcePermission(r));
  });

  return (
    <Sidebar collapsible="icon" side={direction === "rtl" ? "right" : "left"}>
      <SidebarHeader className="p-3 border-b border-sidebar-border">
        <button
          onClick={handleLogoClick}
          className={cn(
            "flex items-center rounded-lg transition-all duration-200",
            "hover:opacity-80 active:scale-[0.98]",
            "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isCollapsed ? "justify-center" : "gap-3 px-1"
          )}
          data-testid="button-logo-home"
        >
          <img 
            src={logoPath} 
            alt="Vevoline" 
            className={cn(
              "object-contain",
              isCollapsed ? "h-8 w-8" : "h-8 w-auto"
            )} 
          />
        </button>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const isActive = location === item.path || 
                  (item.path !== "/" && location.startsWith(item.path));
                
                const buttonContent = (
                  <>
                    <item.icon className={cn(
                      "h-5 w-5 shrink-0",
                      isActive && "text-primary"
                    )} />
                    <span className={cn(
                      "transition-opacity",
                      isCollapsed && "opacity-0"
                    )}>
                      {t(item.labelKey)}
                    </span>
                  </>
                );

                const menuButton = (
                  <SidebarMenuButton
                    isActive={isActive}
                    className={cn(
                      "w-full transition-all duration-200",
                      isActive && "bg-primary/10 text-primary"
                    )}
                    onClick={() => navigate(item.path)}
                    data-testid={`nav-${item.labelKey.split('.')[1]}`}
                  >
                    {buttonContent}
                  </SidebarMenuButton>
                );

                return (
                  <SidebarMenuItem key={item.path}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {menuButton}
                        </TooltipTrigger>
                        <TooltipContent side={direction === "rtl" ? "left" : "right"}>
                          {t(item.labelKey)}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      menuButton
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center"
          data-testid="button-collapse-sidebar"
        >
          {isCollapsed ? (
            direction === "rtl" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            direction === "rtl" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
