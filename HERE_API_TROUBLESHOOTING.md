# HERE API Troubleshooting Guide

## Issue Resolution Summary

The HERE API was not working due to missing service implementation and potential configuration issues. This guide provides the complete solution and troubleshooting steps.

## 🔧 **Fixed Issues**

### 1. Missing HERE Maps Service
**Problem**: The `hereMapsService` was being imported but didn't exist in the codebase.

**Solution**: Added complete HERE Maps service implementation to `client/src/lib/here-maps.ts`:

```typescript
export const hereMapsService = {
  async reverseGeocode(lat: number, lng: number),
  async geocodeAddress(address: string),
  async calculateRoute(originLat, originLng, destLat, destLng, transportMode),
  async searchPlaces(query: string, lat?: number, lng?: number)
};
```

### 2. Missing Environment Variable
**Problem**: `VITE_HERE_API_KEY` was not defined in environment configuration.

**Solution**: Added to `.env.example`:
```env
VITE_HERE_API_KEY=your_here_maps_api_key
```

## 🚀 **Setup Instructions**

### Step 1: Get HERE API Key
1. Go to [HERE Developer Portal](https://developer.here.com/)
2. Sign up for a free account
3. Create a new project
4. Generate an API key with the following services enabled:
   - Geocoding and Search API
   - Routing API
   - Map Tile API

### Step 2: Configure Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your HERE API key to `.env`:
   ```env
   VITE_HERE_API_KEY=your_actual_here_api_key_here
   ```

### Step 3: Restart Development Server
```bash
npm run dev
# or
yarn dev
```

## 🔍 **Troubleshooting Common Issues**

### Issue 1: "HERE Maps API key is missing"
**Symptoms**: Console error when trying to use maps or address autocomplete

**Solutions**:
1. Verify `.env` file exists and contains `VITE_HERE_API_KEY`
2. Restart development server after adding environment variables
3. Check that the API key is valid and not expired

### Issue 2: "Failed to load HERE Maps API"
**Symptoms**: Maps don't load, console shows script loading errors

**Solutions**:
1. Check internet connection
2. Verify HERE API key has proper permissions
3. Check browser console for specific error messages
4. Try clearing browser cache

### Issue 3: "HTTP error! status: 401"
**Symptoms**: API calls fail with authentication errors

**Solutions**:
1. Verify API key is correct
2. Check that API key has required service permissions:
   - Geocoding and Search API
   - Routing API
3. Ensure API key hasn't exceeded usage limits

### Issue 4: "HTTP error! status: 403"
**Symptoms**: API calls fail with forbidden errors

**Solutions**:
1. Check API key permissions
2. Verify domain restrictions (if any) in HERE developer console
3. Ensure API key is enabled for the services being used

### Issue 5: Address Autocomplete Not Working
**Symptoms**: No suggestions appear when typing addresses

**Solutions**:
1. Check browser console for API errors
2. Verify `VITE_HERE_API_KEY` is set correctly
3. Test with simple addresses first
4. Check network tab for failed API requests

### Issue 6: Route Planning Fails
**Symptoms**: "No route found" or route calculation errors

**Solutions**:
1. Verify both origin and destination are valid
2. Check that coordinates are within supported regions
3. Try different transport modes (car, pedestrian, bicycle)
4. Ensure routing API is enabled for your key

## 🧪 **Testing the Fix**

### Test 1: Address Autocomplete
1. Go to Profile page
2. Start typing in the address field
3. Verify suggestions appear from HERE Maps

### Test 2: Route Planning
1. Go to Route Planning page
2. Set origin and destination
3. Click "Calculate Route"
4. Verify route appears on map

### Test 3: Interactive Map
1. Go to any page with a map component
2. Verify map loads correctly
3. Test marker placement and interactions

## 📊 **API Usage Monitoring**

### Check API Usage
1. Log into [HERE Developer Portal](https://developer.here.com/)
2. Go to your project dashboard
3. Monitor API usage and limits
4. Set up alerts for usage thresholds

### Rate Limiting
The HERE API has the following limits for free accounts:
- **Geocoding**: 1,000 requests/day
- **Routing**: 1,000 requests/day
- **Map Tiles**: 25,000 requests/month

## 🔒 **Security Best Practices**

### Environment Variables
- Never commit `.env` files to version control
- Use different API keys for development and production
- Regularly rotate API keys

### API Key Restrictions
1. In HERE Developer Portal, set domain restrictions
2. Limit API key to specific services only
3. Monitor usage for unusual activity

### Error Handling
The implementation includes proper error handling:
```typescript
try {
  const result = await hereMapsService.geocodeAddress(address);
  // Handle success
} catch (error) {
  console.error("Geocoding error:", error);
  // Handle error gracefully
}
```

## 🚨 **Emergency Fallbacks**

### If HERE API is Down
1. The app will gracefully handle API failures
2. Users can still enter addresses manually
3. Basic functionality remains available

### Alternative Solutions
If HERE API continues to have issues:
1. **Google Maps API**: Can be integrated as alternative
2. **OpenStreetMap**: Free alternative with Nominatim
3. **Mapbox**: Another commercial alternative

## 📝 **Implementation Details**

### Service Architecture
```typescript
// Modern fetch-based implementation
export const hereMapsService = {
  async reverseGeocode(lat: number, lng: number) {
    const apiKey = import.meta.env.VITE_HERE_API_KEY;
    const response = await fetch(
      `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}&apiKey=${apiKey}`
    );
    return response.json();
  }
  // ... other methods
};
```

### Error Handling Strategy
- Graceful degradation when API is unavailable
- User-friendly error messages
- Automatic retry for transient failures
- Fallback to manual input when needed

### Performance Optimizations
- Debounced address autocomplete
- Cached geocoding results
- Efficient route calculation
- Minimal API calls

## 🔄 **Migration Notes**

### From Old Implementation
The new implementation:
- Uses modern fetch API instead of HERE SDK
- Provides better error handling
- Has consistent interface across all services
- Supports all required functionality

### Breaking Changes
- `hereMapsService` now returns promises
- Error handling is more robust
- API responses follow consistent format

## 📞 **Support Resources**

### HERE Developer Support
- [HERE Developer Documentation](https://developer.here.com/documentation)
- [HERE Community Forum](https://community.here.com/)
- [HERE Support Portal](https://developer.here.com/support)

### Internal Support
- Check console logs for detailed error messages
- Use browser network tab to debug API calls
- Test with minimal examples first

---

## ✅ **Verification Checklist**

- [ ] HERE API key obtained and configured
- [ ] Environment variables set correctly
- [ ] Development server restarted
- [ ] Address autocomplete working
- [ ] Route planning functional
- [ ] Maps loading correctly
- [ ] Error handling tested
- [ ] API usage monitored

The HERE API should now be fully functional with proper error handling and fallbacks. 