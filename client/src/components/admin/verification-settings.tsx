import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserCheck, Save, RefreshCw, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Form schema for verification settings
const verificationSettingsSchema = z.object({
  autoApproval: z.boolean().default(false),
  requireIdCard: z.boolean().default(true),
  requireAddress: z.boolean().default(true),
  requireProfilePhoto: z.boolean().default(true),
  requireIdentificationNumber: z.boolean().default(true),
  allowPhotoUpdates: z.boolean().default(true),
  verificationMessage: z.string().optional(),
  minVerificationAge: z.number().min(16).max(99).default(18),
});

type VerificationSettingsFormValues = z.infer<typeof verificationSettingsSchema>;

// Default values for the form
const defaultValues: VerificationSettingsFormValues = {
  autoApproval: false,
  requireIdCard: true,
  requireAddress: true,
  requireProfilePhoto: true,
  requireIdentificationNumber: true,
  allowPhotoUpdates: true,
  verificationMessage: "",
  minVerificationAge: 18,
};

export default function VerificationSettings() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current verification settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery<VerificationSettingsFormValues>({
    queryKey: ['/api/admin/settings/verification'],
  });

  // Form setup
  const form = useForm<VerificationSettingsFormValues>({
    resolver: zodResolver(verificationSettingsSchema),
    defaultValues,
    values: settings,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (values: VerificationSettingsFormValues) => {
      const response = await fetch('/api/admin/settings/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save verification settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Verification settings have been updated successfully.',
        variant: 'default',
        className: 'bg-green-600 text-white',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/verification'] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: 'Error Saving Settings',
        description: error instanceof Error ? error.message : 'There was an error saving verification settings.',
        variant: 'destructive',
      });
    },
  });

  if (isLoadingSettings) {
    return (
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5" /> User Verification Settings
          </CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <RefreshCw className="animate-spin h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2 h-5 w-5" /> User Verification Settings
            </CardTitle>
            <CardDescription>Configure the verification process for new observers</CardDescription>
          </div>
          {!isEditing && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit Settings
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => saveSettingsMutation.mutate(data))} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Verification Requirements</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="requireProfilePhoto"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Require Profile Photo
                        </FormLabel>
                        <FormDescription>
                          Users must upload a profile photo during registration
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isEditing}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requireIdCard"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Require ID Card
                        </FormLabel>
                        <FormDescription>
                          Users must upload ID card or document during registration
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isEditing}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requireAddress"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Require Address
                        </FormLabel>
                        <FormDescription>
                          Users must provide full address information
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isEditing}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requireIdentificationNumber"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Require ID Number
                        </FormLabel>
                        <FormDescription>
                          Users must provide national ID or passport number
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isEditing}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-6" />

              <h3 className="text-lg font-medium">Verification Process Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="autoApproval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Auto-Approve Users
                        </FormLabel>
                        <FormDescription>
                          Automatically approve new users without manual review
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isEditing}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowPhotoUpdates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Allow Photo Updates
                        </FormLabel>
                        <FormDescription>
                          Users can update profile photos after verification
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isEditing}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minVerificationAge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Age Requirement</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={16}
                          max={99}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum age required for observers (16-99)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-6" />

              <FormField
                control={form.control}
                name="verificationMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter instructions for users completing verification..."
                        className="min-h-[120px]"
                        {...field}
                        disabled={!isEditing}
                      />
                    </FormControl>
                    <FormDescription>
                      This message will be shown to users on the verification page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={saveSettingsMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}