import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, Settings as SettingsIcon, Image, User, Lock, CheckCircle2, Fingerprint } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Interface for system settings
interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: any;
  description: string | null;
  updatedAt: string;
  updatedBy: number | null;
}

// Import settings panels
import DiditSettingsPanel from "@/components/admin/didit-settings-panel";
import VerificationSettings from "@/components/admin/verification-settings";

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState("profile-photos");
  const { toast } = useToast();

  // Query to fetch all system settings
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useQuery<SystemSetting[]>({
    queryKey: ['/api/system-settings'],
    refetchOnWindowFocus: false,
  });
  
  // For the Didit.me tab we're using a separate component

  // Function to find a specific setting
  const findSetting = (key: string): SystemSetting | undefined => {
    if (!settings) return undefined;
    return settings.find((setting) => setting.settingKey === key);
  };

  // Get profile photo policy settings
  const profilePhotoPolicy = findSetting('profile_photo_policy');
  const [requireApproval, setRequireApproval] = useState(false);
  const [enableFaceDetection, setEnableFaceDetection] = useState(false);
  const [enableBackgroundRemoval, setEnableBackgroundRemoval] = useState(false);

  // Update state when settings are loaded
  useEffect(() => {
    if (profilePhotoPolicy) {
      setRequireApproval(profilePhotoPolicy.settingValue.requireApprovalAfterVerification || false);
      setEnableFaceDetection(profilePhotoPolicy.settingValue.enableFaceDetection || false);
      setEnableBackgroundRemoval(profilePhotoPolicy.settingValue.enableBackgroundRemoval || false);
    }
  }, [profilePhotoPolicy]);

  // Mutation for updating a system setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      return apiRequest('PUT', `/api/system-settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
      toast({
        title: "Settings updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating settings",
        description: "An error occurred while saving your changes. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating system settings:", error);
    },
  });

  // Removed old Didit configuration code in favor of the dedicated component

  // Save profile photo policy settings
  const saveProfilePhotoSettings = () => {
    updateSettingMutation.mutate({
      key: 'profile_photo_policy',
      value: {
        requireApprovalAfterVerification: requireApproval,
        enableFaceDetection: enableFaceDetection,
        enableBackgroundRemoval: enableBackgroundRemoval,
      },
    });
  };

  const isLoading = settingsLoading;
  const isError = settingsError;

  if (isLoading) {
    return (
      <AdminLayout title="System Settings">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout title="System Settings">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load settings. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="System Settings">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <SettingsIcon className="mr-2 h-8 w-8" />
          System Settings
        </h1>
        <p className="text-muted-foreground">
          Configure system-wide settings and policies
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile-photos">
            <Image className="mr-2 h-4 w-4" />
            Profile Photos
          </TabsTrigger>
          <TabsTrigger value="user-verification">
            <User className="mr-2 h-4 w-4" />
            User Verification
          </TabsTrigger>
          <TabsTrigger value="didit-integration">
            <Fingerprint className="mr-2 h-4 w-4" />
            Didit.me Integration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile-photos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo Settings</CardTitle>
              <CardDescription>
                Configure how observer profile photos are handled and processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="require-approval" className="font-medium">
                      Require Approval for Changes After Verification
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      When enabled, observers will need admin approval to change their profile 
                      photo after their account has been verified.
                    </p>
                  </div>
                  <Switch
                    id="require-approval"
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="face-detection" className="font-medium">
                      Enable Face Detection Warnings
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      When enabled, users will be warned if no face is detected in their 
                      profile photo upload.
                    </p>
                  </div>
                  <Switch
                    id="face-detection"
                    checked={enableFaceDetection}
                    onCheckedChange={setEnableFaceDetection}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="background-removal" className="font-medium">
                      Enable Automatic Background Removal
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      When enabled, profile photos will have their backgrounds 
                      automatically removed for a cleaner look.
                    </p>
                  </div>
                  <Switch
                    id="background-removal"
                    checked={enableBackgroundRemoval}
                    onCheckedChange={setEnableBackgroundRemoval}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={saveProfilePhotoSettings} 
                disabled={updateSettingMutation.isPending}
                className="flex items-center"
              >
                {updateSettingMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="user-verification" className="space-y-4">
          <VerificationSettings />
        </TabsContent>
        
        <TabsContent value="didit-integration" className="space-y-4">
          <DiditSettingsPanel />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}