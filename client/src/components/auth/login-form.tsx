import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginForm() {
  const { login } = useAuth();

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-medium">Login with Replit</h3>
        <p className="text-sm text-muted-foreground">
          Click the button below to sign in using your Replit account
        </p>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <Button 
              size="lg" 
              onClick={login} 
              className="w-full"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Continue with Replit
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm text-blue-700">
          This application uses Replit for secure authentication. You will be redirected to Replit to sign in.
        </AlertDescription>
      </Alert>
    </div>
  );
}
