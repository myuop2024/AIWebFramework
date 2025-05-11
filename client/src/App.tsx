import { Switch, Route, Redirect } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { useEffect, Suspense } from "react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import DynamicRegister from "@/pages/dynamic-register";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Documents from "@/pages/documents";
import PollingStations from "@/pages/polling-stations";
import Reports from "@/pages/reports";
import NewReport from "@/pages/reports/new";
import ReportDetail from "@/pages/reports/[id]";
import AssignmentsPage from "@/pages/assignments";
import Training from "@/pages/training";
import IntegratedTraining from "@/pages/integrated-training";
import Faq from "@/pages/faq";
import Chat from "@/pages/chat";
import Communications from "@/pages/communications";
import FormTemplates from "@/pages/form-templates";
import Admin from "@/pages/admin";
import AdminDashboard from "@/pages/admin-dashboard";
import VerificationPage from "@/pages/admin/verification";
import TrainingIntegrationsAdmin from "@/pages/admin/training-integrations";
import RegistrationFormsAdmin from "@/pages/admin/registration-forms";
import IdCardManagement from "@/pages/admin/id-cards";
import UserImportsPage from "@/pages/admin/user-imports";
import Analytics from "@/pages/analytics";
import AdminSettings from "@/pages/admin/settings";
import RoutePlanningPage from "@/pages/route-planning-page";
import ObserverRoutePlanningPage from "@/pages/observer-route-planning";
// New role-specific pages
import PermissionManagement from "@/pages/admin/permission-management";
import TeamManagement from "@/pages/supervisor/team-management";
import Assignments from "@/pages/supervisor/assignments";
import ReportsApproval from "@/pages/supervisor/reports-approval";
import ScheduleMeeting from "@/pages/supervisor/schedule-meeting";
import StationSchedulePage from "@/pages/roving/station-schedule";
import AreaReportsPage from "@/pages/roving/area-reports";
import ErrorLogsPage from "@/pages/admin/error-logs";
import ProjectManagement from "@/pages/project-management";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, RoleProtectedRoute } from "@/lib/protected-route";
import ErrorBoundary from "@/components/error/error-boundary";
import { initGlobalErrorHandlers } from "@/lib/error-logger";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={DynamicRegister} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/faq" component={Faq} />
      
      {/* Protected Routes (require any authenticated user) */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/documents" component={Documents} />
      <ProtectedRoute path="/polling-stations" component={PollingStations} />
      <ProtectedRoute path="/polling-stations/create" component={React.lazy(() => import("@/pages/polling-stations/create"))} />
      <ProtectedRoute path="/polling-stations/import" component={React.lazy(() => import("@/pages/polling-stations/import"))} />
      <ProtectedRoute path="/polling-stations/map" component={React.lazy(() => import("@/pages/polling-stations/map"))} />
      <ProtectedRoute path="/polling-stations/export" component={React.lazy(() => import("@/pages/polling-stations/export"))} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/reports/new" component={NewReport} />
      <ProtectedRoute path="/reports/:id" component={ReportDetail} />
      <ProtectedRoute path="/assignments" component={AssignmentsPage} />
      <ProtectedRoute path="/training" component={IntegratedTraining} />
      <ProtectedRoute path="/chat" component={Chat} />
      {/* Redirect communications route to /chat to avoid duplicate routes */}
      <Route path="/communications" component={() => <Redirect to="/chat" />} />
      <ProtectedRoute path="/route-planning" component={RoutePlanningPage} />
      <ProtectedRoute path="/observer-route-planning" component={ObserverRoutePlanningPage} />
      <ProtectedRoute path="/project-management" component={ProjectManagement} />
      <ProtectedRoute path="/project-management/:id" component={React.lazy(() => import("@/pages/project-management/detail"))} />
      <ProtectedRoute path="/project-management/:id/edit" component={React.lazy(() => import("@/pages/project-management/edit"))} />
      <ProtectedRoute path="/project-management/new" component={React.lazy(() => import("@/pages/project-management/new"))} />
      
      {/* Admin Routes (require admin or director role) */}
      <RoleProtectedRoute path="/form-templates" component={FormTemplates} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin" component={Admin} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin-dashboard" component={AdminDashboard} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/verification" component={VerificationPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/training-integrations" component={TrainingIntegrationsAdmin} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/registration-forms" component={RegistrationFormsAdmin} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/id-cards" component={IdCardManagement} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/user-imports" component={UserImportsPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/analytics" component={Analytics} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/settings" component={AdminSettings} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/permissions" component={PermissionManagement} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/error-logs" component={ErrorLogsPage} allowedRoles={["admin", "director"]} />
      
      {/* Supervisor Routes */}
      <RoleProtectedRoute 
        path="/supervisor/team-management" 
        component={TeamManagement} 
        allowedRoles={["supervisor", "admin", "director"]} 
      />
      <RoleProtectedRoute 
        path="/supervisor/assignments" 
        component={Assignments} 
        allowedRoles={["supervisor", "admin", "director"]} 
      />
      <RoleProtectedRoute 
        path="/supervisor/reports-approval" 
        component={ReportsApproval} 
        allowedRoles={["supervisor", "admin", "director"]} 
      />
      <RoleProtectedRoute 
        path="/supervisor/schedule-meeting" 
        component={ScheduleMeeting} 
        allowedRoles={["supervisor", "admin", "director"]} 
      />
      
      {/* Roving Observer Routes */}
      <RoleProtectedRoute 
        path="/roving/station-schedule" 
        component={StationSchedulePage} 
        allowedRoles={["roving_observer", "supervisor", "admin", "director"]} 
      />
      <RoleProtectedRoute 
        path="/roving/area-reports" 
        component={AreaReportsPage} 
        allowedRoles={["roving_observer", "supervisor", "admin", "director"]} 
      />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize global error handlers on app mount
  useEffect(() => {
    initGlobalErrorHandlers();
    console.log('Global error handlers initialized');
  }, []);

  return (
    <ErrorBoundary captureContext={{ location: window.location.href }}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
