import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
}

export function ResponsiveContainer({ 
  children, 
  className, 
  size = "xl",
  padding = "md"
}: ResponsiveContainerProps) {
  const sizeClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl", 
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-none"
  };
  
  const paddingClasses = {
    none: "",
    sm: "px-4 sm:px-6",
    md: "px-4 sm:px-6 lg:px-8",
    lg: "px-4 sm:px-6 lg:px-8 xl:px-12",
    xl: "px-6 sm:px-8 lg:px-12 xl:px-16"
  };
  
  return (
    <div 
      className={cn(
        "w-full mx-auto",
        sizeClasses[size],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export default ResponsiveContainer;

export function ResponsiveGrid({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ResponsiveTwoColumnGrid({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ResponsiveSection({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "py-8 md:py-12 lg:py-16",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function ResponsiveCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow p-4 md:p-6 flex flex-col",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}