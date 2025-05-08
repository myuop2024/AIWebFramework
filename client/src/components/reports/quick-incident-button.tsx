import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import QuickIncidentForm from "./quick-incident-form";

interface QuickIncidentButtonProps extends ButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  showIcon?: boolean;
  onReportSubmitted?: () => void;
}

export default function QuickIncidentButton({
  variant = "destructive",
  size = "default",
  label = "Report Incident",
  showIcon = true,
  onReportSubmitted,
  className,
  ...props
}: QuickIncidentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        {...props}
      >
        {showIcon && <AlertTriangle className="mr-2 h-4 w-4" />}
        {label}
      </Button>
      
      <QuickIncidentForm
        open={open}
        onOpenChange={setOpen}
        onReportSubmitted={onReportSubmitted}
      />
    </>
  );
}