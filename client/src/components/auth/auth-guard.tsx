import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // If still checking authentication, show loading state
  if (loading) {
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

  if (!user) {
    return null; // Return null while redirecting to avoid flash of content
  }

  return <>{children}</>;
}