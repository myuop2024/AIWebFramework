import * as React from "react";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

export function PageWrapper({ 
  children, 
  className, 
  title, 
  subtitle, 
  actions,
  breadcrumbs 
}: PageWrapperProps) {
  return (
    <div className={cn("container-modern", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <div className="mb-6">
          {breadcrumbs}
        </div>
      )}
      
      {/* Page Header */}
      {(title || subtitle || actions) && (
        <div className="page-header-modern">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              {title && (
                <h1 className="page-title-modern">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="page-subtitle-modern">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Page Content */}
      <div className="space-y-6 sm:space-y-8">
        {children}
      </div>
    </div>
  );
}

export default PageWrapper; 