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
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-gray-200 rounded-md"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-md"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-80 bg-gray-200 rounded-md"></div>
              <div className="h-80 bg-gray-200 rounded-md"></div>
            </div>
            <div className="space-y-6">
              <div className="h-60 bg-gray-200 rounded-md"></div>
              <div className="h-60 bg-gray-200 rounded-md"></div>
              <div className="h-60 bg-gray-200 rounded-md"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Alert Banner */}
      <AlertBanner />

      {/* Status Cards */}
      <StatusCards />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Events */}
          <UpcomingEvents />

          {/* Recent Reports */}
          <RecentReports />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Access */}
          <QuickAccess />

          {/* QR Code */}
          <QRCode />

          {/* Latest News */}
          <LatestNews />
        </div>
      </div>
    </div>
  );
}