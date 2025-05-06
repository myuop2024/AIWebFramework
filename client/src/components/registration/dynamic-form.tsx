import React from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
  };
  isAdminOnly: boolean;
  placeholder?: string;
  isUserEditable: boolean;
  mapToUserField?: string;
  mapToProfileField?: string;
}

interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  defaultValues?: Record<string, any>;
}

export const DynamicForm = ({
  fields,
  onSubmit,
  isLoading = false,
  defaultValues = {},
}: DynamicFormProps) => {
  // Build schema dynamically based on fields configuration
  const buildSchema = () => {
    const schemaMap: Record<string, any> = {};

    fields.forEach((field) => {
      let fieldSchema: any;

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
          fieldSchema = fieldSchema.refine((val) => val === true, {
            message: `${field.label} is required`,
          });
        } else {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
        }
      } else if (field.type !== "checkbox") {
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
  const renderField = (field: FormField) => {
    if (field.isAdminOnly) return null;

    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "tel":
      case "number":
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
              defaultValue={form.getValues(field.name)}
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

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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