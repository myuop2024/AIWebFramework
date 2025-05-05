import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export function ResponsiveContainer({
  children,
  className,
  fullHeight = false,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        "w-full px-4 sm:px-6 md:px-8 mx-auto",
        "max-w-full sm:max-w-[540px] md:max-w-[720px] lg:max-w-[960px] xl:max-w-[1140px] 2xl:max-w-[1320px]",
        fullHeight && "min-h-[calc(100vh-4rem)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

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