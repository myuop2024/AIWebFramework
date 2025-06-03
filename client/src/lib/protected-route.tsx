import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import React, { Suspense } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any> | (() => React.JSX.Element);
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }

  // Always wrap the component with MainLayout and Suspense for consistency
  return (
    <Route path={path}>
      <MainLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <Component />
        </Suspense>
      </MainLayout>
    </Route>
  );
}

// For routes that require specific roles
export function RoleProtectedRoute({
  path,
  component: Component,
  allowedRoles,
}: {
  path: string;
  component: React.ComponentType<any> | (() => React.JSX.Element);
  allowedRoles: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }

  if (!user.role || !allowedRoles.includes(user.role)) {
    return (
      <Route path={path}>
        <Redirect to="/dashboard" />
      </Route>
    );
  }

  // Always wrap the component with MainLayout and Suspense for consistency
  return (
    <Route path={path}>
      <MainLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <Component />
        </Suspense>
      </MainLayout>
    </Route>
  );
}