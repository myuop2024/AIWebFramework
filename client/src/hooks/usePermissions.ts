import { useAuth } from "./useAuth";

interface UserWithPermissions {
  // Assuming other User properties from useAuth are present
  // For this hook, we are primarily concerned with the permissions array
  permissions?: string[];
  // Add other properties from the User type in @shared/schema if needed for context,
  // but useAuth already provides the full user object.
  // Example: id?: number; username?: string; email?: string; role?: string;
}

export function usePermissions() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const typedUser = user as UserWithPermissions | null; // Cast user to include permissions

  const hasPermission = (requiredPermission: string): boolean => {
    if (isAuthLoading) {
      return false;
    }
    if (!typedUser) {
      return false;
    }
    if (!typedUser.permissions || !Array.isArray(typedUser.permissions)) {
      return false;
    }
    return typedUser.permissions.includes(requiredPermission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (isAuthLoading) {
      return false;
    }
    if (!typedUser) {
      return false;
    }
    if (!typedUser.permissions || !Array.isArray(typedUser.permissions)) {
      return false;
    }
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return false; // No permissions required, so false seems safer than true.
    }
    return requiredPermissions.some(p => typedUser.permissions?.includes(p) ?? false);
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (isAuthLoading) {
      return false;
    }
    if (!typedUser) {
      return false;
    }
    if (!typedUser.permissions || !Array.isArray(typedUser.permissions)) {
      return false;
    }
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // All of zero permissions are present.
    }
    return requiredPermissions.every(p => typedUser.permissions?.includes(p) ?? false);
  };

  return {
    userPermissions: typedUser?.permissions || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading: isAuthLoading, // Expose auth loading state as permission loading state
  };
}
