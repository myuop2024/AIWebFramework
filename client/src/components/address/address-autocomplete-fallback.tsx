import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getHereApiKey } from "@/lib/here-maps-config";
import { Loader2, MapPin, AlertCircle, Navigation } from "lucide-react";
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
  
  // Then check for partial matches
  for (const parish of JAMAICAN_PARISHES) {
    if (locationText.includes(parish)) return parish;
    
    // Special case for St. parishes
    if (parish.startsWith("St.") && locationText.includes(parish.replace("St.", "St"))) {
      return parish;
    }
    
    if (parish.startsWith("St.") && locationText.includes(parish.substring(4))) {
      return parish;
    }
  }
  
  return null;
};

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
    houseNumber?: string;
  };
  position: {
    lat: number;
    lng: number;
  };
  id: string;
};

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressSuggestion) => void;
  initialValue?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function AddressAutocompleteFallback({
  onAddressSelect,
  initialValue = '',
  className = '',
  placeholder = 'Enter address for search...',
  disabled = false
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search function using HERE REST API
  const fetchAddressSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const apiKey = getHereApiKey();
      
      // Use HERE Autosuggest API
      const response = await fetch(
        `https://autosuggest.search.hereapi.com/v1/autosuggest?` +
        `at=18.0179,-76.8099&` +
        `in=countryCode:JAM&` +
        `q=${encodeURIComponent(query)}&` +
        `limit=5&` +
        `apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items) {
        const formattedSuggestions = data.items
          .filter((item: any) => item.resultType === 'place' || item.resultType === 'houseNumber')
          .map((item: any) => ({
            title: item.title,
            address: {
              label: item.address?.label || item.title,
              countryCode: item.address?.countryCode || 'JAM',
              countryName: item.address?.countryName || 'Jamaica',
              state: item.address?.state || '',
              county: item.address?.county || '',
              city: item.address?.city || '',
              district: item.address?.district || '',
              street: item.address?.street || '',
              postalCode: item.address?.postalCode || '',
              houseNumber: item.address?.houseNumber || '',
            },
            position: {
              lat: item.position?.lat || 0,
              lng: item.position?.lng || 0,
            },
            id: item.id || Math.random().toString(36).substring(2)
          }));

        setSuggestions(formattedSuggestions);
        setShowSuggestions(formattedSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setError("Unable to fetch address suggestions. Please check your connection.");
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    if (value.length >= 3) {
      timeoutRef.current = setTimeout(() => {
        fetchAddressSuggestions(value);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.title);
    setSuggestions([]);
    setShowSuggestions(false);

    // Get more detailed information if needed
    try {
      const apiKey = getHereApiKey();
      const response = await fetch(
        `https://geocode.search.hereapi.com/v1/geocode?` +
        `q=${encodeURIComponent(suggestion.title)}&` +
        `in=countryCode:JAM&` +
        `apiKey=${apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          
          // Find parish
          const parish = findJamaicanParish(
            item.address?.city || 
            item.address?.district || 
            item.address?.county || 
            item.address?.state || 
            ''
          );

          const enhancedSuggestion = {
            ...suggestion,
            address: {
              ...suggestion.address,
              label: item.address?.label || suggestion.address.label,
              street: item.address?.street || suggestion.address.street,
              houseNumber: item.address?.houseNumber || suggestion.address.houseNumber,
              city: item.address?.city || suggestion.address.city,
              state: parish || item.address?.state || suggestion.address.state,
              postalCode: item.address?.postalCode || suggestion.address.postalCode,
            },
            position: {
              lat: item.position?.lat || suggestion.position.lat,
              lng: item.position?.lng || suggestion.position.lng,
            }
          };

          onAddressSelect(enhancedSuggestion);
          return;
        }
      }
    } catch (error) {
      console.error("Error getting detailed address:", error);
    }

    // Fallback to original suggestion
    onAddressSelect(suggestion);
  };

  // Get user's current location and reverse geocode it
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setIsGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log('Current location:', latitude, longitude);

          // Reverse geocode the coordinates
          const apiKey = getHereApiKey();
          const response = await fetch(
            `https://revgeocode.search.hereapi.com/v1/revgeocode?` +
            `at=${latitude},${longitude}&` +
            `apiKey=${apiKey}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            
            // Find parish for Jamaica
            const parish = findJamaicanParish(
              item.address?.city || 
              item.address?.district || 
              item.address?.county || 
              item.address?.state || 
              ''
            );

            const locationSuggestion: AddressSuggestion = {
              title: item.title || item.address?.label || 'Current Location',
              address: {
                label: item.address?.label || 'Current Location',
                countryCode: item.address?.countryCode || 'JAM',
                countryName: item.address?.countryName || 'Jamaica',
                state: parish || item.address?.state || '',
                county: item.address?.county || '',
                city: item.address?.city || '',
                district: item.address?.district || '',
                street: item.address?.street || '',
                postalCode: item.address?.postalCode || '',
                houseNumber: item.address?.houseNumber || '',
              },
              position: {
                lat: latitude,
                lng: longitude,
              },
              id: 'current-location'
            };

            setInputValue(locationSuggestion.title);
            onAddressSelect(locationSuggestion);
          } else {
            setError("Could not find address for your current location.");
          }
        } catch (error) {
          console.error("Error reverse geocoding location:", error);
          setError("Failed to get address for your location. Please try again.");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Unable to get your location.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Handle click outside to close suggestions
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            ref={inputRef}
            type="text"
            className={cn("pl-9 transition-shadow focus:shadow-blue-100", className)}
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            disabled={disabled}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-3 py-2 h-auto whitespace-nowrap"
          onClick={handleGetCurrentLocation}
          disabled={disabled || isGettingLocation}
        >
          {isGettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Navigation className="h-4 w-4 mr-1" />
              Current Location
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {showSuggestions && (
        <div
          ref={suggestionListRef}
          className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto divide-y divide-gray-100"
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer transition-colors duration-150"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{suggestion.title}</div>
                  {suggestion.address.label && suggestion.address.label !== suggestion.title && (
                    <div className="text-gray-600 text-xs mt-1">{suggestion.address.label}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}