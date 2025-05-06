import React from "react";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Smartphone, Mail } from "lucide-react";

interface DeviceBindingAlertProps {
  onRequestReset: () => void;
  isLoading: boolean;
  userEmail?: string;
  observerId?: string;
}

/**
 * Component to display when device binding verification fails
 * Provides information and options for the user to request unbinding
 */
export function DeviceBindingAlert({
  onRequestReset,
  isLoading,
  userEmail,
  observerId,
}: DeviceBindingAlertProps) {
  return (
    <Alert variant="destructive" className="mb-6">
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle className="text-lg font-bold">
        Device Verification Failed
      </AlertTitle>
      <AlertDescription className="mt-3">
        <p className="mb-3">
          Your account is bound to another device for security purposes. This measure helps 
          protect election observer accounts from unauthorized access.
        </p>
        
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-4 w-4" />
          <span className="text-sm">
            Observer ID: <span className="font-medium">{observerId || 'Unknown'}</span>
          </span>
        </div>
        
        {userEmail && (
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4" />
            <span className="text-sm">
              Email: <span className="font-medium">{userEmail}</span>
            </span>
          </div>
        )}
        
        <div className="border-t border-red-200 dark:border-red-800 pt-3 mt-3">
          <p className="mb-3 text-sm">
            If this is your account but you're using a new device, please request a device 
            reset through the CAFFE administration.
          </p>
          
          <Button 
            variant="secondary" 
            onClick={onRequestReset}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Requesting Reset...' : 'Request Device Reset'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}