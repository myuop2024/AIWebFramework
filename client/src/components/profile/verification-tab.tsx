import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Fingerprint, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ShieldX, 
  AlertTriangle, 
  ArrowRight 
} from "lucide-react";

interface VerificationStatus {
  verified: boolean;
  status: 'pending' | 'verified' | 'failed' | 'none';
  verificationDetails?: {
    id: string;
    timestamp: string;
    documentType?: string;
    fullName?: string;
    documentNumber?: string;
    expiryDate?: string;
  };
}

// Define the response type for the status API
interface StatusResponse {
  verified: boolean;
  status: 'pending' | 'verified' | 'failed' | 'none';
  verificationDetails?: {
    id: string;
    timestamp: string;
    documentType?: string;
    fullName?: string;
    documentNumber?: string;
    expiryDate?: string;
  };
}

export default function VerificationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isStarting, setIsStarting] = useState(false);
  
  // Fetch verification status
  const { 
    data: status, 
    isLoading,
    isError,
    refetch: refetchStatus
  } = useQuery<StatusResponse>({
    queryKey: ['/api/verification/status'],
    refetchOnWindowFocus: false,
  });

  // Mutation to start verification process
  const startVerificationMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await fetch('/api/verification/initiate', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include' // Important: include credentials
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start verification process');
        }
        
        return response.json();
      } catch (error) {
        console.error("Error starting verification:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Open the verification URL in a new window/tab
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
        
        toast({
          title: 'Verification Started',
          description: 'The verification process has been started in a new window.',
          variant: 'default',
        });
        
        // Set a timeout to refetch status after a delay
        setTimeout(() => {
          refetchStatus();
        }, 5000);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'There was an error starting the verification process.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsStarting(false);
    },
  });

  // Handler to start verification
  const handleStartVerification = () => {
    setIsStarting(true);
    startVerificationMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="mr-2 h-5 w-5" />
            Identity Verification
          </CardTitle>
          <CardDescription>Verify your identity with Didit.me</CardDescription>
        </CardHeader>
        <CardContent className="py-8 flex justify-center">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading verification status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="mr-2 h-5 w-5" />
            Identity Verification
          </CardTitle>
          <CardDescription>Verify your identity with Didit.me</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load verification status. Please refresh the page or try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={() => refetchStatus()} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If verification is complete
  if (status?.verified) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center text-green-600">
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Identity Verified
          </CardTitle>
          <CardDescription>Your identity has been successfully verified</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Verification Complete</AlertTitle>
              <AlertDescription className="text-green-700">
                Your identity has been verified. Thank you for completing this security step.
              </AlertDescription>
            </Alert>
            
            {status.verificationDetails && (
              <div className="border rounded-md p-4 bg-slate-50">
                <h3 className="text-sm font-medium mb-2">Verification Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Verified on</p>
                    <p className="font-medium">{new Date(status.verificationDetails.timestamp).toLocaleDateString()}</p>
                  </div>
                  {status.verificationDetails.documentType && (
                    <div>
                      <p className="text-muted-foreground">Document Type</p>
                      <p className="font-medium">{status.verificationDetails.documentType}</p>
                    </div>
                  )}
                  {status.verificationDetails.fullName && (
                    <div>
                      <p className="text-muted-foreground">Full Name</p>
                      <p className="font-medium">{status.verificationDetails.fullName}</p>
                    </div>
                  )}
                  {status.verificationDetails.documentNumber && (
                    <div>
                      <p className="text-muted-foreground">Document Number</p>
                      <p className="font-medium">{status.verificationDetails.documentNumber.replace(/(\d{2})\d+(\d{2})/, '$1••••$2')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If verification is pending
  if (status?.status === 'pending') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center text-amber-600">
            <Clock className="mr-2 h-5 w-5" />
            Verification Pending
          </CardTitle>
          <CardDescription>Your verification is being processed</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-amber-50 border-amber-200">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700">Verification In Progress</AlertTitle>
            <AlertDescription className="text-amber-700">
              Your identity verification is currently being processed. This may take some time to complete.
              You'll be notified once verification is done.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={() => refetchStatus()} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Status
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If verification failed
  if (status?.status === 'failed') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <ShieldX className="mr-2 h-5 w-5" />
            Verification Failed
          </CardTitle>
          <CardDescription>Your verification could not be completed</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verification Issue</AlertTitle>
            <AlertDescription>
              There was an issue with your verification process. Please try again or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartVerification} disabled={isStarting} className="w-full">
            {isStarting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Fingerprint className="mr-2 h-4 w-4" />
                Try Again
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Default state: not verified
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Fingerprint className="mr-2 h-5 w-5" />
          Identity Verification
        </CardTitle>
        <CardDescription>Verify your identity with Didit.me</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          To enhance security and ensure the integrity of the observer platform, we require identity 
          verification for all users. This helps prevent unauthorized access and protects the election 
          observation process.
        </p>
        
        <div className="bg-slate-50 p-4 rounded-md border">
          <h3 className="text-sm font-medium mb-2">The verification process:</h3>
          <ul className="text-sm space-y-2">
            <li className="flex items-start">
              <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-primary" />
              <span>Verify your identity using a government-issued ID</span>
            </li>
            <li className="flex items-start">
              <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-primary" />
              <span>Complete a brief facial recognition check</span>
            </li>
            <li className="flex items-start">
              <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-primary" />
              <span>The process typically takes less than 5 minutes</span>
            </li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleStartVerification}
          disabled={isStarting}
          className="w-full"
        >
          {isStarting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Starting Verification...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Start Verification Process
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}