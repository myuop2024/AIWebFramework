import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const PageHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <section
    ref={ref}
    className={cn("grid gap-1", className)}
    {...props}
  />
));
PageHeader.displayName = "PageHeader";

const PageHeaderHeading = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn(
      "text-2xl font-bold tracking-tight md:text-3xl",
      className
    )}
    {...props}
  />
));
PageHeaderHeading.displayName = "PageHeaderHeading";

const PageHeaderDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-muted-foreground", className)}
    {...props}
  />
));
PageHeaderDescription.displayName = "PageHeaderDescription";

export { PageHeader, PageHeaderHeading, PageHeaderDescription };