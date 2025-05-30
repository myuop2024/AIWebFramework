import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
import AddressAutocompleteFallback from "@/components/address/address-autocomplete-fallback";
import { type UserProfile } from '@shared/schema';

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
  "Community & Workers of Jamaica Co-operative Credit Union",
  "EduCom Co-operative Credit Union",
  "Grace Co-operative Credit Union",
  "JPS & Partners Co-operative Credit Union",
  "St. Thomas Co-operative Credit Union",
  "Other"
];

// Bank branch locations
const COMMON_BRANCH_LOCATIONS = [
  "Kingston - Downtown",
  "Kingston - New Kingston",
  "Kingston - Half Way Tree",
  "Kingston - Liguanea",
  "Spanish Town",
  "Portmore",
  "Montego Bay",
  "Ocho Rios",
  "May Pen",
  "Mandeville",
  "Port Antonio",
  "Savanna-la-Mar",
  "Falmouth",
  "Brown's Town",
  "Black River",
  "Morant Bay",
  "Santa Cruz",
  "Linstead",
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

// Common post office regions in Jamaica
const POST_OFFICE_REGIONS = [
  "Kingston 5",
  "Kingston 6",
  "Kingston 7",
  "Kingston 8",
  "Kingston 10",
  "Kingston 11",
  "Kingston 19",
  "Kingston 20",
  "Spanish Town",
  "Portmore",
  "May Pen",
  "Mandeville",
  "Montego Bay",
  "Ocho Rios",
  "Savanna-la-Mar",
  "Port Antonio",
  "Morant Bay",
  "Falmouth",
  "Black River",
  "Santa Cruz",
  "Linstead",
  "Old Harbour",
  "Brown's Town",
  "Other"
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
  trn: z.string()
    .min(1, "TRN is required")
    .refine(
      (val) => {
        const digitsOnly = val.replace(/[^0-9]/g, "");
        return /^\d{9}$/.test(digitsOnly);
      }, 
      { message: "TRN must be 9 digits (e.g., 123-456-789)" }
    ),
  idType: z.string().min(1, "ID type is required"),
  idNumber: z.string().min(1, "ID number is required"),
  
  // Financial Information
  bankName: z.string().min(1, "Bank name is required"),
  bankBranchLocation: z.string().min(1, "Bank branch location is required"),
  bankAccount: z.string()
    .min(1, "Bank account number is required")
    .refine(
      (val) => /^\d{5,18}$/.test(val.replace(/[-\s]/g, "")), 
      { message: "Please enter a valid bank account number (5-18 digits)" }
    ),
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
      [key: string]: unknown;
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
      [key: string]: unknown;
    } | null;
    documents: unknown[];
  }

  // Fetch the user's profile data
  const { data: profileData, isLoading: isProfileLoading, error: profileError } = useQuery<ProfileResponse>({
    queryKey: ['/api/users/profile'],
    enabled: !!user, // Only fetch when user is available
    retry: false,
    queryFn: async () => {
      try {
        const response = await fetch('/api/users/profile');
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        console.error('Profile form fetch error:', err);
        // Return null to prevent unhandled promise rejections
        return null;
      }
    },
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-100">
        <h2 className="text-2xl font-bold text-blue-900">Personal Information</h2>
        <p className="text-gray-600">Update your personal and financial information for verification.</p>
        <div className="flex items-center mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
          <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
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
          <div className="space-y-4 p-5 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-blue-800 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-blue-600" />
              Address Information
            </h3>
            
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
                      <AddressAutocompleteFallback 
                        initialValue={field.value || ""}
                        placeholder="Start typing your address to search..."
                        onAddressSelect={(addressData: any) => {
                          // Update the address field with the selected address
                          field.onChange(addressData.title);
                          console.log('Address selected:', addressData);
                          
                          // Process the parish field first
                          let detectedParish = null;
                          
                          // Check if the city field is actually a parish (common in Jamaica)
                          if (addressData.address?.city) {
                            const cityContainsParish = JAMAICAN_PARISHES.find(parish => 
                              addressData.address.city === parish || 
                              addressData.address.city.includes(parish) ||
                              (parish.startsWith("St.") && addressData.address.city.includes(parish.substring(4)))
                            );
                            if (cityContainsParish) {
                              detectedParish = cityContainsParish;
                            } else {
                              form.setValue("city", addressData.address.city);
                            }
                          }
                          
                          // Try to get parish from state field if not found in city
                          if (!detectedParish && addressData.address?.state) {
                            const stateContainsParish = JAMAICAN_PARISHES.find(parish => 
                              addressData.address.state === parish || 
                              addressData.address.state.includes(parish) ||
                              (parish.startsWith("St.") && addressData.address.state.includes(parish.substring(4)))
                            );
                            
                            if (stateContainsParish) {
                              detectedParish = stateContainsParish;
                            } else {
                              detectedParish = addressData.address.state;
                            }
                          }
                          
                          // Special case for Kingston
                          if (!detectedParish && 
                             (addressData.title?.includes("Kingston") || 
                              addressData.address?.city?.includes("Kingston"))) {
                            detectedParish = "Kingston";
                          }
                          
                          // Set the parish (state) field if we found it
                          if (detectedParish) {
                            console.log("Setting parish to:", detectedParish);
                            form.setValue("state", detectedParish);
                          }
                          
                          // Fill other fields
                          if (addressData.address?.postalCode) {
                            form.setValue("postOfficeRegion", addressData.address.postalCode);
                          }
                          
                          if (addressData.address?.countryName) {
                            form.setValue("country", addressData.address.countryName);
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
                      onValueChange={value => {
                        field.onChange(value);
                        console.log("Parish select changed to:", value);
                      }}
                      value={field.value || ""}
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select post office region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POST_OFFICE_REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      The postal code or post office region for your mailing address
                    </FormDescription>
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
                      <Input placeholder="Enter your country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4 p-5 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-blue-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="2" />
                <path d="M15 8h2" />
                <path d="M15 12h2" />
                <path d="M7 16h10" />
              </svg>
              Identification Information
            </h3>
            
            <FormField
              control={form.control}
              name="trn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Registration Number (TRN)</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <div className="flex">
                        <Input 
                          className="pr-10" 
                          type={showIdNumber ? "text" : "password"} 
                          placeholder="Enter your TRN (9 digits)" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={11}
                          {...field} 
                          onChange={(e) => {
                            // Format TRN as 123-456-789
                            const value = e.target.value.replace(/[^0-9]/g, "");
                            if (value.length <= 9) {
                              let formatted = value;
                              if (value.length > 3) {
                                formatted = value.slice(0, 3) + "-" + value.slice(3);
                              }
                              if (value.length > 6) {
                                formatted = formatted.slice(0, 7) + "-" + formatted.slice(7);
                              }
                              field.onChange(formatted);
                            }
                          }}
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
                    Your TRN is encrypted and securely stored
                  </FormDescription>
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

          <div className="space-y-4 p-5 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-blue-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <line x1="7" y1="15" x2="9" y2="15" />
                <line x1="11" y1="15" x2="13" y2="15" />
              </svg>
              Financial Information
            </h3>
            
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_BRANCH_LOCATIONS.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={18}
                          {...field} 
                          onChange={(e) => {
                            // Format bank account with dashes every 4 digits
                            const value = e.target.value.replace(/[^0-9]/g, "");
                            if (value.length <= 18) {
                              // Group digits in sets of 4 with dashes
                              const formatted = value.replace(/(.{4})/g, "$1-").replace(/-$/, "");
                              field.onChange(formatted);
                            }
                          }}
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
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Savings">Savings Account</SelectItem>
                        <SelectItem value="Checking">Checking Account</SelectItem>
                        <SelectItem value="Current">Current Account</SelectItem>
                        <SelectItem value="Fixed">Fixed Deposit</SelectItem>
                        <SelectItem value="Money_Market">Money Market Account</SelectItem>
                        <SelectItem value="Business">Business Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="JMD">Jamaican Dollar (JMD)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                        <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                        <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg flex items-center gap-2" 
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
