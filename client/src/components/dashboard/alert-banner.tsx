import { Link } from "wouter";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";

// Define the expected structure for the profile data
interface ProfileDataForAlert {
  user?: { // Assuming user is optional or can be null
    verificationStatus?: string;
  };
  profile?: any; // Replace 'any' with a more specific type if available e.g., UserProfile
  documents?: any[]; // Replace 'any' with a more specific type if available e.g., Document[]
}

export default function AlertBanner() {
  // Fetch user profile data to determine verification status
  const { data: profileData, isLoading } = useQuery<ProfileDataForAlert>({ // Specify the type for useQuery
    queryKey: ['/api/users/profile'],
    // queryFn is not strictly needed here if @tanstack/react-query is configured with a default queryFn
    // but if it were, it would be: async () => fetch('/api/users/profile').then(res => res.json())
  });

  if (isLoading) {
    return (
      <Alert className="mb-6 bg-gray-100 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-full"></div>
      </Alert>
    );
  }

  // If verification is completed, no need to show the banner
  if (profileData?.user?.verificationStatus === "completed") {
    return null;
  }

  // If no profile data yet, show verification alert
  const needsProfile = !profileData?.profile;
  // If no documents uploaded yet, show documents alert
  const needsDocuments = !profileData?.documents || profileData.documents.length === 0;

  return (
    <Alert className="mb-6 bg-blue-50 border-l-4 border-primary p-4 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <AlertDescription className="ml-3 text-sm text-blue-800">
          {needsProfile ? (
            <>
              Complete your profile information to begin the verification process.
              <Link href="/profile" className="font-medium underline ml-1">
                Click here
              </Link> to complete your profile.
            </>
          ) : needsDocuments ? (
            <>
              Upload your identification documents to continue the verification process.
              <Link href="/documents" className="font-medium underline ml-1">
                Click here
              </Link> to upload your documents.
            </>
          ) : (
            <>
              Your verification is in progress. You'll receive a notification when it's completed.
              <Link href="/profile" className="font-medium underline ml-1">
                View status
              </Link>.
            </>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}
