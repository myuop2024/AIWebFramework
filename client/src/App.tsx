import { Switch, Route, Redirect, useLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { useEffect, Suspense, lazy } from "react";
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
import NewsPage from "@/pages/news";
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
import DirectMapAccess from "@/pages/direct-map-access";
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
import ProjectDashboard from "@/pages/project-management/dashboard";
import ProjectDetail from "@/pages/project-management/detail";
import ProjectEdit from "@/pages/project-management/edit";
import ProjectNew from "@/pages/project-management/new";
import GamificationPage from "@/pages/gamification";
import SecurityDashboard from "@/pages/security-dashboard";
import AdminNewsPage from "@/pages/admin/news";
import AnalyticsPage from "@/pages/analytics";
import SmartOperationsPage from "@/pages/smart-operations";
import AccessibilityPage from "@/pages/accessibility";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, RoleProtectedRoute } from "@/lib/protected-route";
import ErrorBoundary from "@/components/error/error-boundary";
import { initGlobalErrorHandlers } from "@/lib/error-logger";
import AdvancedFeatures from "@/pages/advanced-features";
import { Helmet } from 'react-helmet';
import AdminAIAssistantPage from '@/pages/advanced-features/ai-assistant';
import AdminSmartAnalyticsPage from '@/pages/advanced-features/smart-analytics';
import AdminGamificationPage from '@/pages/advanced-features/gamification';
import AdminSmartOperationsPage from '@/pages/advanced-features/smart-operations';
import AdminAccessibilityPage from '@/pages/advanced-features/accessibility';
import AdminRolesPage from '@/pages/admin/roles';
import AdminGroupsPage from '@/pages/admin/groups';
import AdminGroupPermissionsPage from '@/pages/admin/group-permissions';
import { useMobileOptimizations } from './hooks/use-ios-optimizations';

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={DynamicRegister} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/faq" component={Faq} />
      <Route path="/map-view" component={DirectMapAccess} />
      <Route path="/jamaica-map" component={React.lazy(() => import("@/pages/standalone-map"))} />

      {/* Protected Routes (require any authenticated user) */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/documents" component={Documents} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/polling-stations" component={PollingStations} />
      <ProtectedRoute path="/polling-stations/create" component={lazy(() => import("@/pages/polling-stations/create"))} />
      <ProtectedRoute path="/polling-stations/import" component={lazy(() => import("@/pages/polling-stations/import"))} />
      <ProtectedRoute path="/polling-stations/map" component={lazy(() => import("@/pages/polling-stations/map"))} />
      <ProtectedRoute path="/polling-stations/regions" component={lazy(() => import("@/pages/polling-stations/regions"))} />
      <ProtectedRoute path="/polling-stations/export" component={lazy(() => import("@/pages/polling-stations/export"))} />
      <RoleProtectedRoute path="/polling-stations/report-template" component={lazy(() => import("@/pages/polling-stations/report-template"))} allowedRoles={["admin", "director"]} />
      <ProtectedRoute path="/polling-stations/check-in" component={lazy(() => import("./pages/polling-stations/check-in"))} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/reports/new" component={NewReport} />
      <ProtectedRoute path="/reports/:id" component={ReportDetail} />
      <ProtectedRoute path="/assignments" component={AssignmentsPage} />
      <ProtectedRoute path="/training" component={IntegratedTraining} />
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/news" component={NewsPage} />
      {/* Redirect communications route to /chat to avoid duplicate routes */}
      <Route path="/communications" component={() => <Redirect to="/chat" />} />
      <ProtectedRoute path="/gamification" component={GamificationPage} />
      <ProtectedRoute path="/smart-operations" component={SmartOperationsPage} />
      <ProtectedRoute path="/accessibility" component={AccessibilityPage} />
      <ProtectedRoute path="/route-planning" component={RoutePlanningPage} />
      <ProtectedRoute path="/observer-route-planning" component={ObserverRoutePlanningPage} />
      {/* Project Management Routes - specific routes must come before dynamic routes */}
      <ProtectedRoute path="/project-management/dashboard" component={ProjectDashboard} />
      <ProtectedRoute path="/project-management/new" component={ProjectNew} />
      <ProtectedRoute path="/project-management/kanban" component={React.lazy(() => import("@/pages/project-management/kanban"))} />
      <ProtectedRoute path="/project-management/calendar" component={React.lazy(() => import("@/pages/project-management/calendar"))} />
      <ProtectedRoute path="/project-management/analytics" component={React.lazy(() => import("@/pages/project-management/analytics"))} />
      <ProtectedRoute path="/project-management/tasks" component={React.lazy(() => import("@/pages/project-management/tasks"))} />
      <ProtectedRoute path="/project-management/milestones" component={React.lazy(() => import("@/pages/project-management/milestones"))} />
      <ProtectedRoute path="/project-management/:id/edit" component={ProjectEdit} />
      <ProtectedRoute path="/project-management/:id" component={ProjectDetail} />
      <ProtectedRoute path="/project-management" component={ProjectManagement} />

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
      <RoleProtectedRoute path="/admin/news" component={AdminNewsPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/permissions" component={PermissionManagement} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/error-logs" component={ErrorLogsPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/security" component={SecurityDashboard} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/crm" component={React.lazy(() => import("@/pages/admin/crm"))} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/roles" component={AdminRolesPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/groups" component={AdminGroupsPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/admin/group-permissions" component={AdminGroupPermissionsPage} allowedRoles={["admin", "director"]} />

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

      {/* Advanced Features */}
      <Route path="/advanced-features" component={AdvancedFeatures} />

      {/* Advanced Features (Admin Submenu) */}
      <RoleProtectedRoute path="/advanced-features/ai-assistant" component={AdminAIAssistantPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/advanced-features/smart-analytics" component={AdminSmartAnalyticsPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/advanced-features/gamification" component={AdminGamificationPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/advanced-features/smart-operations" component={AdminSmartOperationsPage} allowedRoles={["admin", "director"]} />
      <RoleProtectedRoute path="/advanced-features/accessibility" component={AdminAccessibilityPage} allowedRoles={["admin", "director"]} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize global error handlers on app mount
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  const [location] = useLocation();
  useEffect(() => {
    const now = new Date();
    const logEntry = {
      type: 'page_load',
      path: location,
      timestamp: now.toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    };
    // Get logs from localStorage
    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem('pageLogs') || '[]');
    } catch {}
    // Add new log
    logs.push(logEntry);
    // Remove logs older than 1 day
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    logs = logs.filter(l => new Date(l.timestamp) > oneDayAgo);
    // Save back
    localStorage.setItem('pageLogs', JSON.stringify(logs));
    // Send to backend
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    }).catch(() => {});
  }, [location]);

  useMobileOptimizations();

  return (
    <>
      <Helmet>
        <title>CAFFE Election Observation System</title>
        <meta name="description" content="CAFFE Election Observation System - Modern, secure, and AI-powered election observation platform." />
      </Helmet>
      <ErrorBoundary captureContext={{ location: window.location.href }}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;

// Add a global error handler to log unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  // Log error to backend
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'unhandled_rejection',
      reason: event.reason ? event.reason.toString() : 'No reason provided',
      promise: event.promise ? event.promise.toString() : 'No promise provided',
    }),
  }).catch(() => {});
});