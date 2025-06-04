import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

type PermissionsContextType = {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isLoading: boolean;
  error: Error | null;
};

export const PermissionsContext = createContext<PermissionsContextType | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const {
    data: userPermissions,
    error,
    isLoading,
  } = useQuery<string[]>({
    queryKey: ['/api/user/permissions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/permissions', {
          credentials: 'include',
        });
        if (res.status === 401) return [];
        if (!res.ok) {
          throw new Error(`Failed to fetch permissions: ${res.status}`);
        }
        const data = await res.json();
        return data.permissions || [];
      } catch (err) {
        console.error('Error fetching user permissions:', err);
        // Return empty array instead of throwing to prevent unhandled promise rejections
        return [];
      }
    },
    enabled: !!user,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const permissions = userPermissions || [];

  // Get role-based permissions
  const getRolePermissions = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return [
          'admin:access-panel',
          'users:view', 'users:create', 'users:edit', 'users:delete', 'users:verify', 'users:import',
          'polling-stations:view', 'polling-stations:create', 'polling-stations:edit', 'polling-stations:delete', 'polling-stations:import', 'polling-stations:export',
          'reports:view', 'reports:submit', 'reports:approve', 'reports:delete',
          'assignments:view', 'assignments:create', 'assignments:edit', 'assignments:delete',
          'analytics:view', 'analytics:export',
          'training:view', 'training:manage', 'training:create', 'training:edit',
          'communications:send', 'communications:broadcast',
          'roles:view', 'roles:edit', 'groups:view', 'groups:edit',
          'system:access-advanced-features', 'system:manage-settings', 'system:manage-training-integrations',
          'content:manage', 'forms:manage-templates', 'news:manage',
          'operations:view-smart', 'routes:plan', 'routes:view-observer-geolocation'
        ];
      case 'supervisor':
        return [
          'supervisor-tasks:view-team', 'supervisor-tasks:view-assignments', 'supervisor-tasks:approve-report', 'supervisor-tasks:schedule-meetings',
          'users:view', 'polling-stations:view', 'assignments:view', 'assignments:create', 'assignments:edit',
          'reports:view', 'reports:submit', 'reports:approve', 'analytics:view',
          'communications:send', 'training:view'
        ];
      case 'observer':
        return [
          'reports:submit', 'assignments:view', 'polling-stations:view',
          'training:view', 'communications:send'
        ];
      case 'analyst':
        return [
          'analytics:view', 'analytics:export', 'reports:view', 'polling-stations:view',
          'assignments:view'
        ];
      case 'roving-observer':
        return [
          'roving-observer:view-schedule', 'roving-observer:view-area-reports',
          'reports:submit', 'assignments:view', 'polling-stations:view',
          'training:view', 'communications:send', 'routes:view-observer-geolocation'
        ];
      default:
        return ['reports:submit', 'assignments:view', 'training:view'];
    }
  };

  // Combine explicit permissions with role-based permissions
  const allPermissions = [
    ...permissions,
    ...(user?.role ? getRolePermissions(user.role) : [])
  ];

  // Remove duplicates
  const uniquePermissions = [...new Set(allPermissions)];

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin always has access
    if (user.role === 'admin') return true;
    
    // Check if user has the specific permission
    return uniquePermissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissionList.some(permission => uniquePermissions.includes(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissionList.every(permission => uniquePermissions.includes(permission));
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions: uniquePermissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isLoading,
        error,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}

// Permission constants for easier maintenance
export const PERMISSIONS = {
  // Admin permissions
  ADMIN_ACCESS: 'admin:access-panel',
  
  // User management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_VERIFY: 'users:verify',
  USERS_IMPORT: 'users:import',
  
  // Polling stations
  STATIONS_VIEW: 'polling-stations:view',
  STATIONS_CREATE: 'polling-stations:create',
  STATIONS_EDIT: 'polling-stations:edit',
  STATIONS_DELETE: 'polling-stations:delete',
  STATIONS_IMPORT: 'polling-stations:import',
  STATIONS_EXPORT: 'polling-stations:export',
  
  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_SUBMIT: 'reports:submit',
  REPORTS_APPROVE: 'reports:approve',
  REPORTS_DELETE: 'reports:delete',
  
  // Assignments
  ASSIGNMENTS_VIEW: 'assignments:view',
  ASSIGNMENTS_CREATE: 'assignments:create',
  ASSIGNMENTS_EDIT: 'assignments:edit',
  ASSIGNMENTS_DELETE: 'assignments:delete',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // Training
  TRAINING_VIEW: 'training:view',
  TRAINING_MANAGE: 'training:manage',
  TRAINING_CREATE: 'training:create',
  TRAINING_EDIT: 'training:edit',
  
  // Communications
  COMMUNICATIONS_SEND: 'communications:send',
  COMMUNICATIONS_BROADCAST: 'communications:broadcast',
  
  // Roles and groups
  ROLES_VIEW: 'roles:view',
  ROLES_EDIT: 'roles:edit',
  GROUPS_VIEW: 'groups:view',
  GROUPS_EDIT: 'groups:edit',
  
  // System
  SYSTEM_ADVANCED: 'system:access-advanced-features',
  SYSTEM_SETTINGS: 'system:manage-settings',
  SYSTEM_TRAINING_INTEGRATIONS: 'system:manage-training-integrations',
  
  // Content management
  CONTENT_MANAGE: 'content:manage',
  FORMS_TEMPLATES: 'forms:manage-templates',
  NEWS_MANAGE: 'news:manage',
  
  // Operations
  OPERATIONS_SMART: 'operations:view-smart',
  ROUTES_PLAN: 'routes:plan',
  ROUTES_OBSERVER_GEO: 'routes:view-observer-geolocation',
  
  // Supervisor tasks
  SUPERVISOR_TEAM: 'supervisor-tasks:view-team',
  SUPERVISOR_ASSIGNMENTS: 'supervisor-tasks:view-assignments',
  SUPERVISOR_APPROVE_REPORTS: 'supervisor-tasks:approve-report',
  SUPERVISOR_MEETINGS: 'supervisor-tasks:schedule-meetings',
  
  // Roving observer
  ROVING_SCHEDULE: 'roving-observer:view-schedule',
  ROVING_REPORTS: 'roving-observer:view-area-reports'
} as const;