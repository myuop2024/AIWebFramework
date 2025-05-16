import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import { createContext, useContext, ReactNode } from "react";

export type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  observerId: string | null;
  role: string;
  profileImageUrl: string | null;
};

// Create context for authentication
type AuthContextType = ReturnType<typeof useAuthProvider>;
const AuthContext = createContext<AuthContextType | null>(null);

// This type assertion helps with TypeScript type safety
const userTypeGuard = (data: any): data is User => {
  return data && typeof data.id === 'string';
};

// Private hook that provides auth functionality
function useAuthProvider() {
  const { toast } = useToast();
  
  const { 
    data: userData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Type safety for user data
  const user = userData as User | undefined;

  const logout = async () => {
    try {
      window.location.href = "/api/logout";
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const login = () => {
    window.location.href = "/api/login";
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    logout,
    login,
    refetch,
  };
}

// Provider component that wraps app and makes auth available to any child component
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// Hook for components to get auth data and re-render when it changes
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}