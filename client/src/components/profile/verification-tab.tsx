import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ExternalLink, 
  Lock, 
  Fingerprint 
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function VerificationTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isStartingVerification, setIsStartingVerification] = useState(false);
  
  // Check verification status
  const { 
    data: verificationStatus, 
    isLoading: statusLoading,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/verification/status'],
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // Effect to poll verification status if the process has been started
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isStartingVerification && !verificationStatus?.verified) {
      interval = setInterval(() => {
        refetchStatus();
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStartingVerification, verificationStatus, refetchStatus]);
  
  // Handle starting the verification process
  const startVerification = async () => {
    try {
      setIsStartingVerification(true);
      
      // Create new window for the verification process
      window.open('/api/verification/start', '_blank', 'width=800,height=600');
      
      toast({
        title: "Verification Started",
        description: "Follow the instructions in the new window to complete your identity verification.",
      });
      
      // Immediately start checking for status updates
      refetchStatus();
    } catch (error) {
      console.error('Error starting verification:', error);
      setIsStartingVerification(false);
      
      toast({
        title: "Verification Error",
        description: "There was a problem starting the verification process. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Identity Verification</h2>
        {user?.verificationStatus === "verified" && (
          <div className="flex items-center bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            <span className="font-medium">Verified</span>
          </div>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="mr-2 h-5 w-5" />
            Didit.me Identity Verification
          </CardTitle>
          <CardDescription>
            Our platform uses Didit.me's secure identity verification service to verify your identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
              <span>Checking verification status...</span>
            </div>
          ) : (
            <>
              {verificationStatus?.verified ? (
                <Alert className="bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-800 dark:text-green-300">Identity Verified</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Your identity has been successfully verified. Thank you for completing the verification process.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-amber-50 dark:bg-amber-900 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-800 dark:text-amber-300">Verification Required</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    To access all features of the platform, you need to verify your identity using our secure verification service.
                  </AlertDescription>
                </Alert>
              )}
              
              {verificationStatus?.verificationDetails && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <h4 className="font-medium mb-2">Verification Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Verified Name:</span>
                      <p className="font-medium">{verificationStatus.verificationDetails.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Verification ID:</span>
                      <p className="font-medium">{verificationStatus.verificationDetails.id || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Verification Level:</span>
                      <p className="font-medium">{verificationStatus.verificationDetails.verification_level || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Verified On:</span>
                      <p className="font-medium">{verificationStatus.verificationDetails.verified_at || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <h4 className="font-medium mb-2">How the Verification Process Works</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                  <li>Click the "Start Verification" button below</li>
                  <li>A new window will open with the Didit.me verification service</li>
                  <li>Follow the instructions to verify your identity (usually requires ID document and a selfie)</li>
                  <li>After verification is complete, close the window and return to this page</li>
                  <li>Your verification status will be updated automatically</li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500 flex items-center">
            <Lock className="h-4 w-4 mr-1" />
            Secure & encrypted verification
          </div>
          
          <Button 
            onClick={startVerification}
            disabled={verificationStatus?.verified || isStartingVerification || statusLoading}
            className="flex items-center"
          >
            {isStartingVerification ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : verificationStatus?.verified ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Already Verified
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Start Verification
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Separator />
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">About Didit.me Identity Verification</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Didit.me is a secure identity verification service that helps organizations verify the 
          identity of their users. The verification process is quick, secure, and complies with
          industry standards for identity verification.
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md text-blue-800 dark:text-blue-300">
          <h4 className="font-medium mb-2">Benefits of Identity Verification</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Enhanced security and trust in the platform</li>
            <li>Reduced risk of fraud and impersonation</li>
            <li>Access to restricted features and capabilities</li>
            <li>Compliance with election observation requirements</li>
            <li>Improved credibility as an official observer</li>
          </ul>
        </div>
        
        <div className="flex justify-end">
          <a 
            href="https://didit.me" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary flex items-center"
          >
            Learn more about Didit.me
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}