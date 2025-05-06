import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import Analytics from "@/pages/analytics";

function Router() {
  return (
    <Switch>
      {/* Authentication Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={DynamicRegister} />
      <Route path="/forgot-password" component={ForgotPassword} />
      
      {/* App Routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/documents" component={Documents} />
      <Route path="/polling-stations" component={PollingStations} />
      <Route path="/reports" component={Reports} />
      <Route path="/reports/new" component={NewReport} />
      <Route path="/reports/:id" component={ReportDetail} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/training" component={IntegratedTraining} />
      <Route path="/faq" component={Faq} />
      <Route path="/chat" component={Chat} />
      <Route path="/form-templates" component={FormTemplates} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/admin/verification" component={VerificationPage} />
      <Route path="/admin/training-integrations" component={TrainingIntegrationsAdmin} />
      <Route path="/admin/registration-forms" component={RegistrationFormsAdmin} />
      <Route path="/admin/id-cards" component={IdCardManagement} />
      <Route path="/admin/analytics" component={Analytics} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
