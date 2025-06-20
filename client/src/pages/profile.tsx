import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import ProfileForm from "@/components/profile/profile-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DocumentUpload from "@/components/profile/document-upload";
import { ProfilePhotoUpload } from "@/components/profile/profile-photo-upload";
import VerificationTab from "@/components/profile/verification-tab";
import PasswordChangeForm from "@/components/profile/password-change-form";
import { TwoFactorAuth } from "@/components/profile/two-factor-auth";
import UserPointsDisplay from "@/components/gamification/UserPointsDisplay";
import UserBadgesList, { Badge } from "@/components/gamification/UserBadgesList";
import { User, FileText, ShieldCheck, MapPin, CreditCard, Download, Fingerprint, KeyRound, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";

interface UserProfile {
  profile: {
    profilePhotoUrl?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    address?: string;
    notifications?: {
      email: boolean;
      sms: boolean;
      inApp: boolean;
    };
    language?: string;
    region?: string;
  };
}

interface GamificationProfileData {
  totalPoints: number;
  badges: Badge[]; // Badge interface from UserBadgesList.tsx
  rankOverall?: number | null;
  rankWeekly?: number | null;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese" },
];
const REGIONS = [
  { value: "americas", label: "Americas" },
  { value: "europe", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "africa", label: "Africa" },
  { value: "oceania", label: "Oceania" },
];

function SettingsForm({ user }: { user: any }) {
  const { data: profileData, refetch } = useQuery<UserProfile>({
    queryKey: ['/api/users/profile'],
    enabled: !!user, // Only fetch when user is available
  });
  const queryClient = useQueryClient();
  const { mutateAsync, isPending: isSaving } = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/users/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
      refetch();
    },
  });
  const { register, handleSubmit, setValue, formState: { isDirty } } = useForm({
    defaultValues: {
      notifications: {
        email: true,
        sms: false,
        inApp: true,
      },
      language: "en",
      region: "americas",
    },
  });

  useEffect(() => {
    if (profileData?.profile) {
      setValue("notifications.email", profileData.profile.notifications?.email ?? true);
      setValue("notifications.sms", profileData.profile.notifications?.sms ?? false);
      setValue("notifications.inApp", profileData.profile.notifications?.inApp ?? true);
      setValue("language", profileData.profile.language ?? "en");
      setValue("region", profileData.profile.region ?? "americas");
    }
  }, [profileData, setValue]);

  const onSubmit = async (data: any) => {
    try {
      await mutateAsync({
        ...profileData?.profile,
        ...data,
        notifications: data.notifications,
        language: data.language,
        region: data.region,
      });
      toast({
        title: "Settings updated!",
        description: "Your preferences have been saved.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div>
        <h3 className="text-lg font-medium mb-2">Notification Preferences</h3>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("notifications.email")} /> Email Notifications
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("notifications.sms")} /> SMS Notifications
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("notifications.inApp")} /> In-App Notifications
          </label>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="text-lg font-medium mb-2">Language & Region</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select {...register("language")} className="w-full border rounded px-2 py-1">
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <select {...register("region")} className="w-full border rounded px-2 py-1">
              {REGIONS.map(region => (
                <option key={region.value} value={region.value}>{region.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={!isDirty || isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}

export default function Profile() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Fetch gamification data
  const { data: gamificationData, isLoading: isGamificationLoading, error: gamificationError } = useQuery<GamificationProfileData>({
    queryKey: ['/api/gamification/profile'],
    enabled: !!user, // Only fetch if user is authenticated
    queryFn: async () => {
      const response = await fetch('/api/gamification/profile'); // Ensure this uses authenticated requests if needed by backend
      if (!response.ok) {
        throw new Error('Failed to fetch gamification profile');
      }
      return response.json();
    },
    staleTime: 60000, // Cache for 1 minute
  });
  
  // Function to download the ID card
  const downloadIdCard = async () => {
    try {
      // Start download
      toast({
        title: "Downloading ID card...",
        description: "Your ID card is being generated.",
      });
      
      // Call the API to generate and download the ID card
      const response = await fetch('/api/id-cards/download', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download ID card');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and click it to download
      const a = document.createElement('a');
      a.href = url;
      a.download = `observer-id-card-${user?.observerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "ID Card Downloaded",
        description: "Your ID card has been successfully downloaded.",
        variant: "default",
        className: "bg-green-600 text-white",
      });
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.data?.error || error?.message || "Please try again later.";
      toast({
        title: "Download Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  // Fetch user profile data
  const { data: profileData, isLoading: isProfileLoading, error: profileError } = useQuery<UserProfile>({
    queryKey: ['/api/users/profile'],
    enabled: !!user, // Only fetch when user is available
    staleTime: 60000, // Cache valid data for 1 minute
    gcTime: 300000, // Keep data in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error && 'status' in error && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 2;
    },
    queryFn: async () => {
      try {
        const response = await fetch('/api/users/profile');
        if (response.status === 401) {
          // User not authenticated, redirect to login
          navigate("/login");
          return null;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        console.error('Profile fetch error:', err);
        // Return null to prevent unhandled promise rejections
        return null;
      }
    },
  });

  if (isLoading || isProfileLoading || isGamificationLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-40 bg-gray-200 rounded-md"></div>
        <div className="h-80 bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  return (
    <>
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-md">
              {profileData?.profile?.profilePhotoUrl ? (
                <AvatarImage src={profileData.profile.profilePhotoUrl} alt="Profile Photo" />
              ) : (
                <AvatarFallback>
                  <User className="h-12 w-12 text-gray-400" />
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-gray-500">@{user?.username}</p>
              
              <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                <div className="flex items-center">
                  <ShieldCheck className="h-5 w-5 text-primary mr-2" />
                  <div>
                    <div className="text-sm font-medium">Observer ID</div>
                    <div className="text-lg font-bold">{user?.observerId}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-primary mr-2" />
                  <div>
                    <div className="text-sm font-medium">Verification</div>
                    <div className="capitalize">{user?.verificationStatus}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-primary mr-2" />
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div>{profileData?.profile?.city || "Not specified"}</div>
                  </div>
                </div>
              </div>
              
              {/* ID Card Download Button */}
              {user?.verificationStatus === "verified" && (
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={downloadIdCard}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Download ID Card</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Observer ID Card Display */}
          {user?.verificationStatus === "verified" && (
            <div className="w-full mt-6 border rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="flex flex-col md:flex-row p-4">
                <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                  {profileData?.profile?.profilePhotoUrl ? (
                    <img 
                      src={profileData.profile.profilePhotoUrl} 
                      alt="Profile" 
                      className="w-32 h-40 object-cover border-4 border-white rounded"
                    />
                  ) : (
                    <div className="w-32 h-40 bg-gray-200 border-4 border-white rounded flex items-center justify-center">
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-white mb-1">OFFICIAL OBSERVER</h3>
                  <h2 className="text-2xl font-bold text-white mb-3">{user?.firstName} {user?.lastName}</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-white/70">Observer ID</p>
                      <p className="text-md font-bold">{user?.observerId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Verification Status</p>
                      <p className="text-md font-bold capitalize">{user?.verificationStatus}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Role</p>
                      <p className="text-md font-bold capitalize">{user?.role}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Valid Until</p>
                      <p className="text-md font-bold">December 31, 2025</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs bg-white/20 px-2 py-1 rounded">
                      GENERAL ELECTION DECEMBER 2025
                    </div>
                    <div className="text-xs bg-red-500 px-2 py-1 rounded font-bold">
                      OFFICIAL
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 p-3 flex justify-between items-center">
                <div className="text-xs">Citizens Action for Free and Fair Elections</div>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-white text-indigo-700 hover:bg-white/90 flex items-center gap-1"
                  onClick={downloadIdCard}
                >
                  <Download className="h-3 w-3" />
                  <span>Download Full ID</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Profile Tabs */}
      <Tabs defaultValue="personal-info" className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="personal-info">Personal Info</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="verification">
            <div className="flex items-center">
              <Fingerprint className="mr-2 h-4 w-4" />
              Verification
            </div>
          </TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="gamification">
            <Star className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal-info">
          <ProfileForm />
        </TabsContent>
        
        <TabsContent value="verification">
          <VerificationTab />
        </TabsContent>
        
        <TabsContent value="documents">
          <div>
            <h2 className="text-2xl font-bold mb-4">Identity Documents</h2>
            <p className="text-gray-600 mb-6">
              Upload the required documents for verification. All documents are securely stored and encrypted.
            </p>
            
            {/* AI-enhanced Profile Photo Upload */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Profile Photo</h3>
              <p className="text-gray-600 mb-4">
                Upload a clear photo of your face. Our AI system will automatically process it to ensure ideal quality for your ID card.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfilePhotoUpload 
                  initialPhotoUrl={profileData?.profile?.profilePhotoUrl} 
                  onPhotoProcessed={(photoUrl) => {
                    // This would typically update the user's profile in a real implementation
                    toast({
                      title: "Profile photo updated",
                      description: "Your AI-enhanced photo has been saved.",
                      variant: "default"
                    });
                  }} 
                />
                
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-6 flex flex-col justify-center">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">AI Enhancement Features</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-blue-600 dark:text-blue-400">
                    <li>Automatic face detection and smart cropping</li>
                    <li>Optimal sizing for ID cards and profile display</li>
                    <li>Image quality enhancement with AI models</li>
                    <li>Consistent formatting for all observer photos</li>
                    <li>Background optimization for clear identification</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-6 mt-8">
              <DocumentUpload
                documentType="id"
                title="Government ID"
                description="Upload a photo of your government-issued ID (passport, driver's license, or national ID)."
                acceptedFormats="image/jpeg, image/png, application/pdf"
              />
              
              <DocumentUpload
                documentType="address"
                title="Proof of Address"
                description="Upload a document showing your current address (utility bill, bank statement, etc.)."
                acceptedFormats="image/jpeg, image/png, application/pdf"
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security settings and device access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <PasswordChangeForm />
                </div>
                
                <Separator />
                
                <div>
                  <TwoFactorAuth />
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Device Access</h3>
                  <p className="text-gray-500 mb-4">
                    Your account is currently bound to this device. For security reasons, you can only access your account from one device at a time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your notification preferences and account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gamification">
          <Card>
            <CardHeader>
              <CardTitle>Your Activity & Achievements</CardTitle>
              <CardDescription>Track your points, badges, and leaderboard standings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isGamificationLoading ? (
                <p>Loading activity data...</p>
              ) : gamificationError ? (
                <p className="text-red-500">Could not load activity data. {(gamificationError as Error).message}</p>
              ) : gamificationData ? (
                <>
                  <UserPointsDisplay points={gamificationData.totalPoints} />
                  <Separator />
                  <UserBadgesList badges={gamificationData.badges} />
                  {/* Placeholder for future leaderboard summary if needed here */}
                  {/* <p>Overall Rank: {gamificationData.rankOverall ?? 'N/A'}</p> */}
                  {/* <p>Weekly Rank: {gamificationData.rankWeekly ?? 'N/A'}</p> */}
                </>
              ) : (
                <p>No activity data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
