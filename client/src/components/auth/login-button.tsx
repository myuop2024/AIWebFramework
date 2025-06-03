import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut } from "lucide-react";

interface LoginButtonProps {
  variant?: "default" | "outline" | "ghost"; 
  showIcon?: boolean;
  className?: string;
}

export function LoginButton({ 
  variant = "default", 
  showIcon = true,
  className = ""
}: LoginButtonProps) {
  const { user, isLoading, loginMutation, logoutMutation } = useAuth();

  // Determine if authenticated: user object exists and not in initial loading state
  const isAuthenticated = !isLoading && !!user;

  if (isAuthenticated) {
    return (
      <Button 
        variant={variant} 
        onClick={() => logoutMutation.mutate()}
        className={className}
        disabled={logoutMutation.isPending}
      >
        {showIcon && <LogOut className="mr-2 h-4 w-4" />}
        {logoutMutation.isPending ? "Logging out..." : "Logout"}
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      onClick={() => {
        // Remove all console.log and console.warn statements
      }}
      className={className}
      disabled={loginMutation.isPending}
    >
      {showIcon && <LogIn className="mr-2 h-4 w-4" />}
      {loginMutation.isPending ? "Logging in..." : "Login"}
    </Button>
  );
}