import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { DeviceBindingAlert } from "./device-binding-alert";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { loginMutation } = useAuth();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New state for device binding error handling
  const [deviceBindingFailed, setDeviceBindingFailed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [observerId, setObserverId] = useState<string | undefined>();
  const [requestingReset, setRequestingReset] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle device reset request
  const handleDeviceResetRequest = async () => {
    try {
      setRequestingReset(true);
      // Send device reset request to server
      await apiRequest("POST", "/api/auth/device-reset-request", {
        username: form.getValues().username,
        email: userEmail
      });
      
      // Show success message
      setDeviceBindingFailed(false);
      setError("Device reset request submitted. Please check your email for further instructions.");
    } catch (err) {
      setError("Failed to request device reset. Please contact the CAFFE administration directly.");
    } finally {
      setRequestingReset(false);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setDeviceBindingFailed(false);
      
      await loginMutation.mutateAsync(values);
      navigate("/dashboard");
    } catch (err) {
      // Check if it's a device binding error
      if (err instanceof Error && err.message.includes('DEVICE_MISMATCH')) {
        setDeviceBindingFailed(true);
        
        // Try to get user metadata for the device binding alert
        try {
          const userRes = await apiRequest("GET", `/api/users/metadata?username=${encodeURIComponent(values.username)}`, null);
          const userData = await userRes.json();
          setUserEmail(userData.email);
          setObserverId(userData.observerId);
        } catch (metadataErr) {
          // Silently fail, we'll show the alert without user details
          console.error("Failed to fetch user metadata", metadataErr);
        }
      } else {
        setError(
          err instanceof Error 
            ? err.message 
            : "Login failed. Please check your credentials and try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {deviceBindingFailed && (
        <DeviceBindingAlert
          onRequestReset={handleDeviceResetRequest}
          isLoading={requestingReset}
          userEmail={userEmail}
          observerId={observerId}
        />
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-between items-center">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
          
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </Form>
    </div>
  );
}
