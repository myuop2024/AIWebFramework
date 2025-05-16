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
  const { user, isAuthenticated, login, logout } = useAuth();

  if (isAuthenticated) {
    return (
      <Button 
        variant={variant} 
        onClick={logout}
        className={className}
      >
        {showIcon && <LogOut className="mr-2 h-4 w-4" />}
        Logout
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      onClick={login}
      className={className}
    >
      {showIcon && <LogIn className="mr-2 h-4 w-4" />}
      Login
    </Button>
  );
}