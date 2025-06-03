import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AddressAutocomplete, { type AddressSuggestion } from "@/components/address/address-autocomplete";
import { InteractiveMap } from "@/components/mapping/interactive-map";
import { formatDecimalCoordinates } from "@/lib/here-maps";

// Define form schema with Zod
const pollingStationFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  stationCode: z.string().min(2, { message: "Station code is required" }),
  capacity: z.coerce.number().int().positive().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().min(5, { message: "Address is required" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "Parish is required" }),
  zipCode: z.string().optional().describe("Post Office Region"),
  notes: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accessibilityFeatures: z.array(z.string()).optional(),
  isActive: z.boolean().default(true)
});

export type PollingStationFormData = z.infer<typeof pollingStationFormSchema>;

interface PollingStationFormProps {
  initialData?: Partial<PollingStationFormData>;
  onSubmit: (data: PollingStationFormData) => void;
  isLoading?: boolean;
}

export default function PollingStationForm({
  initialData,
  onSubmit,
  isLoading = false
}: PollingStationFormProps) {
  const [mapMarker, setMapMarker] = useState<{ lat: number; lng: number } | null>(null);
  
  // Initialize form with default values or initial data
  const form = useForm<PollingStationFormData>({
    resolver: zodResolver(pollingStationFormSchema),
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || "",
      stationCode: initialData?.stationCode || "",
      capacity: initialData?.capacity || undefined,
      contactPerson: initialData?.contactPerson || "",
      contactPhone: initialData?.contactPhone || "",
      address: initialData?.address || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zipCode: initialData?.zipCode || "",
      notes: initialData?.notes || "",
      latitude: initialData?.latitude || 18.0179, // Default to Kingston, Jamaica
      longitude: initialData?.longitude || -76.8099,
      accessibilityFeatures: initialData?.accessibilityFeatures || [],
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true
    }
  });
  
  // Update map marker when latitude/longitude changes
  useEffect(() => {
    const { latitude, longitude } = form.watch();
    if (latitude && longitude) {
      setMapMarker({ lat: latitude, lng: longitude });
    }
  }, [form.watch("latitude"), form.watch("longitude")]);
  
  // Handle address selection from autocomplete
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    form.setValue("address", suggestion.address.street || suggestion.title);
    form.setValue("city", suggestion.address.city);
    form.setValue("state", suggestion.address.state);
    form.setValue("zipCode", suggestion.address.postalCode);
    form.setValue("latitude", suggestion.position.lat);
    form.setValue("longitude", suggestion.position.lng);
    
    setMapMarker({
      lat: suggestion.position.lat,
      lng: suggestion.position.lng
    });
  };
  
  // Handle map click to update location
  const handleMapClick = (position: { lat: number; lng: number }) => {
    form.setValue("latitude", position.lat);
    form.setValue("longitude", position.lng);
    setMapMarker({ lat: position.lat, lng: position.lng });
  };
  
  // Submit handler
  const handleSubmit = (data: PollingStationFormData) => {
    onSubmit(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Basic Information</h2>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Polling Station Name*</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Kingston Central #24" />
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
                  <FormLabel>Station Code*</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. KC-024" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (voters)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      placeholder="e.g. 500"
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. John Smith" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. 876-123-4567" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Location Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Location</h2>
            
            <FormItem>
              <FormLabel>Search Address</FormLabel>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                initialValue={form.getValues("address")}
                placeholder="Type to search for address..."
              />
            </FormItem>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address*</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Street address" />
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
                    <FormLabel>City*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City" />
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
                    <FormLabel>Parish*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Parish" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Office Region</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Post office region" />
                  </FormControl>
                  <FormDescription className="text-xs">
                    The postal code or post office region for the polling station's mailing address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.000001"
                        placeholder="e.g. 18.0179" 
                      />
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
                    <FormLabel>Longitude*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.000001"
                        placeholder="e.g. -76.8099" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {mapMarker && (
              <div className="text-sm text-muted-foreground mt-1">
                Coordinates: {formatDecimalCoordinates(mapMarker.lat, mapMarker.lng)}
              </div>
            )}
          </div>
        </div>
        
        {/* Map Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Map Location</h2>
          <div className="border rounded-md overflow-hidden">
            <InteractiveMap
              height="300px"
              markers={mapMarker ? [
                { 
                  id: 'selected-location',
                  position: { lat: mapMarker.lat, lng: mapMarker.lng },
                  icon: "/assets/icons/map-marker-selected.png"
                }
              ] : []}
              centerLat={mapMarker?.lat || 18.0179}
              centerLng={mapMarker?.lng || -76.8099}
              zoom={15}
              onMapClick={handleMapClick}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Click on the map to set the precise location of the polling station
          </div>
        </div>
        
        {/* Additional Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Additional Information</h2>
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field}
                    placeholder="Additional information about this polling station"
                    className="min-h-[120px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="pt-6 flex justify-end space-x-4">
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full md:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData && "id" in initialData ? "Update Polling Station" : "Create Polling Station"}
          </Button>
        </div>
      </form>
    </Form>
  );
}