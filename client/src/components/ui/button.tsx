import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 hover:shadow-lg hover:-translate-y-0.5 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 shadow-md shadow-primary/25",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/95 hover:to-destructive/85 shadow-md shadow-destructive/25",
        outline:
          "border border-input bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/30",
        secondary:
          "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:from-secondary/95 hover:to-secondary/85",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background/90 hover:border-primary/30",
        gradient: "bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-xl px-10 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg font-bold px-5 py-2 text-base transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2",
        variant === "default" && "bg-primary text-white hover:bg-primary/90",
        variant === "secondary" && "bg-secondary text-white hover:bg-secondary/90",
        variant === "accent" && "bg-accent text-white hover:bg-accent/90",
        variant === "outline" && "bg-white border border-primary text-primary hover:bg-primary/5",
        variant === "ghost" && "bg-transparent text-primary hover:bg-primary/10",
        className
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants }
