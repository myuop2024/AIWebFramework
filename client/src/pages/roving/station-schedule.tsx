import { useState } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { MapPin, Route, Calendar as CalendarIcon } from "lucide-react";

export default function StationSchedulePage() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <RoleGuard allowedRoles={["roving_observer", "supervisor", "admin", "director"]}>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Station Schedule</h1>
            <p className="text-muted-foreground">
              Plan your visits to polling stations in your assigned area
            </p>
          </div>
          <Button>
            <Route className="mr-2 h-4 w-4" />
            Plan Route
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  Select Date
                </CardTitle>
                <CardDescription>
                  View your schedule for a specific date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="border rounded-md p-3"
                />
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Assigned Stations
                </CardTitle>
                <CardDescription>
                  Polling stations in your area requiring visits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="p-4">
                    <div className="text-center p-6">
                      <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No stations assigned yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Contact your supervisor to get assigned to polling stations.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}