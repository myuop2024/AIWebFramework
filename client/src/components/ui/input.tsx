import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "rounded-lg px-4 py-2 border border-slate-200 focus:ring-2 focus:ring-primary/60 focus:border-primary transition-all duration-150 shadow-sm font-sans placeholder:text-slate-400 text-base bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
