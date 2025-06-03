import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Clock, CheckCircle, FileText, MapPin, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Report, Assignment, User } from "@shared/schema";

interface VerificationStatus {
  status: "pending" | "in-progress" | "completed";
  stepsCompleted: number;
  totalSteps: number;
}

interface TrainingStatus {
  status: "pending" | "in-progress" | "completed";
  modulesCompleted: number;
  totalModules: number;
}

interface ReportStatus {
  count: number;
  lastSubmitted: Date | null;
  nextDue: Date | null;
}

interface PollingStationStatus {
  count: number;
  primary: string | null;
}

// Define structure for the profile data specific to this component's needs
interface DashboardProfileData {
  user?: Partial<User> & { // User might be partial and have specific fields for this dashboard view
    verificationStatus?: string;
    trainingStatus?: string;
    observerId?: string;
  };
  profile?: any; // Define more specifically if UserProfile type is available and imported
  documents?: Document[]; // Assuming Document type is defined or imported, or use any[]
}

// Assuming a basic Document type if not imported from shared/schema
interface Document { id: number; [key: string]: any; }

export default function StatusCards() {
  // Access the user data from auth context for consistent observer ID display
  const { user: authUser } = useAuth();
  
  // Fetch user profile data
  const { data: profileData, isLoading: isProfileLoading } = useQuery<DashboardProfileData>({
    queryKey: ['/api/users/profile'],
  });

  // Fetch reports data
  const { data: reportsData, isLoading: isReportsLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
  });

  // Fetch assignments data
  const { data: assignmentsData, isLoading: isAssignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/users/assignments'],
  });

  // Calculate verification status
  const verificationStatus: VerificationStatus = {
    status: (profileData?.user?.verificationStatus as "pending" | "in-progress" | "completed") || "pending",
    stepsCompleted: 0,
    totalSteps: 3
  };

  if (profileData?.profile) {
    verificationStatus.stepsCompleted++;
  }
  
  if (profileData?.documents?.length > 0) {
    verificationStatus.stepsCompleted++;
  }

  if (profileData?.user?.verificationStatus === "completed") {
    verificationStatus.stepsCompleted = 3;
  }

  // Calculate training status
  const trainingStatus: TrainingStatus = {
    status: (profileData?.user?.trainingStatus as "pending" | "in-progress" | "completed") || "pending",
    modulesCompleted: 3, // Mock data - would be calculated from actual user training progress
    totalModules: 3
  };

  // Calculate report status
  const reportStatus: ReportStatus = {
    count: reportsData?.length || 0,
    lastSubmitted: (reportsData && reportsData.length > 0 && reportsData[0].submittedAt) ? new Date(reportsData[0].submittedAt) : null,
    nextDue: new Date() // Today's date as mock data
  };

  // Calculate polling station status
  const pollingStationStatus: PollingStationStatus = {
    count: assignmentsData?.length || 0,
    primary: assignmentsData?.find((a: Assignment) => a.isPrimary)?.station?.name || null
  };

  // Get the observer ID from profile data or context
  const observerId = profileData?.user?.observerId || authUser?.observerId || '';
  
  // Loading skeleton
  if (isProfileLoading || isReportsLoading || isAssignmentsLoading) {
    return (
      <>
        {/* Observer ID Banner skeleton - matched to the card style */}
        <div className="bg-white rounded-lg shadow mb-4 animate-pulse">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="h-5 bg-gray-200 rounded w-36"></div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="h-3 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-40 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-56"></div>
            </div>
            <div className="h-16 w-16 rounded-lg bg-gray-200"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-5 animate-pulse">
              <div className="flex justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2"></div>
                <div className="h-4 bg-gray-200 rounded w-40 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Observer ID Banner - styled to match the QR code component */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Your Observer ID</h3>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div className="flex flex-col">
            <p className="text-sm text-gray-500 mb-1">Your Observer ID</p>
            <p className="text-3xl font-bold tracking-wide text-gray-800">{observerId}</p>
            <p className="text-xs text-gray-500 mt-2">
              Use this ID to identify yourself to election officials
            </p>
          </div>
          <div className="h-16 w-16 rounded-lg bg-primary flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Verification Status Card */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Verification Status</p>
              <p className="text-lg font-medium text-gray-900">
                {verificationStatus.status === "pending" && "Pending"}
                {verificationStatus.status === "in-progress" && "In Progress"}
                {verificationStatus.status === "completed" && "Completed"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              {verificationStatus.status === "completed" ? (
                <CheckCircle className="h-6 w-6 text-success" />
              ) : (
                <Clock className="h-6 w-6 text-warning" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`${
                  verificationStatus.status === "completed"
                    ? "bg-success"
                    : "bg-warning"
                } h-2 rounded-full`}
                style={{ width: `${(verificationStatus.stepsCompleted / verificationStatus.totalSteps) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {verificationStatus.stepsCompleted} of {verificationStatus.totalSteps} steps completed
            </p>
          </div>
        </div>
      
      {/* Training Status Card */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Training Status</p>
            <p className="text-lg font-medium text-gray-900">
              {trainingStatus.status === "pending" && "Pending"}
              {trainingStatus.status === "in-progress" && "In Progress"}
              {trainingStatus.status === "completed" && "Completed"}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-success h-2 rounded-full" 
              style={{ width: `${(trainingStatus.modulesCompleted / trainingStatus.totalModules) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {trainingStatus.modulesCompleted} of {trainingStatus.totalModules} modules completed
          </p>
        </div>
      </div>
      
      {/* Reports Submitted Card */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Reports Submitted</p>
            <p className="text-lg font-medium text-gray-900">{reportStatus.count}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs text-gray-500">
            Last submitted:{" "}
            <span className="font-medium">
              {reportStatus.lastSubmitted
                ? new Date(reportStatus.lastSubmitted).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : "None"}
            </span>
          </p>
          <p className="text-xs text-gray-500">
            Next report due:{" "}
            <span className="font-medium text-primary">Today</span>
          </p>
        </div>
      </div>
      
      {/* Assigned Polling Stations Card */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Assigned Polling Stations</p>
            <p className="text-lg font-medium text-gray-900">{pollingStationStatus.count}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs text-gray-500">
            Primary:{" "}
            <span className="font-medium">
              {pollingStationStatus.primary || "Not assigned"}
            </span>
          </p>
          <Link href="/polling-stations">
            <span className="text-xs text-primary font-medium mt-1 inline-block cursor-pointer">
              View all stations
            </span>
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
