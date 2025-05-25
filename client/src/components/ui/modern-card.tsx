import * as React from "react";
import { cn } from "@/lib/utils";

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "gradient" | "elevated";
  hover?: boolean;
  padding?: "sm" | "md" | "lg" | "xl";
}

export function ModernCard({ 
  children, 
  className, 
  variant = "default",
  hover = true,
  padding = "md"
}: ModernCardProps) {
  const baseClasses = "rounded-2xl border transition-all duration-300";
  
  const variantClasses = {
    default: "bg-card/80 backdrop-blur-sm border-border/50 shadow-lg",
    glass: "bg-background/95 backdrop-blur-xl border-border/30 shadow-2xl ring-1 ring-white/10",
    gradient: "bg-gradient-to-br from-card via-card/90 to-card/70 border-border/30 shadow-xl",
    elevated: "bg-card border-border shadow-xl shadow-primary/5"
  };
  
  const hoverClasses = hover ? "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1" : "";
  
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    xl: "p-10"
  };
  
  return (
    <div 
      className={cn(
        baseClasses,
        variantClasses[variant],
        hoverClasses,
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export default ModernCard; 