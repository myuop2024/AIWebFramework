import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpcomingEvents() {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['/api/events/upcoming'],
  });

  // Format date for display
  const formatEventDate = (date: string) => {
    const eventDate = new Date(date);
    return {
      day: eventDate.getDate(),
      month: eventDate.toLocaleString('en-US', { month: 'short' })
    };
  };

  // Format time for display
  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return `${start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-200">
          {[1, 2].map(i => (
            <div key={i} className="p-6 animate-pulse">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
                <div className="ml-4 flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="ml-4">
                  <Skeleton className="h-9 w-16" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <Skeleton className="h-4 w-32" />
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    const errorMsg = error?.response?.data?.error || error?.data?.error || error?.message || "Please try again later.";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading events: {errorMsg}</p>
        </CardContent>
      </Card>
    );
  }

  // No events
  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-gray-500">No upcoming events scheduled.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium">Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-200">
        {events.map((event) => {
          const { day, month } = formatEventDate(event.startTime);
          const timeRange = formatEventTime(event.startTime, event.endTime);
          const isTraining = event.eventType.toLowerCase() === "training";
          
          return (
            <div key={event.id} className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-lg bg-primary-light/10 flex flex-col items-center justify-center text-center">
                    <span className="text-primary font-medium text-lg leading-none">{day}</span>
                    <span className="text-primary text-xs mt-1">{month}</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-base font-medium text-gray-900">{event.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  <div className="mt-3 flex items-center text-sm">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-gray-500">{timeRange}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-gray-500">{event.location}</span>
                  </div>
                </div>
                <div className="ml-4">
                  {isTraining ? (
                    <Button size="sm">Join</Button>
                  ) : (
                    <Button variant="outline" size="sm">View</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <Link href="/calendar" className="text-sm font-medium text-primary hover:text-primary-dark">
          View all events
        </Link>
      </CardFooter>
    </Card>
  );
}
