import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value = "#000000",
  onChange,
  label,
  className,
  disabled = false,
}) => {
  const [color, setColor] = useState(value);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setColor(value);
  }, [value]);

  // Predefined color palette
  const colorPalette = [
    // Blues
    "#1E40AF", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD",
    // Purples
    "#5B21B6", "#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD",
    // Reds
    "#991B1B", "#DC2626", "#EF4444", "#F87171", "#FCA5A5",
    // Greens
    "#065F46", "#059669", "#10B981", "#34D399", "#6EE7B7",
    // Warm colors
    "#92400E", "#D97706", "#F59E0B", "#FBBF24", "#FCD34D",
    // Neutrals
    "#1F2937", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB",
    // Basic
    "#000000", "#FFFFFF", "#18181B", "#F8FAFC", "#D4D4D8",
  ];

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (onChange) {
      onChange(newColor);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newColor = e.target.value;
    // Ensure it's a valid hex color
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      handleColorChange(newColor);
    } else if (/^[0-9A-F]{6}$/i.test(newColor)) {
      // Add the # if it's missing
      newColor = `#${newColor}`;
      handleColorChange(newColor);
    } else {
      // Just update the input without calling onChange
      setColor(newColor);
    }
  };

  const handleBlur = () => {
    // When the input is blurred, validate the color
    // If it's invalid, revert to the previous valid color
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      setColor(value);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={`color-picker-${label?.replace(/\s+/g, '-').toLowerCase()}`}>{label}</Label>}
      <div className="flex items-center space-x-2">
        <Popover open={open && !disabled} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-md w-10 h-10 border-2"
              style={{ backgroundColor: color }}
              disabled={disabled}
              aria-label="Pick a color"
            >
              <span className="sr-only">Pick a color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3">
            <div className="grid grid-cols-5 gap-2 mb-3">
              {colorPalette.map((paletteColor) => (
                <Button
                  key={paletteColor}
                  variant="outline"
                  size="icon"
                  className={cn(
                    "rounded-md w-8 h-8 p-0 border",
                    color === paletteColor && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{ backgroundColor: paletteColor }}
                  onClick={() => {
                    handleColorChange(paletteColor);
                    setOpen(false);
                  }}
                  aria-label={`Select color ${paletteColor}`}
                >
                  <span className="sr-only">Select color {paletteColor}</span>
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-color">Custom Color</Label>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded-md border"
                  style={{ backgroundColor: color }}
                />
                <Input
                  id="custom-color"
                  ref={inputRef}
                  type="text"
                  value={color}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="flex-1"
                  placeholder="#RRGGBB"
                  maxLength={7}
                />
              </div>
              <div className="flex justify-between mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (/^#[0-9A-F]{6}$/i.test(color)) {
                      onChange?.(color);
                      setOpen(false);
                    }
                  }}
                  disabled={!/^#[0-9A-F]{6}$/i.test(color)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          id={`color-picker-${label?.replace(/\s+/g, '-').toLowerCase()}`}
          type="text"
          value={color}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="w-32"
          disabled={disabled}
          placeholder="#RRGGBB"
          maxLength={7}
        />
      </div>
    </div>
  );
};