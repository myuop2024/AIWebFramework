import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string; // Base64 encoded QR code image
  recoveryCodes: string[];
}

export function useTwoFactorAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current user's 2FA status
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user");
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error("Failed to fetch user data");
      }
      return await response.json();
    },
  });
  
  // Setup 2FA - generates a secret and QR code
  const setupMutation = useMutation({
    mutationFn: async (): Promise<TwoFactorSetupResponse> => {
      const response = await apiRequest("POST", "/api/user/2fa/setup");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to set up 2FA");
      }
      return await response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to set up two-factor authentication",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Verify and enable 2FA
  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest("POST", "/api/user/2fa/verify", { token });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify 2FA token");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Two-factor authentication enabled",
        description: "Your account is now more secure.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to verify token",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Disable 2FA
  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/user/2fa/disable", { password });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to disable 2FA");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Two-factor authentication disabled",
        description: "Two-factor authentication has been turned off.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to disable two-factor authentication",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return {
    isTwoFactorEnabled: !!user?.twoFactorEnabled,
    isTwoFactorVerified: !!user?.twoFactorVerified,
    setupMutation,
    verifyMutation,
    disableMutation,
  };
}