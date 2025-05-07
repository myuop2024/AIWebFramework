import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { HereAutocompleteResult, hereMapsService } from "@/lib/here-maps";
import AddressAutocomplete from "@/components/address/address-autocomplete";
import InteractiveMap from "@/components/mapping/interactive-map";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Create a schema for polling station form
const pollingStationFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Please enter a valid address." }),
  city: z.string().min(2, { message: "City is required." }),
  state: z.string().min(2, { message: "State/Province is required." }),
  zipCode: z.string().min(1, { message: "Postal code is required." }),
  stationCode: z.string().min(2, { message: "Station code is required." }),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1." }),
  status: z.string().min(1, { message: "Status is required." }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Define the form values type
type PollingStationFormValues = z.infer<typeof pollingStationFormSchema>;

interface PollingStationFormProps {
  initialData?: any;
  onSubmit: (data: PollingStationFormValues) => void;
  isSubmitting?: boolean;
}

export default function PollingStationForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: PollingStationFormProps) {
  const { toast } = useToast();
  const [addressDetails, setAddressDetails] = useState<HereAutocompleteResult | null>(null);
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(
    initialData?.latitude && initialData?.longitude
      ? { lat: initialData.latitude, lng: initialData.longitude }
      : null
  );

  // Initialize the form
  const form = useForm<PollingStationFormValues>({
    resolver: zodResolver(pollingStationFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      address: initialData?.address || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zipCode: initialData?.zipCode || "",
      stationCode: initialData?.stationCode || "",
      capacity: initialData?.capacity || 5,
      status: initialData?.status || "active",
      latitude: initialData?.latitude || undefined,
      longitude: initialData?.longitude || undefined,
    },
  });

  // Handle address selection from autocomplete
  const handleAddressSelect = async (address: string, details?: HereAutocompleteResult) => {
    form.setValue("address", address);
    
    if (details) {
      setAddressDetails(details);
      form.setValue("city", details.address.city || "");
      form.setValue("state", details.address.state || "");
      form.setValue("zipCode", details.address.postalCode || "");
      
      if (details.position) {
        form.setValue("latitude", details.position.lat);
        form.setValue("longitude", details.position.lng);
        setMapCoordinates({ lat: details.position.lat, lng: details.position.lng });
      }
    } else {
      // If user manually typed an address, try to geocode it
      try {
        const result = await hereMapsService.geocodeAddress(address);
        if (result) {
          form.setValue("city", result.address.city || "");
          form.setValue("state", result.address.state || "");
          form.setValue("zipCode", result.address.postalCode || "");
          
          if (result.position) {
            form.setValue("latitude", result.position.lat);
            form.setValue("longitude", result.position.lng);
            setMapCoordinates({ lat: result.position.lat, lng: result.position.lng });
          }
        }
      } catch (error) {
        console.error("Error geocoding address:", error);
      }
    }
  };

  // Handle map click to update location
  const handleMapClick = (lat: number, lng: number) => {
    setMapCoordinates({ lat, lng });
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
    
    // Reverse geocode to get address details
    reverseGeocode(lat, lng);
  };
  
  // Reverse geocode a location to get address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const result = await hereMapsService.reverseGeocode(lat, lng);
      if (result) {
        form.setValue("address", result.address.label || "");
        form.setValue("city", result.address.city || "");
        form.setValue("state", result.address.state || "");
        form.setValue("zipCode", result.address.postalCode || "");
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      toast({
        title: "Geocoding Error",
        description: "Could not retrieve address for selected location.",
        variant: "destructive",
      });
    }
  };

  // Form submission handler
  const handleFormSubmit = (data: PollingStationFormValues) => {
    // Ensure coordinates are present
    if (!data.latitude || !data.longitude) {
      toast({
        title: "Location Required",
        description: "Please select a location on the map or use the address search.",
        variant: "destructive",
      });
      return;
    }
    
    onSubmit(data);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter station name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={handleAddressSelect}
                          placeholder="Search for an address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="State/Province" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Postal Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Station Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Station Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Observer Capacity" 
                            {...field} 
                            min={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="closed">Closed</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Hidden fields for coordinates */}
              <input type="hidden" {...form.register("latitude")} />
              <input type="hidden" {...form.register("longitude")} />
            </div>

            <div>
              <Card className="p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium mb-1">Select Location on Map</h3>
                  <p className="text-xs text-muted-foreground">
                    Click on the map to set the exact location of the polling station
                  </p>
                </div>
                <InteractiveMap
                  latitude={mapCoordinates?.lat}
                  longitude={mapCoordinates?.lng}
                  markers={mapCoordinates ? [{ lat: mapCoordinates.lat, lng: mapCoordinates.lng }] : []}
                  height={300}
                  zoom={15}
                  onMapClick={handleMapClick}
                  showUserLocation
                />
                
                {mapCoordinates && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>
                        Latitude: {mapCoordinates.lat.toFixed(6)}, Longitude: {mapCoordinates.lng.toFixed(6)}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Update Polling Station" : "Create Polling Station"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}