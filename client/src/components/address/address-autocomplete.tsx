import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useHereMaps } from "@/lib/here-maps";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// List of Jamaican parishes for matching
const JAMAICAN_PARISHES = [
  "Kingston",
  "St. Andrew",
  "St. Catherine",
  "Clarendon",
  "Manchester",
  "St. Elizabeth",
  "Westmoreland",
  "Hanover",
  "St. James",
  "Trelawny",
  "St. Ann",
  "St. Mary",
  "Portland",
  "St. Thomas"
];

// Find the correct Jamaican parish from address data
const findJamaicanParish = (locationText: string): string | null => {
  if (!locationText) return null;
  
  // First check for exact matches
  for (const parish of JAMAICAN_PARISHES) {
    if (locationText === parish) return parish;
  }
  
  // Then check for partial matches (for cases where the parish might be part of a longer string)
  for (const parish of JAMAICAN_PARISHES) {
    if (locationText.includes(parish)) return parish;
    
    // Special case for St. parishes - also match without the period
    if (parish.startsWith("St.") && locationText.includes(parish.replace("St.", "St"))) {
      return parish;
    }
    
    // Also check for the parish name without "St."
    if (parish.startsWith("St.") && locationText.includes(parish.substring(4))) {
      return parish;
    }
  }
  
  return null;
};

interface AddressAutocompleteProps {
  onAddressSelect: (address: any) => void;
  initialValue?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

type AddressSuggestion = {
  title: string;
  address: {
    label: string;
    countryCode: string;
    countryName: string;
    state: string;
    county: string;
    city: string;
    district: string;
    street: string;
    postalCode: string;
  };
  position: {
    lat: number;
    lng: number;
  };
  id: string;
};

export default function AddressAutocomplete({
  onAddressSelect,
  initialValue = '',
  className = '',
  placeholder = 'Enter address for search...',
  disabled = false
}: AddressAutocompleteProps) {
  const { H, isLoaded, loadError } = useHereMaps();
  // Debug the incoming initialValue
  console.log("Address Autocomplete initialValue:", initialValue);
  
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Setup autocomplete service
  useEffect(() => {
    // Clean up timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Don't search if input is empty
    if (!value.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // Debounce requests
    timeoutRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 300);
  };

  // Fetch address suggestions from HERE Geocoding API
  const fetchAddressSuggestions = async (query: string) => {
    if (!isLoaded || !H) {
      console.error("HERE Maps not loaded");
      setIsSearching(false);
      return;
    }
    
    try {
      const apiKey = import.meta.env.VITE_HERE_API_KEY;
      if (!apiKey) {
        console.error("HERE Maps API key is missing");
        setIsSearching(false);
        return;
      }
      
      // Create a platform instance
      const platform = new H.service.Platform({
        apikey: apiKey
      });
      
      // Get search service
      const searchService = platform.getSearchService();
      
      // Create a promise to get autocomplete suggestions
      const suggestionsPromise = new Promise<AddressSuggestion[]>((resolve, reject) => {
        searchService.autosuggest(
          {
            q: query,
            at: '18.0179,-76.8099', // Kingston, Jamaica as center point
            limit: 5
          },
          (result: any) => {
            if (result && result.items) {
              const suggestions = result.items.map((item: any) => ({
                title: item.title,
                address: item.address || {},
                position: item.position || { lat: 0, lng: 0 },
                id: item.id || Math.random().toString(36).substring(2)
              }));
              resolve(suggestions);
            } else {
              resolve([]);
            }
          },
          (error: any) => {
            console.error("Error fetching suggestions:", error);
            reject(error);
          }
        );
      });
      
      const results = await suggestionsPromise;
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error("Error in autosuggest:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle selection of a suggestion
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.title);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Get detailed information about the selected address
    getAddressDetails(suggestion);
  };
  
  // Get detailed address information using geocoding
  const getAddressDetails = async (suggestion: AddressSuggestion) => {
    if (!isLoaded || !H) {
      console.error("HERE Maps not loaded");
      return;
    }
    
    try {
      const apiKey = import.meta.env.VITE_HERE_API_KEY;
      if (!apiKey) {
        console.error("HERE Maps API key is missing");
        return;
      }
      
      // Create a platform instance
      const platform = new H.service.Platform({
        apikey: apiKey
      });
      
      // Get geocoding service
      const geocodingService = platform.getSearchService();
      
      // Create a promise to get detailed address information
      const geocodePromise = new Promise<any>((resolve, reject) => {
        geocodingService.geocode(
          {
            q: suggestion.title,
            // Add more details to extract street numbers and parish info
            details: 1
          },
          (result: any) => {
            if (result && result.items && result.items.length > 0) {
              resolve(result.items[0]);
            } else {
              // If no detailed result, use the suggestion data
              resolve({
                title: suggestion.title,
                position: suggestion.position,
                address: suggestion.address
              });
            }
          },
          (error: any) => {
            console.error("Error in geocode:", error);
            reject(error);
          }
        );
      });
      
      const addressDetails = await geocodePromise;
      
      // Extract street number and street from addressDetails if available
      let streetWithNumber = '';
      let streetName = addressDetails.address?.street || '';
      let houseNumber = addressDetails.address?.houseNumber || '';
      
      // Log the full response for debugging
      console.log('HERE Maps address details:', addressDetails);
      console.log('HERE Maps address components:', {
        houseNumber: addressDetails.address?.houseNumber,
        street: addressDetails.address?.street,
        district: addressDetails.address?.district,
        city: addressDetails.address?.city,
        county: addressDetails.address?.county,
        state: addressDetails.address?.state,
        postalCode: addressDetails.address?.postalCode,
        country: addressDetails.address?.countryName
      });
      
      // Combine house number and street name if available
      if (houseNumber && streetName) {
        streetWithNumber = `${houseNumber} ${streetName}`;
      } else if (streetName) {
        streetWithNumber = streetName;
      }

      // Extract parish information - try to find it in all address components
      // First check if the city field actually contains a parish name (common in Jamaica)
      let parish = null;
      
      // Check city first (often contains the parish in Jamaican addresses)
      if (addressDetails.address?.city) {
        parish = findJamaicanParish(addressDetails.address.city);
      }
      
      // If not found in city, check other fields
      if (!parish) {
        parish = findJamaicanParish(
          addressDetails.address?.district || 
          addressDetails.address?.county || 
          addressDetails.address?.state || 
          ''
        );
      }
      
      // Special handling for Kingston and other areas
      if (addressDetails.address?.city === "Kingston" || 
          addressDetails.address?.district === "Kingston" ||
          (addressDetails.address?.label && addressDetails.address?.label.includes("Kingston"))) {
        parish = "Kingston";
      }
      
      // Format the address object for our application
      const formattedAddress = {
        fullAddress: streetWithNumber ? streetWithNumber : suggestion.title,
        street: streetWithNumber || streetName,
        houseNumber: houseNumber,
        city: addressDetails.address?.city || '',
        state: parish || addressDetails.address?.state || addressDetails.address?.county || '',
        country: addressDetails.address?.countryName || '',
        postalCode: addressDetails.address?.postalCode || '',
        position: {
          lat: addressDetails.position?.lat || suggestion.position.lat,
          lng: addressDetails.position?.lng || suggestion.position.lng
        }
      };
      
      // Call callback with the address data
      onAddressSelect(formattedAddress);
    } catch (error) {
      console.error("Error getting address details:", error);
    }
  };
  
  // Handle clicks outside the suggestion list to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionListRef.current &&
        !suggestionListRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle showing suggestions when input is focused
  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          className={cn(className)}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled || !isLoaded || !!loadError}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {showSuggestions && (
        <div
          ref={suggestionListRef}
          className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              {suggestion.title}
            </div>
          ))}
        </div>
      )}

      {loadError && (
        <div className="mt-1 text-sm text-red-500">
          Error loading maps: {loadError.message}
        </div>
      )}
    </div>
  );
}