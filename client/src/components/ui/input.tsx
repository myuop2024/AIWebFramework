import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

// Add compression utility (mocked for now)
async function compressFile(file: File): Promise<File> {
  // TODO: Use real compression libraries (e.g., browser-image-compression, ffmpeg.wasm)
  // For now, just return the original file
  return file;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === 'file' && e.target.files && e.target.files[0]) {
        let file = e.target.files[0];
        if (props.accept && (props.accept.includes('image') || props.accept.includes('audio'))) {
          file = await compressFile(file);
          // Create a new FileList with the compressed file (not natively possible, so use DataTransfer)
          const dt = new DataTransfer();
          dt.items.add(file);
          e.target.files = dt.files;
        }
      }
      if (props.onChange) props.onChange(e);
    };
    return (
      <input
        type={type}
        className={cn(
          "rounded-lg px-4 py-2 border border-slate-200 focus:ring-2 focus:ring-primary/60 focus:border-primary transition-all duration-150 shadow-sm font-sans placeholder:text-slate-400 text-base bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white",
          className
        )}
        ref={ref}
        {...props}
        onChange={handleChange}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
