import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "./use-toast";

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

export function useAuth() {
  const { toast } = useToast();
  
  const { 
    data: user, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
  });

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