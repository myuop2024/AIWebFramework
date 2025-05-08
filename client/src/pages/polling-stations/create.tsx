import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/layout/page-header";
import PollingStationForm from "@/components/polling-stations/polling-station-form";

export default function CreatePollingStation() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createStationMutation = useMutation({
    mutationFn: async (formData: any) => {
      const response = await apiRequest("POST", "/api/polling-stations", formData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create polling station");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate cached polling stations data
      queryClient.invalidateQueries({ queryKey: ["/api/polling-stations"] });
      
      toast({
        title: "Success",
        description: "Polling station has been created successfully",
      });
      
      // Redirect to polling stations list
      navigate("/polling-stations");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });
  
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    createStationMutation.mutate(data);
  };
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <PageHeader
        title="Create Polling Station"
        description="Add a new polling station to the system"
        backButton={{
          href: "/polling-stations",
          label: "Back to Stations",
        }}
      />
      
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <PollingStationForm 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}