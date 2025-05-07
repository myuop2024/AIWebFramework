import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTwoFactorAuth, TwoFactorSetupResponse } from "@/hooks/use-two-factor-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, AlertTriangle, CheckCircle, KeyRound, Shield, Smartphone } from "lucide-react";

// Token form schema
const tokenFormSchema = z.object({
  token: z.string().min(6, "Token must be at least 6 characters").max(8, "Token cannot be longer than 8 characters"),
});

type TokenFormValues = z.infer<typeof tokenFormSchema>;

// Password form schema
const passwordFormSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export function TwoFactorAuth() {
  const { toast } = useToast();
  const [step, setStep] = useState<"initial" | "setup" | "verify">("initial");
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  
  const { 
    isTwoFactorEnabled, 
    isTwoFactorVerified, 
    setupMutation, 
    verifyMutation,
    disableMutation
  } = useTwoFactorAuth();
  
  const tokenForm = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: {
      token: "",
    },
  });
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: "",
    },
  });
  
  const handleSetup = async () => {
    try {
      setStep("setup");
      const result = await setupMutation.mutateAsync();
      setSetupData(result);
    } catch (error) {
      setStep("initial");
      toast({
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Failed to set up 2FA",
        variant: "destructive",
      });
    }
  };
  
  const handleTokenSubmit = async (values: TokenFormValues) => {
    try {
      await verifyMutation.mutateAsync(values.token);
      setStep("initial");
      setSetupData(null);
      toast({
        title: "Two-factor authentication enabled",
        description: "Your account is now protected with 2FA",
      });
    } catch (error) {
      // Error is handled in the mutation
    }
  };
  
  const handleDisableSubmit = async (values: PasswordFormValues) => {
    try {
      await disableMutation.mutateAsync(values.password);
      setIsDisableDialogOpen(false);
      passwordForm.reset();
    } catch (error) {
      // Error is handled in the mutation
    }
  };
  
  const handlePrintRecoveryCodes = () => {
    if (!setupData?.recoveryCodes) return;
    
    const content = `
      <html>
        <head>
          <title>Two-Factor Authentication Recovery Codes</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { font-size: 18px; }
            .codes { margin: 20px 0; }
            .code { font-family: monospace; margin: 5px 0; padding: 5px; background: #f5f5f5; border: 1px solid #ddd; }
            .warning { color: #d32f2f; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Two-Factor Authentication Recovery Codes</h1>
          <p>Keep these recovery codes in a safe place. Each code can only be used once.</p>
          <div class="codes">
            ${setupData.recoveryCodes.map(code => `<div class="code">${code}</div>`).join('')}
          </div>
          <p class="warning">Warning: These codes will not be shown again!</p>
          <p>If you lose access to your authentication app and recovery codes, you will lose access to your account.</p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      toast({
        title: "Print failed",
        description: "Please allow pop-ups to print your recovery codes",
        variant: "destructive",
      });
    }
  };
  
  // Render the component based on the current state
  if (step === "setup" && setupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Set up Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app and enter the verification code below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            <img 
              src={setupData.qrCode} 
              alt="QR Code for two-factor authentication" 
              className="border rounded-md p-2 w-48 h-48"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Can't scan the QR code? Enter this code manually: <code className="bg-muted p-1 rounded">{setupData.secret}</code>
            </p>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="recovery-codes">
              <AccordionTrigger className="text-sm font-medium">
                Recovery Codes (IMPORTANT)
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Save these recovery codes</AlertTitle>
                    <AlertDescription>
                      If you lose access to your authenticator app, you can use one of these codes to sign in.
                      Each code can only be used once. Store them in a secure place.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-muted p-3 rounded-md space-y-1">
                    {setupData.recoveryCodes.map((code, index) => (
                      <div key={index} className="font-mono text-xs">
                        {code}
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={handlePrintRecoveryCodes}>
                    Print Recovery Codes
                  </Button>
                  
                  <p className="text-sm text-muted-foreground mt-4">
                    These codes will not be shown again. If you lose your device and don't have these codes,
                    you will lose access to your account.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <Separator className="my-4" />
          
          <Form {...tokenForm}>
            <form onSubmit={tokenForm.handleSubmit(handleTokenSubmit)} className="space-y-4">
              <FormField
                control={tokenForm.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter code from authenticator app" 
                        {...field} 
                        autoComplete="one-time-code"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the 6-digit code from your authenticator app
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("initial");
                    setSetupData(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Verify and Activate
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }
  
  // Initial or completed state
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account by requiring a verification code in addition to your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isTwoFactorEnabled ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Two-factor authentication is enabled</AlertTitle>
              <AlertDescription>
                Your account is protected with an additional layer of security.
              </AlertDescription>
            </Alert>
            
            <Dialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  Disable Two-Factor Authentication
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    This will make your account less secure. You'll no longer need a verification code when signing in.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handleDisableSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm your password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your current password" 
                              {...field} 
                              autoComplete="current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDisableDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="destructive"
                        disabled={disableMutation.isPending}
                      >
                        {disableMutation.isPending && (
                          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Disable
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive" className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-800">Two-factor authentication is not enabled</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your account is not protected with two-factor authentication.
                We strongly recommend enabling this feature for additional security.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleSetup} 
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Set Up Two-Factor Authentication
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}