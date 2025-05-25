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
import { ResponsiveContainer } from "@/components/ui/responsive-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user, isLoading } = useAuth();

  // Prefetch related data
  useQuery({ queryKey: ['/api/users/profile'] });
  useQuery({ queryKey: ['/api/events/upcoming'] });
  useQuery({ queryKey: ['/api/reports'] });
  useQuery({ queryKey: ['/api/users/assignments'] });
  useQuery({ queryKey: ['/api/news/latest'] });

  if (isLoading) {
    return (
      <ResponsiveContainer className="py-6">
        <div className="animate-pulse space-y-6">
          {/* Alert Banner Skeleton */}
          <Skeleton className="h-16 w-full rounded-lg" />
          
          {/* Status Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          
          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-80 rounded-lg" />
              <Skeleton className="h-80 rounded-lg" />
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              <Skeleton className="h-60 rounded-lg" />
              <Skeleton className="h-60 rounded-lg" />
              <Skeleton className="h-60 rounded-lg" />
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer className="py-4 sm:py-6">
      {/* Alert Banner */}
      <div className="mb-6">
        <AlertBanner />
      </div>

      {/* Status Cards */}
      <div className="mb-6">
        <StatusCards />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Events */}
          <div className="card-modern">
            <UpcomingEvents />
          </div>

          {/* Recent Reports */}
          <div className="card-modern">
            <RecentReports />
          </div>
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="space-y-6">
          {/* Quick Access */}
          <div className="card-modern">
            <QuickAccess />
          </div>

          {/* QR Code */}
          <div className="card-modern">
            <QRCode />
          </div>

          {/* Latest News */}
          <div className="card-modern">
            <LatestNews />
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}