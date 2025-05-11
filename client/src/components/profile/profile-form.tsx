import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Shield, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import AddressAutocomplete from "@/components/address/address-autocomplete";

// Jamaican banks and credit unions list
const JAMAICAN_BANKS = [
  "Bank of Jamaica",
  "National Commercial Bank (NCB)",
  "Scotiabank Jamaica",
  "CIBC FirstCaribbean International Bank",
  "Sagicor Bank",
  "JN Bank",
  "JMMB Bank",
  "First Global Bank",
  "Victoria Mutual Building Society",
  "Jamaica National Building Society",
  "COK Sodality Co-operative Credit Union",
  "First Heritage Co-operative Credit Union",
  "C&WJ Co-operative Credit Union",
  "Jamaica Police Co-operative Credit Union",
  "Jamaica Teachers' Association Co-operative Credit Union",
  "St. Catherine Co-operative Credit Union",
  "Churches Co-operative Credit Union",
  "Manchester Co-operative Credit Union",
  "Gateway Co-operative Credit Union",
  "Other"
];

// Jamaican parishes
const JAMAICAN_PARISHES = [
  "Kingston",
  "St. Andrew",
  "St. Catherine",
  "Clarendon",
  "Manchester",
  "St. Elizabeth",
  "Westmoreland",
  "Hanover",
  "St. James",
  "Trelawny",
  "St. Ann",
  "St. Mary",
  "Portland",
  "St. Thomas"
];

// ID types
const ID_TYPES = [
  "National ID",
  "Passport",
  "Driver's License",
  "School ID",
  "Work ID",
  "Other"
];

// Profile form schema
const profileSchema = z.object({
  // Contact Information
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "Parish is required"),
  postOfficeRegion: z.string().min(1, "Post Office Region is required"),
  country: z.string().min(1, "Country is required").default("Jamaica"),
  
  // Identification Information
  trn: z.string().min(1, "TRN is required"),
  idType: z.string().min(1, "ID type is required"),
  idNumber: z.string().min(1, "ID number is required"),
  
  // Financial Information
  bankName: z.string().min(1, "Bank name is required"),
  bankBranchLocation: z.string().min(1, "Bank branch location is required"),
  bankAccount: z.string().min(1, "Bank account number is required"),
  accountType: z.string().min(1, "Account type is required"),
  accountCurrency: z.string().min(1, "Currency is required").default("JMD"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showBankAccount, setShowBankAccount] = useState<boolean>(false);
  const [showIdNumber, setShowIdNumber] = useState<boolean>(false);

  // Define profile data type
  interface ProfileResponse {
    user: {
      id: number;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      [key: string]: any;
    };
    profile: {
      id: number;
      userId: number;
      address: string | null;
      city: string | null;
      state: string | null;
      postOfficeRegion: string | null;
      zipCode: string | null;
      country: string | null;
      trn: string | null;
      bankName: string | null;
      bankBranchLocation: string | null;
      bankAccount: string | null;
      accountType: string | null;
      accountCurrency: string | null;
      idType: string | null;
      idNumber: string | null;
      [key: string]: any;
    } | null;
    documents: any[];
  }

  // Fetch the user's profile data
  const { data: profileData, isLoading: isProfileLoading } = useQuery<ProfileResponse>({
    queryKey: ['/api/users/profile'],
  });

  // Set up the form with zodResolver
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      address: "",
      city: "",
      state: "",
      postOfficeRegion: "",
      country: "Jamaica",
      trn: "",
      bankName: "",
      bankBranchLocation: "",
      bankAccount: "",
      accountType: "Savings",
      accountCurrency: "JMD",
      idType: "",
      idNumber: "",
    },
  });

  // Update form values when profile data is loaded
  useEffect(() => {
    if (profileData && profileData.profile) {
      const profile = profileData.profile;
      form.reset({
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        postOfficeRegion: profile.postOfficeRegion || profile.zipCode || "",
        country: profile.country || "Jamaica",
        trn: profile.trn || "",
        bankName: profile.bankName || "",
        bankBranchLocation: profile.bankBranchLocation || "",
        bankAccount: profile.bankAccount || "",
        accountType: profile.accountType || "Savings",
        accountCurrency: profile.accountCurrency || "JMD",
        idType: profile.idType || "",
        idNumber: profile.idNumber || "",
      });
    }
  }, [profileData, form]);

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("POST", "/api/users/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
      setSuccess(true);
      setError(null);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
        variant: "default",
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
      setSuccess(false);
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  if (isProfileLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Personal Information</h2>
        <p className="text-gray-600">Update your personal and financial information for verification.</p>
        <div className="flex items-center mt-2 text-sm text-amber-600">
          <Shield className="h-4 w-4 mr-1" />
          <span>Sensitive information is encrypted and securely stored</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Your profile has been updated successfully.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h3 className="text-lg font-medium">Address Information</h3>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="mb-2">
                  <FormLabel>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>Street Address</span>
                    </div>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <AddressAutocomplete 
                        initialValue={field.value || ""}
                        placeholder="Start typing your address to search..."
                        onAddressSelect={(addressData) => {
                          // Update the address field with full address (including house number)
                          field.onChange(addressData.fullAddress);
                          
                          // Log the full address data for debugging
                          console.log('Address selected:', addressData);
                          
                          // Process the parish field first
                          let detectedParish = null;
                          
                          // Check if the city field is actually a parish (common in Jamaica)
                          if (addressData.city) {
                            const cityContainsParish = JAMAICAN_PARISHES.find(parish => 
                              addressData.city === parish || 
                              addressData.city.includes(parish) ||
                              (parish.startsWith("St.") && addressData.city.includes(parish.substring(4)))
                            );
                            
                            if (cityContainsParish) {
                              // Use the standardized parish name
                              detectedParish = cityContainsParish;
                              // Don't set city if it's actually a parish
                            } else {
                              // Only set city if it's not a parish
                              form.setValue("city", addressData.city);
                            }
                          }
                          
                          // Try to get parish from state field if not found in city
                          if (!detectedParish && addressData.state) {
                            const stateContainsParish = JAMAICAN_PARISHES.find(parish => 
                              addressData.state === parish || 
                              addressData.state.includes(parish) ||
                              (parish.startsWith("St.") && addressData.state.includes(parish.substring(4)))
                            );
                            
                            if (stateContainsParish) {
                              detectedParish = stateContainsParish;
                            } else {
                              // Only use state as parish if we haven't found a parish yet
                              detectedParish = addressData.state;
                            }
                          }
                          
                          // Special case for Kingston
                          if (!detectedParish && 
                             (addressData.fullAddress?.includes("Kingston") || 
                              addressData.city?.includes("Kingston"))) {
                            detectedParish = "Kingston";
                          }
                          
                          // Set the parish (state) field if we found it
                          if (detectedParish) {
                            console.log("Setting parish to:", detectedParish);
                            form.setValue("state", detectedParish);
                          }
                          
                          if (addressData.postalCode) {
                            form.setValue("postOfficeRegion", addressData.postalCode);
                          }
                          
                          if (addressData.country) {
                            form.setValue("country", addressData.country);
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Start typing your address to see suggestions from HERE Maps
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your city" {...field} />
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your parish" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JAMAICAN_PARISHES.map((parish) => (
                          <SelectItem key={parish} value={parish}>
                            {parish}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postOfficeRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Office Region</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your post office region" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your country" {...field} defaultValue="Jamaica" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h3 className="text-lg font-medium">Identification Information</h3>
            
            <FormField
              control={form.control}
              name="trn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Registration Number (TRN)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your TRN" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="idType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ID type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ID_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Number</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <div className="flex">
                          <Input 
                            className="pr-10" 
                            type={showIdNumber ? "text" : "password"} 
                            placeholder="Enter your ID number" 
                            {...field} 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0"
                            onClick={() => setShowIdNumber(!showIdNumber)}
                          >
                            {showIdNumber ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                    </div>
                    <FormDescription className="text-xs flex items-center">
                      <Lock className="h-3 w-3 mr-1" />
                      Your ID information is encrypted and secure
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h3 className="text-lg font-medium">Financial Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your bank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JAMAICAN_BANKS.map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bankBranchLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Branch Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your bank branch location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bankAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Account Number</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <div className="flex">
                        <Input 
                          className="pr-10" 
                          type={showBankAccount ? "text" : "password"} 
                          placeholder="Enter your account number" 
                          {...field} 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowBankAccount(!showBankAccount)}
                        >
                          {showBankAccount ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                  </div>
                  <FormDescription className="text-xs flex items-center">
                    <Lock className="h-3 w-3 mr-1" />
                    Your account information is encrypted and secure
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Account Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Savings" id="savings" />
                          <Label htmlFor="savings">Savings</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Checking" id="checking" />
                          <Label htmlFor="checking">Checking</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountCurrency"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="JMD" id="jmd" />
                          <Label htmlFor="jmd">JMD</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="USD" id="usd" />
                          <Label htmlFor="usd">USD</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full md:w-auto" 
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
