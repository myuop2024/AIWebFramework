import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Password change form schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Define type for form values based on the schema
type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export default function PasswordChangeForm() {
  const { toast } = useToast();
  const [isSuccessful, setIsSuccessful] = useState(false);

  // Initialize form with default values
  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Mutation for changing password
  const { mutate, isPending } = useMutation({
    mutationFn: async (values: PasswordChangeFormValues) => {
      const response = await apiRequest('POST', '/api/user/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setIsSuccessful(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
        variant: 'default'
      });
      
      // Reset the form
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Password Change Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Form submission handler
  function onSubmit(values: PasswordChangeFormValues) {
    mutate(values);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter your current password" 
                      {...field} 
                      disabled={isPending || isSuccessful}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter your new password" 
                      {...field} 
                      disabled={isPending || isSuccessful}
                    />
                  </FormControl>
                  <FormDescription>
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Confirm your new password" 
                      {...field} 
                      disabled={isPending || isSuccessful}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isPending || isSuccessful}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : isSuccessful ? (
                'Password Updated'
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        {isSuccessful && (
          <p className="text-sm text-green-600">
            Your password has been successfully updated.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}