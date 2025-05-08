import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  ClipboardCheck, 
  Clock, 
  MapPin, 
  Award,
  CheckCircle2,
  AlertTriangle,
  User
} from "lucide-react";

// Observer status summary for the dashboard
export default function ObserverStatusSummary() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  
  // Define the types for assignments and reports
  interface Assignment {
    id: number;
    userId: number;
    stationId: number;
    stationName?: string;
    stationAddress?: string;
    startDate: string;
    endDate: string;
    status: string;
    role?: string;
  }

  interface Report {
    id: number;
    userId: number;
    stationId: number;
    reportType: string;
    status: string;
    submittedAt: string;
  }

  interface UserProfile {
    userId: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    profilePhotoUrl?: string;
    idPhotoUrl?: string;
  }

  // Query assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/users/assignments'],
    enabled: !!user,
  });
  
  // Query reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports', { userId: user?.id }],
    enabled: !!user,
  });
  
  // Query profile completion
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/users/profile'],
    enabled: !!user,
  });

  // Calculate profile completion percentage
  useEffect(() => {
    if (profile) {
      // Animate progress from 0 to the calculated value
      const timer = setTimeout(() => {
        // Calculate based on filled profile fields
        const requiredFields = ['address', 'city', 'state', 'country', 'profilePhotoUrl', 'idPhotoUrl'];
        const filledFields = requiredFields.filter(field => 
          // Safely check if the field exists and has a value
          field in profile && !!profile[field as keyof UserProfile]
        );
        const completionPercentage = Math.round((filledFields.length / requiredFields.length) * 100);
        
        setProgress(completionPercentage);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [profile]);

  // Get quick stats from assignments and reports
  const getStats = () => {
    if (assignmentsLoading || reportsLoading || !assignments || !reports) {
      return {
        totalAssignments: '...',
        completedAssignments: '...',
        pendingAssignments: '...',
        totalReports: '...',
        stationsVisited: '...',
        nextAssignment: null,
        certificationLevel: '...'
      };
    }
    
    // Calculate statistics
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    const pendingAssignments = assignments.filter(a => a.status === 'scheduled' || a.status === 'active').length;
    
    // Get unique stations visited (based on stationId in reports)
    const stationIds = new Set(reports.map(r => r.stationId));
    const stationsVisited = stationIds.size;
    
    // Find the next scheduled assignment (soonest startDate)
    const pendingAssignmentsList = assignments.filter(a => a.status === 'scheduled');
    pendingAssignmentsList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const nextAssignment = pendingAssignmentsList.length > 0 ? pendingAssignmentsList[0] : null;
    
    // Determine certification level based on reports and assignments
    let certificationLevel = 'Trainee';
    if (completedAssignments >= 10 && reports.length >= 20) {
      certificationLevel = 'Expert';
    } else if (completedAssignments >= 5 && reports.length >= 10) {
      certificationLevel = 'Advanced';
    } else if (completedAssignments >= 2) {
      certificationLevel = 'Certified';
    }
    
    return {
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      totalReports: reports.length,
      stationsVisited,
      nextAssignment,
      certificationLevel
    };
  };

  const stats = getStats();
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  // Format time for display
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Observer Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Observer Status
          </CardTitle>
          <CardDescription>
            Your current observer status and profile completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="pt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Verification Status</span>
                {user?.verificationStatus === 'verified' ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    Verified
                  </Badge>
                ) : user?.verificationStatus === 'pending' ? (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                    Pending
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-red-500 hover:bg-red-600">
                    Unverified
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-600">Observer Level</span>
                <Badge variant="outline" className="font-medium border-primary text-primary">
                  {stats.certificationLevel}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-600">Training Status</span>
                {user?.trainingStatus === 'completed' ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    Completed
                  </Badge>
                ) : user?.trainingStatus === 'in_progress' ? (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                    In Progress
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                    Required
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Assignments Stats Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Assignment Stats
          </CardTitle>
          <CardDescription>
            Your polling station assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Assignments</p>
                <p className="text-2xl font-bold">{stats.completedAssignments}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Assignments</p>
                <p className="text-2xl font-bold">{stats.pendingAssignments}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stations Visited</p>
                <p className="text-2xl font-bold">{stats.stationsVisited}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Next Assignment Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Next Assignment
          </CardTitle>
          <CardDescription>
            {stats.nextAssignment 
              ? "Your upcoming polling station duty" 
              : "No upcoming assignments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.nextAssignment ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <h3 className="font-medium">{stats.nextAssignment.stationName || "Polling Station"}</h3>
                
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{formatDate(stats.nextAssignment.startDate)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{formatTime(stats.nextAssignment.startDate)} - {formatTime(stats.nextAssignment.endDate)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="line-clamp-2">{stats.nextAssignment.stationAddress || 'Address information not available'}</span>
                  </div>
                  
                  <div className="mt-3">
                    <Badge className="text-xs" variant="outline">{stats.nextAssignment.role || 'Observer'}</Badge>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>Check-in required</span>
                </div>
                
                <Badge variant={stats.nextAssignment.status === 'active' ? 'default' : 'secondary'}>
                  {stats.nextAssignment.status === 'active' ? 'In Progress' : 'Scheduled'}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex flex-col items-center justify-center text-center p-4">
              <Award className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">You have no upcoming assignments</p>
              <p className="text-xs text-gray-400 mt-1">
                Check the assignments page for future opportunities
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}