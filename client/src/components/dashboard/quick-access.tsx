import { useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText, Upload, MapPin, Calendar, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import QuickIncidentButton from "@/components/reports/quick-incident-button";

interface QuickAccessItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  href: string;
  primary?: boolean;
}

export default function QuickAccess() {
  const [, navigate] = useLocation();
  
  const quickAccessItems: QuickAccessItem[] = [
    {
      id: "submit-report",
      title: "Submit New Report",
      icon: <FileText className="h-5 w-5 mr-3" />,
      href: "/reports/new",
      primary: true
    },
    {
      id: "upload-document",
      title: "Upload Document",
      icon: <Upload className="h-5 w-5 text-gray-500 mr-3" />,
      href: "/documents/upload"
    },
    {
      id: "check-in",
      title: "Check-in to Station",
      icon: <MapPin className="h-5 w-5 text-gray-500 mr-3" />,
      href: "/polling-stations/check-in"
    },
    {
      id: "view-schedule",
      title: "View Schedule",
      icon: <Calendar className="h-5 w-5 text-gray-500 mr-3" />,
      href: "/calendar"
    }
  ];

  const handleItemClick = (item: QuickAccessItem) => {
    navigate(item.href);
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium">Quick Access</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Quick Incident Report Button */}
        <QuickIncidentButton
          variant="destructive"
          className="w-full justify-between px-3 py-3 h-auto"
          showIcon={true}
          label="Report Incident"
        />
        
        {/* Regular Quick Access Items */}
        {quickAccessItems.map((item) => (
          <Button
            key={item.id}
            variant={item.primary ? "default" : "outline"}
            className={`w-full justify-between px-3 py-3 h-auto ${
              item.primary 
                ? "bg-primary-light/10 text-primary hover:bg-primary-light/20" 
                : "border border-gray-200 text-gray-700"
            }`}
            onClick={() => handleItemClick(item)}
          >
            <div className="flex items-center">
              {item.icon}
              <span className="font-medium">{item.title}</span>
            </div>
            <ChevronRight className={`h-5 w-5 ${item.primary ? "" : "text-gray-400"}`} />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
