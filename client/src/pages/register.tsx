import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RegisterForm from "@/components/auth/register-form";

export default function Register() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  // If still checking authentication, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="h-12 w-12 bg-primary-light/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <div className="h-6 w-6 text-primary">C</div>
            </div>
            <CardTitle className="text-2xl">CAFFE Observer Platform</CardTitle>
            <CardDescription>Loading, please wait...</CardDescription>
          </CardHeader>
          <CardContent className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="h-12 w-12 bg-primary-light/10 rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="h-6 w-6 text-primary font-bold">C</div>
          </div>
          <CardTitle className="text-2xl">CAFFE Observer Platform</CardTitle>
          <CardDescription>Create a new observer account</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
