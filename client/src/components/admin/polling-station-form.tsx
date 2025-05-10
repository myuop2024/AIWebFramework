import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MapPin, Check } from "lucide-react";

// Define the form schema with validation
const pollingStationSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  capacity: z.string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Number(val)),
      { message: "Capacity must be a number" }
    )
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  latitude: z.string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Number(val)),
      { message: "Latitude must be a number" }
    )
    .transform((val) => (val ? parseFloat(val) : undefined)),
  longitude: z.string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Number(val)),
      { message: "Longitude must be a number" }
    )
    .transform((val) => (val ? parseFloat(val) : undefined)),
  isActive: z.boolean().default(true),
});

type PollingStationFormValues = z.infer<typeof pollingStationSchema>;

interface PollingStation {
  id?: number;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  region?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

interface PollingStationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PollingStationFormValues) => void;
  station?: PollingStation;
  title: string;
}

export function PollingStationForm({
  isOpen,
  onClose,
  onSubmit,
  station,
  title,
}: PollingStationFormProps) {
  const [coordinates, setCoordinates] = useState<{ lat?: number; lng?: number }>({
    lat: station?.latitude,
    lng: station?.longitude,
  });

  const form = useForm<PollingStationFormValues>({
    resolver: zodResolver(pollingStationSchema),
    defaultValues: {
      name: station?.name || "",
      code: station?.code || "",
      address: station?.address || "",
      city: station?.city || "",
      region: station?.region || "",
      capacity: station?.capacity ? String(station.capacity) : "",
      latitude: station?.latitude ? String(station.latitude) : "",
      longitude: station?.longitude ? String(station.longitude) : "",
      isActive: station?.isActive !== undefined ? station.isActive : true,
    },
  });

  // Update form when station prop changes
  useEffect(() => {
    if (station) {
      form.reset({
        name: station.name || "",
        code: station.code || "",
        address: station.address || "",
        city: station.city || "",
        region: station.region || "",
        capacity: station.capacity ? String(station.capacity) : "",
        latitude: station.latitude ? String(station.latitude) : "",
        longitude: station.longitude ? String(station.longitude) : "",
        isActive: station.isActive !== undefined ? station.isActive : true,
      });
      setCoordinates({
        lat: station.latitude,
        lng: station.longitude,
      });
    }
  }, [station, form]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleSubmit = (values: PollingStationFormValues) => {
    onSubmit(values);
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoordinates({ lat, lng });
          form.setValue("latitude", String(lat));
          form.setValue("longitude", String(lng));
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {station ? "Edit the details of this polling station." : "Enter the details for the new polling station."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Station Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter station name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station Code</FormLabel>
                    <FormControl>
                      <Input placeholder="STN001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional unique identifier
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="250"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of voters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter full address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City/Town</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region/State</FormLabel>
                    <FormControl>
                      <Input placeholder="Region" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <FormLabel>Coordinates</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation}>
                    <MapPin className="h-4 w-4 mr-1" />
                    Get Current Location
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input placeholder="0.000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input placeholder="0.000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>
                          Mark this polling station as active for assignments
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                <Check className="h-4 w-4 mr-2" />
                {station ? "Update Station" : "Create Station"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}