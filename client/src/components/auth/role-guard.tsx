import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallbackPath = "/dashboard" 
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    if (!isLoading) {
      // Check if user is authenticated
      if (!user) {
        navigate("/login");
        return;
      }
      
      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(user.role)) {
        navigate(fallbackPath);
      }
    }
  }, [user, isLoading, navigate, allowedRoles, fallbackPath]);

  // If still checking authentication or roles, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="h-12 w-12 bg-primary-light/10 rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="h-6 w-6 text-primary">C</div>
          </div>
          <h1 className="text-2xl font-semibold mb-2">CAFFE Observer Platform</h1>
          <p className="text-gray-500 mb-6">Loading, please wait...</p>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated or does not have an allowed role, return null
  if (!user || !allowedRoles.includes(user.role)) {
    return null; // Return null while redirecting to avoid flash of content
  }

  // User has an allowed role, render the children
  return <>{children}</>;
}