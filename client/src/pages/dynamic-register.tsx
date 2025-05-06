import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { DynamicForm, FormField } from '@/components/registration/dynamic-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface RegistrationForm {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

const DynamicRegister = () => {
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the active registration form
  const { data: formData, isLoading: isFormLoading, error: formError } = useQuery({
    queryKey: ['/api/registration-forms/active'],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      setRegistrationSuccess(true);
      setError(null);
    },
    onError: (error: any) => {
      setError(error?.message || 'Registration failed. Please try again.');
    },
  });

  // Handle form submission
  const handleRegister = (data: any) => {
    const formData = formData as RegistrationForm;
    const userData: Record<string, any> = {};
    
    // Map form fields to user data structure based on mapToUserField and mapToProfileField
    formData.fields.forEach((field) => {
      if (field.mapToUserField && data[field.name] !== undefined) {
        userData[field.mapToUserField] = data[field.name];
      }
    });
    
    // Profile data will be submitted in a separate step after user creation
    registerMutation.mutate(userData);
  };

  if (isFormLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (formError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load registration form. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Registration Successful</CardTitle>
            <CardDescription className="text-center">
              Your account has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-center mb-4">
              Thank you for registering as an Election Observer. You can now log in using your credentials.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login">
              <a className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition">
                Proceed to Login
              </a>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Observer Registration</CardTitle>
          <CardDescription className="text-center">
            {formData?.description || "Register as an Election Observer"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <DynamicForm
            fields={formData?.fields || []}
            onSubmit={handleRegister}
            isLoading={registerMutation.isPending}
          />
        </CardContent>
        <CardFooter className="flex justify-center pt-2 border-t">
          <div className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login">
              <a className="text-primary hover:underline">Log in</a>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DynamicRegister;