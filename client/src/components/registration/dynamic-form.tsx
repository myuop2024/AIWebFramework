import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { AlertCircle, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AddressAutocomplete from "@/components/address/address-autocomplete";

// Types for form field configuration from registration form schema
export interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  order: number;
  helpText?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    customMessage?: string;
    min?: number;
    max?: number;
  };
  isAdminOnly: boolean;
  placeholder?: string;
  isUserEditable: boolean;
  mapToUserField?: string;
  mapToProfileField?: string;
  isEncrypted?: boolean;
  isHidden?: boolean;
  defaultValue?: string | number | boolean | string[] | null;
  conditional?: {
    field: string;
    value: string | number | boolean | string[];
  };
}

interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, unknown> | FormData) => void;
  isLoading?: boolean;
  defaultValues?: Record<string, unknown>;
}

// Password strength calculation
const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;
  
  let score = 0;
  // Length check
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  
  // Character variety checks
  if (/[A-Z]/.test(password)) score += 20; // Uppercase
  if (/[a-z]/.test(password)) score += 20; // Lowercase
  if (/[0-9]/.test(password)) score += 20; // Numbers
  if (/[^A-Za-z0-9]/.test(password)) score += 20; // Special chars
  
  // Bonus for combination of different character types
  let types = 0;
  if (/[A-Z]/.test(password)) types++;
  if (/[a-z]/.test(password)) types++;
  if (/[0-9]/.test(password)) types++;
  if (/[^A-Za-z0-9]/.test(password)) types++;
  
  if (types >= 3) score += 10;
  
  return Math.min(100, score);
};

// Get password strength label and color
const getPasswordStrengthInfo = (strength: number): { label: string; color: string } => {
  if (strength < 20) return { label: "Very Weak", color: "bg-red-600" };
  if (strength < 40) return { label: "Weak", color: "bg-orange-500" };
  if (strength < 60) return { label: "Fair", color: "bg-yellow-500" };
  if (strength < 80) return { label: "Good", color: "bg-blue-500" };
  return { label: "Strong", color: "bg-green-600" };
};

export const DynamicForm = ({
  fields,
  onSubmit,
  isLoading = false,
  defaultValues = {},
}: DynamicFormProps) => {
  // State for password strength meter
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // This function handles form submission, processing files as needed
  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    const fileFields = fields.filter(field => field.type === 'file');
    
    // If there are no file fields, just pass the data to onSubmit
    if (fileFields.length === 0) {
      onSubmit(formData);
      return;
    }
    
    // Create a FormData object to handle file uploads
    const submitData = new FormData();
    
    // Process each field in the form data
    Object.entries(formData).forEach(([key, value]) => {
      // Check if this is a file field
      const field = fields.find(f => f.name === key);
      
      if (field?.type === 'file' && value instanceof File) {
        // Add the file to the FormData
        submitData.append(key, value);
      } else if (value !== undefined && value !== null) {
        // Add non-file values to the FormData
        submitData.append(key, value.toString());
      }
    });
    
    // Call the provided onSubmit function with the enhanced data
    onSubmit(submitData);
  };
  // Build schema dynamically based on fields configuration
  const buildSchema = () => {
    const schemaMap: Record<string, z.ZodTypeAny> = {};

    fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      // Base on field type, create the appropriate schema
      switch (field.type) {
        case "email":
          fieldSchema = z.string().email(
            field.validation?.customMessage || "Invalid email address"
          );
          break;
        case "tel":
          fieldSchema = z.string();
          if (field.validation?.pattern) {
            fieldSchema = fieldSchema.regex(
              new RegExp(field.validation.pattern),
              field.validation.customMessage || "Invalid format"
            );
          }
          break;
        case "number":
          fieldSchema = z.coerce.number();
          break;
        case "checkbox":
          fieldSchema = z.boolean();
          break;
        case "select":
          fieldSchema = z.string();
          break;
        case "textarea":
          fieldSchema = z.string();
          break;
        case "file":
          // Handle file type differently - validate as File or undefined
          fieldSchema = z.instanceof(File)
            .refine(
              (file) => file instanceof File || !field.required,
              { message: "Please upload a file" }
            )
            .refine(
              (file) => {
                if (file instanceof File) {
                  // Validate file size - default max 5MB
                  const maxSize = 5 * 1024 * 1024; // 5MB
                  return file.size <= maxSize;
                }
                return true;
              },
              { message: "File size should be less than 5MB" }
            ).optional();
          break;
        default: // text and other inputs
          fieldSchema = z.string();
          if (field.validation?.pattern) {
            fieldSchema = fieldSchema.regex(
              new RegExp(field.validation.pattern),
              field.validation.customMessage || "Invalid format"
            );
          }
      }

      // Apply required validation
      if (field.required) {
        if (field.type === "checkbox") {
          fieldSchema = fieldSchema.refine((val: boolean) => val === true, {
            message: `${field.label} is required`,
          });
        } else if (field.type === "file") {
          // File validation is already handled in the case statement
        } else {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
        }
      } else if (field.type !== "checkbox" && field.type !== "file") {
        // Make non-required fields optional
        fieldSchema = fieldSchema.optional();
      }

      schemaMap[field.name] = fieldSchema;
    });

    return z.object(schemaMap);
  };

  const formSchema = buildSchema();
  
  // Set up form with schema and default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  // Sort fields by order property
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  // Render appropriate field component based on field type
  const renderField = (field: FormField): React.ReactElement => {
    if (field.isAdminOnly) return <></>;

    switch (field.type) {
      case "password":
        return (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input 
                type={field.type} 
                placeholder={field.placeholder} 
                {...form.register(field.name, {
                  onChange: (e) => {
                    const strength = calculatePasswordStrength(e.target.value);
                    setPasswordStrength(strength);
                  }
                })}
              />
            </FormControl>
            
            {/* Password strength meter */}
            <div className="mt-2 space-y-1">
              <Progress 
                value={passwordStrength} 
                className={cn("h-2 w-full", 
                  getPasswordStrengthInfo(passwordStrength).color
                )} 
              />
              <div className="flex justify-between text-xs">
                <span>Strength:</span>
                <span className="font-medium">
                  {getPasswordStrengthInfo(passwordStrength).label}
                </span>
              </div>
              <FormDescription className="text-xs">
                Password should include uppercase, lowercase, numbers, and special characters.
              </FormDescription>
            </div>
            
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            <FormMessage />
          </FormItem>
        );
      
      case "text":
      case "email":
      case "tel":
      case "number":
        // Check if this is a field mapped to address - use address autocomplete
        if (field.mapToProfileField === "address") {
          return (
            <FormItem>
              <FormLabel>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{field.label}</span>
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </div>
              </FormLabel>
              <FormControl>
                <AddressAutocomplete 
                  initialValue={form.getValues(field.name) || ""}
                  placeholder={field.placeholder || "Start typing to search for address..."}
                  onAddressSelect={(addressData) => {
                    // Set the value for this field
                    form.setValue(field.name, addressData.fullAddress);
                    
                    // Look for other address-related fields to auto-fill
                    // Define the Jamaican parishes
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
                    
                    // Find the city and parish fields first
                    const cityField = fields.find(f => f.mapToProfileField === "city");
                    const parishField = fields.find(f => f.mapToProfileField === "state");
                    
                    // Process parish detection first
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
                      } else if (cityField) {
                        // Only set city if it's not a parish
                        form.setValue(cityField.name, addressData.city);
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
                    
                    // Set the parish field if we found it and the field exists
                    if (detectedParish && parishField) {
                      console.log("Setting parish to:", detectedParish);
                      form.setValue(parishField.name, detectedParish);
                      
                      // Log form state after setting to debug
                      setTimeout(() => {
                        console.log("Form value for parish after setting:", form.getValues(parishField.name));
                        console.log("Form field state:", form.getFieldState(parishField.name));
                      }, 100);
                    }
                    
                    // Process remaining fields (post office, country)
                    fields.forEach((otherField) => {
                      if (otherField.mapToProfileField === "zipCode" && addressData.postalCode) {
                        form.setValue(otherField.name, addressData.postalCode);
                      }
                      if (otherField.mapToProfileField === "country" && addressData.country) {
                        form.setValue(otherField.name, addressData.country);
                      }
                    });
                  }}
                />
              </FormControl>
              {field.helpText && (
                <FormDescription>{field.helpText}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          );
        }
        
        // Standard text input for non-address fields
        return (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input 
                type={field.type} 
                placeholder={field.placeholder} 
                {...form.register(field.name)}
              />
            </FormControl>
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            <FormMessage />
          </FormItem>
        );

      case "select":
        return (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <Select
              onValueChange={(value) => form.setValue(field.name, value)}
              value={form.getValues(field.name) || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            <FormMessage />
          </FormItem>
        );

      case "textarea":
        return (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={field.placeholder}
                {...form.register(field.name)}
              />
            </FormControl>
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            <FormMessage />
          </FormItem>
        );

      case "checkbox":
        return (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4">
            <FormControl>
              <Checkbox
                checked={form.getValues(field.name)}
                onCheckedChange={(checked) => {
                  form.setValue(field.name, checked === true, {
                    shouldValidate: true,
                  });
                }}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              {field.helpText && (
                <p className="text-sm text-gray-500">{field.helpText}</p>
              )}
            </div>
            <FormMessage />
          </FormItem>
        );
        
      case "file":
        return (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input
                type="file"
                className="cursor-pointer"
                {...form.register(field.name, {
                  onChange: (e) => {
                    const files = e.target.files;
                    if (files?.length) {
                      // Set the file object to the form value
                      form.setValue(field.name, files[0], {
                        shouldValidate: true,
                      });
                    }
                  },
                })}
              />
            </FormControl>
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            <FormMessage />
            {form.formState.errors[field.name] && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {form.formState.errors[field.name]?.message?.toString()}
                </AlertDescription>
              </Alert>
            )}
          </FormItem>
        );

      default:
        return <></>;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {sortedFields.map((field) => (
          <FormField
            key={field.id}
            control={form.control}
            name={field.name}
            render={() => renderField(field)}
          />
        ))}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Spinner className="mr-2" /> : null}
          {isLoading ? "Processing..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
};