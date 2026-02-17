import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppStoreProvider } from "@/store/appStore";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import Dashboard from "@/pages/dashboard";
import GoalsPage from "@/pages/goals";
import ClientsPage from "@/pages/clients";
import PackagesPage from "@/pages/packages";
import InvoicesPage from "@/pages/invoices";
import EmployeesPage from "@/pages/employees";
import CalendarPage from "@/pages/calendar";
import FinancePage from "@/pages/finance";
import SettingsPage from "@/pages/settings";
import SalesPage from "@/pages/sales";
import WorkTrackingPage from "@/pages/work-tracking";
import LoginPage from "@/pages/login";
import SetPasswordPage from "@/pages/set-password";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import ClientLoginPage from "@/pages/client-login";
import ClientDashboardPage from "@/pages/client-dashboard";
import NotFound from "@/pages/not-found";
import { Loader2, ShieldAlert, AlertCircle } from "lucide-react";
import { Component as ReactComponent, type ReactNode, type ErrorInfo } from "react";

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends ReactComponent<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-red-50 dark:bg-red-950">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400">Something went wrong</h1>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 mb-4 overflow-auto max-h-60">
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-auto max-h-40">
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack || "No stack trace available"}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Route-level permission guard component
function PermissionGuard({ 
  permissions, 
  children 
}: { 
  permissions?: string[];
  children: React.ReactNode;
}) {
  const { hasAnyPermission, isAdmin } = useAuth();
  
  // No permissions required or admin - allow access
  if (!permissions || permissions.length === 0 || isAdmin) {
    return <>{children}</>;
  }
  
  // Check if user has any of the required permissions
  if (hasAnyPermission(...permissions)) {
    return <>{children}</>;
  }
  
  // Access denied
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center" data-testid="container-access-denied">
      <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" data-testid="icon-access-denied" />
      <h2 className="text-xl font-semibold mb-2" data-testid="text-access-denied-title">Access Denied</h2>
      <p className="text-muted-foreground max-w-md" data-testid="text-access-denied-message">
        You don't have permission to access this page. Contact your administrator if you need access.
      </p>
    </div>
  );
}

function ProtectedRoutes() {
  return (
    <Switch>
      <Route path="/goals">
        <PermissionGuard permissions={["view_goals"]}>
          <GoalsPage />
        </PermissionGuard>
      </Route>
      <Route path="/clients">
        <PermissionGuard permissions={["view_clients", "view_leads"]}>
          <ClientsPage />
        </PermissionGuard>
      </Route>
      <Route path="/packages">
        <PermissionGuard permissions={["create_packages", "edit_packages"]}>
          <PackagesPage />
        </PermissionGuard>
      </Route>
      <Route path="/invoices">
        <PermissionGuard permissions={["view_invoices", "create_invoices", "edit_invoices"]}>
          <InvoicesPage />
        </PermissionGuard>
      </Route>
      <Route path="/employees">
        <PermissionGuard permissions={["view_employees"]}>
          <EmployeesPage />
        </PermissionGuard>
      </Route>
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/finance">
        <PermissionGuard permissions={["view_finance"]}>
          <FinancePage />
        </PermissionGuard>
      </Route>
      <Route path="/settings" component={SettingsPage} />
      <Route path="/sales">
        <PermissionGuard permissions={["view_clients", "edit_clients"]}>
          <SalesPage />
        </PermissionGuard>
      </Route>
      <Route path="/work-tracking">
        <PermissionGuard permissions={["view_clients", "edit_work_tracking"]}>
          <WorkTrackingPage />
        </PermissionGuard>
      </Route>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <AppStoreProvider>
      <DataProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex min-h-screen w-full bg-muted/30">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <Header />
              <main className="flex-1 overflow-auto">
                <ProtectedRoutes />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </DataProvider>
    </AppStoreProvider>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicRoutes = ["/login", "/set-password", "/forgot-password", "/reset-password", "/client/login"];
  const isPublicRoute = publicRoutes.some(route => location.startsWith(route));
  const isClientRoute = location.startsWith("/client/") || location === "/client";

  // Client portal routes are handled separately
  if (isClientRoute) {
    return (
      <Switch>
        <Route path="/client/login" component={ClientLoginPage} />
        <Route path="/client" component={ClientDashboardPage} />
      </Switch>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return <Redirect to="/login" />;
  }

  if (isAuthenticated && location === "/login") {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/set-password" component={SetPasswordPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route>
        <AuthenticatedApp />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <AuthProvider>
                <TooltipProvider>
                  <AppRouter />
                  <Toaster />
                </TooltipProvider>
              </AuthProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
