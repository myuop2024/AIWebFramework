import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(value || "#000000");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentColor(value || "#000000");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCurrentColor(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newColor = e.target.value;
    // Ensure the color is a valid hex
    if (newColor.startsWith("#") && (newColor.length === 4 || newColor.length === 7)) {
      setCurrentColor(newColor);
      onChange(newColor);
    } else if (newColor.length <= 7) {
      setCurrentColor(newColor);
    }
  };

  const handleBlur = () => {
    let newColor = currentColor;
    // Ensure the color is a valid hex on blur
    if (!newColor.startsWith("#")) {
      newColor = "#" + newColor;
    }
    if (newColor.length === 4 || newColor.length === 7) {
      setCurrentColor(newColor);
      onChange(newColor);
    } else {
      // Reset to the previous valid color
      setCurrentColor(value || "#000000");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-full border"
              style={{ backgroundColor: currentColor }}
            />
            <span>{currentColor}</span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-3">
          <div className="w-full h-24 rounded-md" style={{ backgroundColor: currentColor }} />
          <input
            type="color"
            value={currentColor}
            onChange={handleChange}
            className="w-full h-10 cursor-pointer"
          />
          <Input
            ref={inputRef}
            value={currentColor}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="#000000"
            className="font-mono text-sm"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}