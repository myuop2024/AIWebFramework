import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, isAfter, isBefore, parseISO } from 'date-fns';

import { Assignment, PollingStation } from '@shared/schema';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, CheckCircle, ClipboardList, Clock, MapPin, Plus } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { assignmentStatusColors } from '@/lib/utils';
import { AssignmentScheduler, AssignmentCard } from '@/components/assignments/assignment-scheduler';
import MainLayout from "@/components/layout/main-layout";

// Helper function to format date range
const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Same day
  if (start.toDateString() === end.toDateString()) {
    return `${format(start, 'MMM d, yyyy')} · ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  }
  
  // Different days
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
};

export default function AssignmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [showScheduler, setShowScheduler] = useState(false);

  // Fetch all assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery<(Assignment & { station?: PollingStation })[]>({
    queryKey: ['/api/users/assignments']
  });

  // Fetch active assignments
  const { data: activeAssignments, isLoading: activeAssignmentsLoading } = useQuery<(Assignment & { station?: PollingStation })[]>({
    queryKey: ['/api/users/assignments/active']
  });

  // Check-in mutation
  const checkIn = useMutation({
    mutationFn: async (assignmentId: number) => {
      const res = await apiRequest('POST', `/api/assignments/${assignmentId}/check-in`, {});
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/users/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/assignments/active'] });
      
      // Show success toast
      toast({
        title: "Checked in successfully",
        description: "You have been checked in to your assignment."
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Check-in failed",
        description: error.message || "There was an error checking in to your assignment.",
        variant: "destructive"
      });
    }
  });

  // Check-out mutation
  const checkOut = useMutation({
    mutationFn: async (assignmentId: number) => {
      const res = await apiRequest('POST', `/api/assignments/${assignmentId}/check-out`, {});
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/users/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/assignments/active'] });
      
      // Show success toast
      toast({
        title: "Checked out successfully",
        description: "You have been checked out of your assignment."
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Check-out failed",
        description: error.message || "There was an error checking out of your assignment.",
        variant: "destructive"
      });
    }
  });

  // Helper to filter assignments
  const filterAssignments = (status: string) => {
    if (!assignments) return [];
    
    const now = new Date();
    
    if (status === 'active') {
      return assignments.filter(a => 
        a.status === 'active' || 
        (a.status === 'scheduled' && isAfter(now, new Date(a.startDate)) && isBefore(now, new Date(a.endDate)))
      );
    }
    
    if (status === 'upcoming') {
      return assignments.filter(a => 
        a.status === 'scheduled' && 
        isAfter(new Date(a.startDate), now)
      );
    }
    
    if (status === 'past') {
      return assignments.filter(a => 
        a.status === 'completed' || 
        (a.status !== 'cancelled' && isAfter(now, new Date(a.endDate)))
      );
    }
    
    return [];
  };

  const handleCheckIn = (assignmentId: number) => {
    checkIn.mutate(assignmentId);
  };

  const handleCheckOut = (assignmentId: number) => {
    checkOut.mutate(assignmentId);
  };

  const activeItems = filterAssignments('active');
  const upcomingItems = filterAssignments('upcoming');
  const pastItems = filterAssignments('past');

  return (
    <AuthGuard>
      <MainLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
              <p className="text-muted-foreground">
                Manage your polling station assignments
              </p>
            </div>
            <Button 
              onClick={() => setShowScheduler(!showScheduler)} 
              className="self-end md:self-auto"
            >
              {showScheduler ? (
                "Cancel"
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  New Assignment
                </>
              )}
            </Button>
          </div>

          {showScheduler && (
            <div className="my-6">
              <AssignmentScheduler 
                onSuccess={() => setShowScheduler(false)}
              />
            </div>
          )}

          <Tabs 
            defaultValue="upcoming" 
            value={selectedTab} 
            onValueChange={setSelectedTab}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Active</span>
                {activeItems.length > 0 && 
                  <span className="rounded-full bg-primary text-primary-foreground ml-1 px-2 py-0.5 text-xs">
                    {activeItems.length}
                  </span>
                }
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span>Upcoming</span>
                {upcomingItems.length > 0 && 
                  <span className="rounded-full bg-primary text-primary-foreground ml-1 px-2 py-0.5 text-xs">
                    {upcomingItems.length}
                  </span>
                }
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Past</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeAssignmentsLoading ? (
                <div className="text-center py-6">Loading active assignments...</div>
              ) : activeItems.length === 0 ? (
                <div className="text-center py-10">
                  <div className="mx-auto rounded-full bg-muted w-12 h-12 flex items-center justify-center mb-3">
                    <CheckCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg">No active assignments</h3>
                  <p className="text-muted-foreground mt-1">
                    You don't have any active assignments at the moment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeItems.map((assignment) => (
                    <AssignmentCard 
                      key={assignment.id}
                      assignment={assignment}
                      onCheckIn={() => handleCheckIn(assignment.id)}
                      onCheckOut={() => handleCheckOut(assignment.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {assignmentsLoading ? (
                <div className="text-center py-6">Loading upcoming assignments...</div>
              ) : upcomingItems.length === 0 ? (
                <div className="text-center py-10">
                  <div className="mx-auto rounded-full bg-muted w-12 h-12 flex items-center justify-center mb-3">
                    <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg">No upcoming assignments</h3>
                  <p className="text-muted-foreground mt-1">
                    You don't have any scheduled assignments coming up.
                  </p>
                  <Button 
                    onClick={() => setShowScheduler(true)} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Assignment
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingItems.map((assignment) => (
                    <AssignmentCard 
                      key={assignment.id}
                      assignment={assignment}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {assignmentsLoading ? (
                <div className="text-center py-6">Loading past assignments...</div>
              ) : pastItems.length === 0 ? (
                <div className="text-center py-10">
                  <div className="mx-auto rounded-full bg-muted w-12 h-12 flex items-center justify-center mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg">No past assignments</h3>
                  <p className="text-muted-foreground mt-1">
                    You don't have any completed assignments yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastItems.map((assignment) => (
                    <AssignmentCard 
                      key={assignment.id}
                      assignment={assignment}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}