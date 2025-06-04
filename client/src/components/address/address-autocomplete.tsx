import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useHereMaps } from "@/lib/here-maps";
import { getHereApiKey } from "@/lib/here-maps-config";
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

interface HereApiResultItem {
  title: string;
  address: AddressSuggestion['address'];
  position: { lat: number; lng: number };
  id: string;
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressSuggestion) => void;
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
    houseNumber?: string;
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
  
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);

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
      setIsSearching(false);
      return;
    }
    
    try {
      let apiKey: string;
      try {
        apiKey = getHereApiKey();
      } catch (error) {
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
            in: 'countryCode:JAM', // Filter to Jamaica specifically
            limit: 5
          },
          (result: { items: HereApiResultItem[] }) => {
            if (result && result.items) {
              const suggestions = result.items.map((item) => ({
                title: item.title,
                address: item.address || {
                  label: '',
                  countryCode: '',
                  countryName: '',
                  state: '',
                  county: '',
                  city: '',
                  district: '',
                  street: '',
                  postalCode: '',
                },
                position: item.position || { lat: 0, lng: 0 },
                id: item.id || Math.random().toString(36).substring(2)
              }));
              resolve(suggestions);
            } else {
              resolve([]);
            }
          },
          (error: Error) => {
            reject(error);
          }
        );
      });
      
      const results = await suggestionsPromise;
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
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
      return;
    }
    
    try {
      let apiKey: string;
      try {
        apiKey = getHereApiKey();
      } catch (error) {
        return;
      }
      
      // Create a platform instance
      const platform = new H.service.Platform({
        apikey: apiKey
      });
      
      // Get geocoding service
      const geocodingService = platform.getSearchService();
      
      // Create a promise to get detailed address information
      const geocodePromise = new Promise<HereApiResultItem>((resolve, reject) => {
        geocodingService.geocode(
          {
            q: suggestion.title,
            // Add more details to extract street numbers and parish info
            details: 1
          },
          (result: { items: HereApiResultItem[] }) => {
            if (result && result.items && result.items.length > 0) {
              resolve(result.items[0]);
            } else {
              // If no detailed result, use the suggestion data
              resolve({
                title: suggestion.title,
                position: suggestion.position,
                address: suggestion.address,
                id: suggestion.id
              });
            }
          },
          (error: unknown) => {
            reject(error);
          }
        );
      });
      
      const addressDetails = await geocodePromise;
      
      // Extract street number and street from addressDetails if available
      let streetWithNumber = '';
      let streetName = addressDetails.address?.street || '';
      let houseNumber = addressDetails.address?.houseNumber || '';
      
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
        <div className="relative">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <Input
            ref={inputRef}
            type="text"
            className={cn("pl-9 transition-shadow focus:shadow-blue-100", 
              isLoaded ? "border-gray-300 hover:border-gray-400" : "border-gray-200 bg-gray-50", 
              className
            )}
            placeholder={isLoaded ? placeholder : "Loading map service..."}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            disabled={disabled || !isLoaded || !!loadError}
          />
          {isSearching ? (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          ) : isLoaded && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 text-green-500" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          )}
        </div>
      </div>

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
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mt-0.5 mr-2 text-blue-600 flex-shrink-0" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div>
                  <div className="font-medium text-gray-800">{suggestion.title}</div>
                  {suggestion.address && suggestion.address.countryName && (
                    <div className="text-xs text-gray-600 mt-0.5">
                      {suggestion.address.countryName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loadError && (
        <div className="mt-1 text-sm text-red-500 flex flex-col items-start bg-red-50 p-2 rounded border border-red-200">
          <div className="flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1 flex-shrink-0" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>
              {loadError.message.includes('API key') 
                ? 'HERE Maps API key required. Please configure VITE_HERE_API_KEY.' 
                : `Map service unavailable: ${loadError.message}`
              }
            </span>
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-blue-700 underline hover:text-blue-900 focus:outline-none"
            onClick={() => setShowHelp(prev => !prev)}
          >
            Need help?
          </button>
          {showHelp && (
            <div className="mt-2 text-xs text-gray-700 bg-blue-50 border border-blue-100 rounded p-2 w-full">
              <div className="mb-1 font-semibold text-blue-800">Troubleshooting HERE Maps</div>
              <ol className="list-decimal ml-4 mb-2">
                <li>Check your internet connection.</li>
                <li>Ensure your browser allows third-party scripts.</li>
                <li>Contact support if the problem persists.</li>
              </ol>
              <div className="mb-1">For advanced diagnostics, open your browser console and run:</div>
              <pre className="bg-gray-100 rounded p-1 text-xs mb-2">window.testHereMaps()</pre>
              <button
                type="button"
                className="mt-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                onClick={() => {
                  if (typeof window !== 'undefined' && typeof window.testHereMaps === 'function') {
                    window.testHereMaps();
                    alert('Diagnostics started. Check your browser console for results.');
                  } else {
                    alert('Diagnostics tool not available. Please open the browser console and try again.');
                  }
                }}
              >
                Run Diagnostics
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}