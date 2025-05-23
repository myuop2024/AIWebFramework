// Jamaica parish boundary data
// Each parish includes approximate polygon coordinates and center point

// Parish boundary interface
export interface ParishBoundary {
  id: number;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  coordinates: Array<{
    lat: number;
    lng: number;
  }>;
}

// Approximate polygon coordinates for Jamaica's parishes
// These are simplified polygon coordinates for visualization purposes
export const JAMAICA_PARISHES: ParishBoundary[] = [
  // Kingston (small area in the southeast)
  {
    id: 1,
    name: "Kingston",
    center: { lat: 17.9784, lng: -76.7832 },
    coordinates: [
      { lat: 17.9850, lng: -76.7950 },
      { lat: 17.9820, lng: -76.7750 },
      { lat: 17.9700, lng: -76.7720 },
      { lat: 17.9670, lng: -76.7930 },
    ]
  },
  
  // St. Andrew (surrounds Kingston)
  {
    id: 2,
    name: "St. Andrew",
    center: { lat: 18.0280, lng: -76.7494 },
    coordinates: [
      { lat: 18.1100, lng: -76.7800 },
      { lat: 18.1050, lng: -76.7100 },
      { lat: 17.9950, lng: -76.7000 },
      { lat: 17.9850, lng: -76.7950 },
      { lat: 17.9900, lng: -76.8200 },
      { lat: 18.0300, lng: -76.8300 },
    ]
  },
  
  // St. Catherine
  {
    id: 3,
    name: "St. Catherine",
    center: { lat: 18.0426, lng: -77.0257 },
    coordinates: [
      { lat: 18.1800, lng: -77.0800 },
      { lat: 18.2000, lng: -76.9000 },
      { lat: 18.1050, lng: -76.7100 },
      { lat: 18.0300, lng: -76.8300 },
      { lat: 17.9300, lng: -77.0000 },
      { lat: 17.9000, lng: -77.1500 },
      { lat: 17.9500, lng: -77.2200 },
    ]
  },
  
  // Clarendon
  {
    id: 4,
    name: "Clarendon",
    center: { lat: 18.0400, lng: -77.2600 },
    coordinates: [
      { lat: 18.1800, lng: -77.0800 },
      { lat: 17.9500, lng: -77.2200 },
      { lat: 17.9000, lng: -77.4000 },
      { lat: 17.9700, lng: -77.5200 },
      { lat: 18.1500, lng: -77.3800 },
    ]
  },
  
  // Manchester
  {
    id: 5,
    name: "Manchester",
    center: { lat: 18.0400, lng: -77.5000 },
    coordinates: [
      { lat: 18.1500, lng: -77.3800 },
      { lat: 17.9700, lng: -77.5200 },
      { lat: 17.9300, lng: -77.6500 },
      { lat: 18.0700, lng: -77.6800 },
      { lat: 18.1700, lng: -77.5300 },
    ]
  },
  
  // St. Elizabeth
  {
    id: 6,
    name: "St. Elizabeth",
    center: { lat: 18.0680, lng: -77.7600 },
    coordinates: [
      { lat: 18.1700, lng: -77.5300 },
      { lat: 18.0700, lng: -77.6800 },
      { lat: 17.9300, lng: -77.6500 },
      { lat: 17.8800, lng: -77.8500 },
      { lat: 17.9000, lng: -77.9500 },
      { lat: 18.1400, lng: -77.9800 },
      { lat: 18.2000, lng: -77.8000 },
    ]
  },
  
  // Westmoreland
  {
    id: 7,
    name: "Westmoreland",
    center: { lat: 18.2196, lng: -78.1320 },
    coordinates: [
      { lat: 18.2000, lng: -77.8000 },
      { lat: 18.1400, lng: -77.9800 },
      { lat: 17.9000, lng: -77.9500 },
      { lat: 17.8900, lng: -78.1700 },
      { lat: 18.0300, lng: -78.3800 },
      { lat: 18.3500, lng: -78.1700 },
    ]
  },
  
  // Hanover
  {
    id: 8,
    name: "Hanover",
    center: { lat: 18.4062, lng: -78.1279 },
    coordinates: [
      { lat: 18.3500, lng: -78.1700 },
      { lat: 18.0300, lng: -78.3800 },
      { lat: 18.4000, lng: -78.3900 },
      { lat: 18.4600, lng: -78.2000 },
      { lat: 18.4500, lng: -78.0500 },
    ]
  },
  
  // St. James
  {
    id: 9,
    name: "St. James",
    center: { lat: 18.4762, lng: -77.9161 },
    coordinates: [
      { lat: 18.4500, lng: -78.0500 },
      { lat: 18.4600, lng: -78.2000 },
      { lat: 18.4000, lng: -78.3900 },
      { lat: 18.3800, lng: -77.9300 },
      { lat: 18.3000, lng: -77.7000 },
      { lat: 18.4300, lng: -77.7200 },
    ]
  },
  
  // Trelawny
  {
    id: 10,
    name: "Trelawny",
    center: { lat: 18.3521, lng: -77.6556 },
    coordinates: [
      { lat: 18.4300, lng: -77.7200 },
      { lat: 18.3000, lng: -77.7000 },
      { lat: 18.2000, lng: -77.8000 },
      { lat: 18.2000, lng: -77.5500 },
      { lat: 18.2600, lng: -77.5100 },
      { lat: 18.4900, lng: -77.5700 },
    ]
  },
  
  // St. Ann
  {
    id: 11,
    name: "St. Ann",
    center: { lat: 18.2437, lng: -77.4019 },
    coordinates: [
      { lat: 18.4900, lng: -77.5700 },
      { lat: 18.2600, lng: -77.5100 },
      { lat: 18.2000, lng: -77.5500 },
      { lat: 18.1700, lng: -77.5300 },
      { lat: 18.1500, lng: -77.3800 },
      { lat: 18.1800, lng: -77.0800 },
      { lat: 18.2000, lng: -77.0500 },
      { lat: 18.4600, lng: -77.2000 },
    ]
  },
  
  // St. Mary
  {
    id: 12,
    name: "St. Mary",
    center: { lat: 18.3613, lng: -76.9161 },
    coordinates: [
      { lat: 18.4600, lng: -77.2000 },
      { lat: 18.2000, lng: -77.0500 },
      { lat: 18.2000, lng: -76.9000 },
      { lat: 18.2400, lng: -76.7300 },
      { lat: 18.3000, lng: -76.7000 },
      { lat: 18.4000, lng: -76.8500 },
    ]
  },
  
  // Portland
  {
    id: 13,
    name: "Portland",
    center: { lat: 18.1094, lng: -76.5300 },
    coordinates: [
      { lat: 18.3000, lng: -76.7000 },
      { lat: 18.2400, lng: -76.7300 },
      { lat: 18.1050, lng: -76.7100 },
      { lat: 18.0300, lng: -76.5500 },
      { lat: 18.0800, lng: -76.3200 },
      { lat: 18.1800, lng: -76.2500 },
      { lat: 18.2600, lng: -76.6000 },
    ]
  },
  
  // St. Thomas
  {
    id: 14,
    name: "St. Thomas",
    center: { lat: 17.9574, lng: -76.4774 },
    coordinates: [
      { lat: 18.0300, lng: -76.5500 },
      { lat: 18.1050, lng: -76.7100 },
      { lat: 17.9950, lng: -76.7000 },
      { lat: 17.9670, lng: -76.7930 },
      { lat: 17.9700, lng: -76.7720 },
      { lat: 17.9500, lng: -76.6000 },
      { lat: 17.9000, lng: -76.3500 },
      { lat: 17.9500, lng: -76.3000 },
      { lat: 18.0800, lng: -76.3200 },
    ]
  }
];