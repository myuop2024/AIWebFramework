import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import AddressAutocomplete from "@/components/address/address-autocomplete";

// Form validation schema
const pollingStationSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  stationCode: z.string().min(2, "Station code is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State/Parish is required"),
  zipCode: z.string().optional(),
  latitude: z.coerce.number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .or(z.string().transform(val => parseFloat(val))),
  longitude: z.coerce.number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .or(z.string().transform(val => parseFloat(val))),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// Define props for the component
interface PollingStationFormProps {
  initialData?: any; // Optional data for edit mode
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export default function PollingStationForm({
  initialData,
  onSubmit,
  isSubmitting,
}: PollingStationFormProps) {
  const [useAddressAutocomplete, setUseAddressAutocomplete] = useState(false);
  const [coordsFromMap, setCoordsFromMap] = useState<{lat: number, lng: number} | null>(null);

  // Initialize form with default values or data for editing
  const form = useForm<z.infer<typeof pollingStationSchema>>({
    resolver: zodResolver(pollingStationSchema),
    defaultValues: initialData || {
      name: "",
      stationCode: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      latitude: coordsFromMap?.lat || "",
      longitude: coordsFromMap?.lng || "",
      capacity: "",
      isActive: true,
      notes: "",
    },
  });

  // Handle when the map is clicked to set coordinates
  const handleMapClick = (lat: number, lng: number) => {
    setCoordsFromMap({lat, lng});
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
  };

  // Handle form submission
  const handleFormSubmit = (data: z.infer<typeof pollingStationSchema>) => {
    // Ensure data is properly formatted
    const formattedData = {
      ...data,
      capacity: data.capacity || null,
      notes: data.notes || null,
      zipCode: data.zipCode || null,
    };
    
    onSubmit(formattedData);
  };

  // Handle address selection from autocomplete
  const handleAddressSelect = (address: any) => {
    if (address) {
      form.setValue("address", address.street || "");
      form.setValue("city", address.city || "");
      form.setValue("state", address.state || "");
      form.setValue("zipCode", address.postalCode || "");
      
      if (address.position) {
        form.setValue("latitude", address.position.lat);
        form.setValue("longitude", address.position.lng);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Polling Station Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kingston Central #24" {...field} />
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
                        <Input placeholder="e.g. KC-024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (voters)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g. 500" 
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="use-autocomplete"
                  checked={useAddressAutocomplete}
                  onCheckedChange={setUseAddressAutocomplete}
                />
                <Label htmlFor="use-autocomplete">Use address lookup</Label>
              </div>

              {useAddressAutocomplete ? (
                <div className="mb-4">
                  <Label>Search Address</Label>
                  <AddressAutocomplete 
                    onAddressSelect={handleAddressSelect}
                  />
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 22 Hope Road" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kingston" {...field} />
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
                      <FormLabel>Parish</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. St. Andrew" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="e.g. 18.0179" 
                          {...field}
                          value={field.value || ""}
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
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="e.g. -76.8099" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter any additional information about this polling station" 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end space-x-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {initialData ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>{initialData ? "Update" : "Create"} Station</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </Form>
  );
}