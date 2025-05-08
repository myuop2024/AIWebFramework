import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import Assignments from "@/pages/assignments";
import Training from "@/pages/training";
import IntegratedTraining from "@/pages/integrated-training";
import Faq from "@/pages/faq";
import Chat from "@/pages/chat";
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
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, RoleProtectedRoute } from "@/lib/protected-route";

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
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/reports/new" component={NewReport} />
      <ProtectedRoute path="/reports/:id" component={ReportDetail} />
      <ProtectedRoute path="/assignments" component={Assignments} />
      <ProtectedRoute path="/training" component={IntegratedTraining} />
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/route-planning" component={RoutePlanningPage} />
      
      {/* Admin Routes (require admin role) */}
      <RoleProtectedRoute path="/form-templates" component={FormTemplates} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin" component={Admin} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin-dashboard" component={AdminDashboard} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/verification" component={VerificationPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/training-integrations" component={TrainingIntegrationsAdmin} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/registration-forms" component={RegistrationFormsAdmin} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/id-cards" component={IdCardManagement} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/user-imports" component={UserImportsPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/analytics" component={Analytics} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/settings" component={AdminSettings} allowedRoles={["admin"]} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
