import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import MyUploads from "@/pages/MyUploads";
import Inventory from "@/pages/Inventory";
import Alerts from "@/pages/Alerts";
import Reports from "@/pages/Reports";
import Prompts from "@/pages/Prompts";
import TrainingExamples from "@/pages/TrainingExamples";
import Evaluation from "@/pages/Evaluation";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function TestingModeBanner() {
  const { testingMode, role } = useAuth();
  if (!testingMode || role !== "programmer") return null;
  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm font-medium px-4 py-2 text-center dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200">
      TESTING MODE ACTIVE — your uploads will not be saved to inventory
    </div>
  );
}

function AppLayout() {
  const { role, isLoading } = useAuth();
  const [location] = useLocation();

  if (location === "/login") {
    return (
      <Switch>
        <Route path="/login" component={Login} />
      </Switch>
    );
  }

  if (isLoading) return null;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between p-4 border-b h-16 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <TestingModeBanner />
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                {role && (role === "supervisor" || role === "superuser")
                  ? <Dashboard />
                  : <Redirect to="/upload" />}
              </Route>
              <Route path="/upload" component={Upload} />
              <Route path="/my-uploads" component={MyUploads} />
              <Route path="/live">
                <ProtectedRoute component={Dashboard} allowedRoles={["supervisor", "superuser"]} />
              </Route>
              <Route path="/inventory">
                <ProtectedRoute component={Inventory} allowedRoles={["supervisor", "superuser"]} />
              </Route>
              <Route path="/reports">
                <ProtectedRoute component={Reports} allowedRoles={["supervisor", "superuser"]} />
              </Route>
              <Route path="/alerts">
                <ProtectedRoute component={Alerts} allowedRoles={["supervisor", "superuser"]} />
              </Route>
              <Route path="/prompts">
                <ProtectedRoute component={Prompts} allowedRoles={["programmer", "superuser"]} />
              </Route>
              <Route path="/training-examples">
                <ProtectedRoute component={TrainingExamples} allowedRoles={["programmer", "superuser"]} />
              </Route>
              <Route path="/evaluation">
                <ProtectedRoute component={Evaluation} allowedRoles={["programmer", "superuser"]} />
              </Route>
              <Route path="/settings">
                <ProtectedRoute component={Settings} allowedRoles={["superuser"]} />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppLayout />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
