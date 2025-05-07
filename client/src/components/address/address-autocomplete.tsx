import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, MapPin } from "lucide-react";
import { hereMapsService, HereAutocompleteResult } from "@/lib/here-maps";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  value?: string;
  onChange: (value: string, details?: HereAutocompleteResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  country?: string;
  autoFocus?: boolean;
}

export default function AddressAutocomplete({
  value = "",
  onChange,
  placeholder = "Search for an address...",
  label,
  required = false,
  error,
  disabled = false,
  className,
  country,
  autoFocus = false,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<HereAutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HereAutocompleteResult | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync with external value
  useEffect(() => {
    if (value !== inputValue && !selectedItem) {
      setInputValue(value);
    }
  }, [value]);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await hereMapsService.autocompleteAddress(query, country);
      setSuggestions(results);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (query: string) => {
    setInputValue(query);
    setSelectedItem(null);
    onChange(query); // Always update with raw text input

    // Debounce API requests
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 350);
  };

  const handleSelectSuggestion = (item: HereAutocompleteResult) => {
    setSelectedItem(item);
    setInputValue(item.address.label);
    onChange(item.address.label, item);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate">{inputValue || placeholder}</span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search for an address..."
              value={inputValue}
              onValueChange={handleInputChange}
              autoFocus={autoFocus}
              className="h-9"
            />
            {isLoading && (
              <div className="py-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  Searching addresses...
                </p>
              </div>
            )}
            {!isLoading && (
              <CommandList>
                <CommandEmpty>No addresses found</CommandEmpty>
                <CommandGroup>
                  {suggestions.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.address.label}
                      onSelect={() => handleSelectSuggestion(item)}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                        <div className="overflow-hidden">
                          <p className="truncate">{item.address.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[
                              item.address.city,
                              item.address.state,
                              item.address.countryName,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedItem?.id === item.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {/* Alternative input for keyboard entry */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}