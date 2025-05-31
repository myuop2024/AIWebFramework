// client/src/components/admin/event-management-panel.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type EventStatusType = "default" | "destructive" | "outline" | "secondary" | "info" | "success";


const EventItemCard: React.FC<{ title: string, status: string, date: string, statusType?: EventStatusType }> =
({ title, status, date, statusType = "outline" }) => {
  let badgeVariant: "default" | "destructive" | "outline" | "secondary" = "outline";
  let computedClassName = "";

  switch (statusType) {
    case "success": // Active
      badgeVariant = "default"; // Green in shadcn default theme
      computedClassName = "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600";
      break;
    case "info": // Upcoming
      badgeVariant = "default";
      computedClassName = "bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600";
      break;
    case "destructive":
      badgeVariant = "destructive";
      break;
    default:
      badgeVariant = "outline";
      break;
  }

  return (
  <Card className="mb-4">
    <CardHeader className="pb-3">
      <div className="flex justify-between items-start">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Badge variant={badgeVariant} className={computedClassName}>
          {status}
        </Badge>
      </div>
      <CardDescription>{date}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap gap-2"> {/* Use flex-wrap for better responsiveness */}
        <Button size="sm">Edit</Button>
        <Button size="sm" variant="outline">Assignments/Participants</Button>
        {/* Assuming a success-like variant for View Reports or use default */}
        <Button size="sm" variant="default" className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700">
          View Reports
        </Button>
         {status === "Upcoming" && <Button size="sm" variant="destructive">Cancel</Button>}
      </div>
    </CardContent>
  </Card>
  );
};

export function EventManagementPanel() { // Named export
  const { toast } = useToast();

  const handleSendEventNotificationInternal = () => {
      // TODO: Add logic to gather data from inputs like event title, message
      toast({
          title: "Event Notification Sent",
          description: "Your event notification has been sent to all participants.",
      });
  };

  // TODO: Replace with actual data
  const events = [
    { title: "Election Day", status: "Active", date: "May 5, 2025", statusType: "success" as EventStatusType },
    { title: "Observer Training Session", status: "Upcoming", date: "April 20, 2025", statusType: "info" as EventStatusType },
    { title: "Post-Election Review", status: "Completed", date: "May 10, 2025", statusType: "outline" as EventStatusType },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Event Management</h2>
        <Button>Add New Event</Button>
      </div>
      <div className="space-y-4">
        {events.map((event, index) => (
          <EventItemCard key={index} {...event} />
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Event Communication</CardTitle>
          <CardDescription>Send notifications for selected or all events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-comm-title">Event Title (Select or type)</Label>
            <Input id="event-comm-title" placeholder="Select or enter event title (e.g., 'All Upcoming')" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-comm-message">Message</Label>
            <Input id="event-comm-message" placeholder="Enter message content" />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Switch id="event-comm-send-sms" />
            <Label htmlFor="event-comm-send-sms">Also send as SMS (if available)</Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSendEventNotificationInternal}>Send Event Notification</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
