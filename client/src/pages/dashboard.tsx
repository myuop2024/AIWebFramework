import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import AlertBanner from "@/components/dashboard/alert-banner";
import StatusCards from "@/components/dashboard/status-cards";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import RecentReports from "@/components/dashboard/recent-reports";
import QuickAccess from "@/components/dashboard/quick-access";
import QRCode from "@/components/dashboard/qr-code";
import LatestNews from "@/components/dashboard/latest-news";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ModernCard } from "@/components/ui/modern-card";
import { Skeleton } from "@/components/ui/skeleton";
import LeaderboardTable, { LeaderboardEntry } from "@/components/gamification/LeaderboardTable";

export default function Dashboard() {
  const { user, isLoading } = useAuth();

  // Prefetch related data
  useQuery({ queryKey: ['/api/users/profile'] });
  useQuery({ queryKey: ['/api/events/upcoming'] });
  useQuery({ queryKey: ['/api/reports'] });
  useQuery({ queryKey: ['/api/users/assignments'] });
  useQuery({ queryKey: ['/api/news/latest'] });

  const { data: overallLeaderboardData, isLoading: isOverallLeaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/gamification/leaderboard/overall'],
    queryFn: async () => {
      const response = await fetch('/api/gamification/leaderboard/overall?limit=5'); // Fetch top 5 for dashboard
      if (!response.ok) throw new Error('Failed to fetch overall leaderboard');
      return response.json();
    },
    staleTime: 300000, // Cache for 5 minutes
  });

  const { data: weeklyLeaderboardData, isLoading: isWeeklyLeaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/gamification/leaderboard/weekly'],
    queryFn: async () => {
      const response = await fetch('/api/gamification/leaderboard/weekly?limit=5'); // Fetch top 5 for dashboard
      if (!response.ok) throw new Error('Failed to fetch weekly leaderboard');
      return response.json();
    },
    staleTime: 60000, // Cache for 1 minute, as it's more dynamic
  });

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="animate-pulse space-y-8">
          {/* Alert Banner Skeleton */}
          <Skeleton className="h-20 w-full rounded-2xl" />
          
          {/* Status Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
          
          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-96 rounded-2xl" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
            
            {/* Right Column */}
            <div className="space-y-8">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper 
      title="Dashboard"
      subtitle="Welcome back! Here's what's happening with your election monitoring activities."
    >
      {/* Alert Banner */}
      <AlertBanner />

      {/* Status Cards */}
      <StatusCards />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Events */}
          <ModernCard variant="elevated">
            <UpcomingEvents />
          </ModernCard>

          {/* Recent Reports */}
          <ModernCard variant="glass">
            <RecentReports />
          </ModernCard>

          {/* Leaderboards Section */}
          <ModernCard variant="outline"> {/* Or other suitable variant */}
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Activity Leaderboards</h2>
              {(isOverallLeaderboardLoading || isWeeklyLeaderboardLoading) ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-8 w-1/3 mt-4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  {overallLeaderboardData && overallLeaderboardData.length > 0 ? (
                    <LeaderboardTable
                      title="Overall Top Observers"
                      entries={overallLeaderboardData}
                      currentUserId={user?.id} // Assuming user object has id
                    />
                  ) : (
                    <p>Overall leaderboard data is not available.</p>
                  )}
                  {weeklyLeaderboardData && weeklyLeaderboardData.length > 0 ? (
                    <LeaderboardTable
                      title="This Week's Top Observers"
                      entries={weeklyLeaderboardData}
                      currentUserId={user?.id} // Assuming user object has id
                    />
                  ) : (
                    <p>Weekly leaderboard data is not available.</p>
                  )}
                </div>
              )}
            </div>
          </ModernCard>
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="space-y-8">
          {/* Quick Access */}
          <ModernCard variant="gradient">
            <QuickAccess />
          </ModernCard>

          {/* QR Code */}
          <ModernCard variant="default">
            <QRCode />
          </ModernCard>

          {/* Latest News */}
          <ModernCard variant="elevated">
            <LatestNews />
          </ModernCard>
        </div>
      </div>
    </PageWrapper>
  );
}