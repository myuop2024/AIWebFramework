import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import MainLayout from "@/components/layout/main-layout";
import ProfileForm from "@/components/profile/profile-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DocumentUpload from "@/components/profile/document-upload";
import { User, FileText, ShieldCheck, MapPin, CreditCard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function Profile() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  
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
      console.error('Error downloading ID card:', error);
      toast({
        title: "Download Failed",
        description: "There was a problem downloading your ID card. Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Fetch user profile data
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['/api/users/profile'],
  });

  if (loading || isProfileLoading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-40 bg-gray-200 rounded-md"></div>
          <div className="h-80 bg-gray-200 rounded-md"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
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
        </CardContent>
      </Card>
      
      {/* Profile Tabs */}
      <Tabs defaultValue="personal-info" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="personal-info">Personal Info</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal-info">
          <ProfileForm />
        </TabsContent>
        
        <TabsContent value="documents">
          <div>
            <h2 className="text-2xl font-bold mb-4">Identity Documents</h2>
            <p className="text-gray-600 mb-6">
              Upload the required documents for verification. All documents are securely stored and encrypted.
            </p>
            
            <DocumentUpload
              documentType="profile"
              title="Profile Photo"
              description="Upload a clear photo of your face. This will be used for your ID card."
              acceptedFormats="image/jpeg, image/png"
            />
            
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
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security settings and device access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Change Password</h3>
                  <p className="text-gray-500 mb-4">
                    Password change functionality will be implemented in a future update.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Device Access</h3>
                  <p className="text-gray-500 mb-4">
                    Your account is currently bound to this device. For security reasons, you can only access your account from one device at a time.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Two-Factor Authentication</h3>
                  <p className="text-gray-500 mb-4">
                    Two-factor authentication will be available in a future update.
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Notification Preferences</h3>
                  <p className="text-gray-500 mb-4">
                    Notification settings will be implemented in a future update.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Language & Region</h3>
                  <p className="text-gray-500 mb-4">
                    Language and region settings will be available in a future update.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
