/**
 * Simplified geographical boundary data for Jamaica's parishes
 * These are approximations for demo purposes - actual implementation would use GeoJSON data
 */

export interface ParishBoundary {
  id: number;
  name: string;
  boundaries: Array<{lat: number; lng: number}>;
  color: string;
  center: {lat: number; lng: number};
}

export const JAMAICA_PARISHES: ParishBoundary[] = [
  {
    id: 1,
    name: 'Kingston',
    color: '#FF5252',
    center: {lat: 17.9970, lng: -76.7936},
    boundaries: [
      {lat: 17.9824, lng: -76.8134},
      {lat: 18.0134, lng: -76.8034},
      {lat: 18.0234, lng: -76.7734},
      {lat: 18.0024, lng: -76.7534},
      {lat: 17.9724, lng: -76.7734},
      {lat: 17.9724, lng: -76.8034},
      {lat: 17.9824, lng: -76.8134}
    ]
  },
  {
    id: 2,
    name: 'St. Andrew',
    color: '#7CB342',
    center: {lat: 18.0464, lng: -76.7436},
    boundaries: [
      {lat: 17.9824, lng: -76.8334},
      {lat: 18.0534, lng: -76.8334},
      {lat: 18.1034, lng: -76.7734},
      {lat: 18.1034, lng: -76.6734},
      {lat: 18.0334, lng: -76.6334},
      {lat: 17.9624, lng: -76.7434},
      {lat: 17.9824, lng: -76.8334}
    ]
  },
  {
    id: 3,
    name: 'St. Catherine',
    color: '#42A5F5',
    center: {lat: 18.0422, lng: -77.0557},
    boundaries: [
      {lat: 17.9324, lng: -76.9334},
      {lat: 18.0534, lng: -76.8734},
      {lat: 18.1334, lng: -76.9834},
      {lat: 18.1334, lng: -77.1034},
      {lat: 18.0334, lng: -77.2534},
      {lat: 17.9324, lng: -77.0834},
      {lat: 17.9324, lng: -76.9334}
    ]
  },
  {
    id: 4,
    name: 'Clarendon',
    color: '#FFAB40',
    center: {lat: 17.9589, lng: -77.2571},
    boundaries: [
      {lat: 17.8324, lng: -77.1134},
      {lat: 18.0234, lng: -77.0334},
      {lat: 18.1134, lng: -77.1734},
      {lat: 18.1134, lng: -77.3534},
      {lat: 17.9534, lng: -77.5034},
      {lat: 17.8324, lng: -77.3534},
      {lat: 17.8324, lng: -77.1134}
    ]
  },
  {
    id: 5,
    name: 'Manchester',
    color: '#9C27B0',
    center: {lat: 18.0418, lng: -77.5045},
    boundaries: [
      {lat: 17.9324, lng: -77.3334},
      {lat: 18.1034, lng: -77.3334},
      {lat: 18.1734, lng: -77.4834},
      {lat: 18.1734, lng: -77.6534},
      {lat: 18.0334, lng: -77.7534},
      {lat: 17.9324, lng: -77.5834},
      {lat: 17.9324, lng: -77.3334}
    ]
  },
  {
    id: 6,
    name: 'St. Elizabeth',
    color: '#FFC107',
    center: {lat: 18.0575, lng: -77.8077},
    boundaries: [
      {lat: 17.8324, lng: -77.6334},
      {lat: 18.0534, lng: -77.6334},
      {lat: 18.1734, lng: -77.7834},
      {lat: 18.1734, lng: -77.9534},
      {lat: 18.0334, lng: -78.0534},
      {lat: 17.8324, lng: -77.8534},
      {lat: 17.8324, lng: -77.6334}
    ]
  },
  {
    id: 7,
    name: 'Westmoreland',
    color: '#2196F3',
    center: {lat: 18.2210, lng: -78.1321},
    boundaries: [
      {lat: 18.0324, lng: -77.9334},
      {lat: 18.2534, lng: -77.9334},
      {lat: 18.3734, lng: -78.0834},
      {lat: 18.3734, lng: -78.3534},
      {lat: 18.1734, lng: -78.3534},
      {lat: 18.0324, lng: -78.1834},
      {lat: 18.0324, lng: -77.9334}
    ]
  },
  {
    id: 8,
    name: 'Hanover',
    color: '#8BC34A',
    center: {lat: 18.4068, lng: -78.1312},
    boundaries: [
      {lat: 18.2824, lng: -77.9934},
      {lat: 18.4534, lng: -77.9934},
      {lat: 18.5234, lng: -78.1434},
      {lat: 18.5234, lng: -78.3034},
      {lat: 18.3734, lng: -78.3534},
      {lat: 18.2824, lng: -78.1834},
      {lat: 18.2824, lng: -77.9934}
    ]
  },
  {
    id: 9,
    name: 'St. James',
    color: '#F44336',
    center: {lat: 18.4762, lng: -77.9134},
    boundaries: [
      {lat: 18.3324, lng: -77.8334},
      {lat: 18.5034, lng: -77.8334},
      {lat: 18.5934, lng: -77.9434},
      {lat: 18.5934, lng: -78.0534},
      {lat: 18.4534, lng: -78.1334},
      {lat: 18.3324, lng: -77.9834},
      {lat: 18.3324, lng: -77.8334}
    ]
  },
  {
    id: 10,
    name: 'Trelawny',
    color: '#4CAF50',
    center: {lat: 18.3523, lng: -77.6556},
    boundaries: [
      {lat: 18.2324, lng: -77.5334},
      {lat: 18.4034, lng: -77.4334},
      {lat: 18.5234, lng: -77.5434},
      {lat: 18.5934, lng: -77.7434},
      {lat: 18.4534, lng: -77.9034},
      {lat: 18.2324, lng: -77.7534},
      {lat: 18.2324, lng: -77.5334}
    ]
  },
  {
    id: 11,
    name: 'St. Ann',
    color: '#3F51B5',
    center: {lat: 18.4001, lng: -77.3707},
    boundaries: [
      {lat: 18.1824, lng: -77.2334},
      {lat: 18.4034, lng: -77.1334},
      {lat: 18.5734, lng: -77.2434},
      {lat: 18.5934, lng: -77.4434},
      {lat: 18.4534, lng: -77.6034},
      {lat: 18.1824, lng: -77.4534},
      {lat: 18.1824, lng: -77.2334}
    ]
  },
  {
    id: 12,
    name: 'St. Mary',
    color: '#E91E63',
    center: {lat: 18.3589, lng: -77.0456},
    boundaries: [
      {lat: 18.1824, lng: -76.9334},
      {lat: 18.3534, lng: -76.8334},
      {lat: 18.5234, lng: -76.9434},
      {lat: 18.5734, lng: -77.1434},
      {lat: 18.4534, lng: -77.2534},
      {lat: 18.1824, lng: -77.1034},
      {lat: 18.1824, lng: -76.9334}
    ]
  },
  {
    id: 13,
    name: 'Portland',
    color: '#FF9800',
    center: {lat: 18.1410, lng: -76.5291},
    boundaries: [
      {lat: 18.0324, lng: -76.5334},
      {lat: 18.2034, lng: -76.3334},
      {lat: 18.3734, lng: -76.4434},
      {lat: 18.3734, lng: -76.6434},
      {lat: 18.2334, lng: -76.7534},
      {lat: 18.0324, lng: -76.6834},
      {lat: 18.0324, lng: -76.5334}
    ]
  },
  {
    id: 14,
    name: 'St. Thomas',
    color: '#795548',
    center: {lat: 17.9871, lng: -76.4710},
    boundaries: [
      {lat: 17.8824, lng: -76.3334},
      {lat: 18.0534, lng: -76.2334},
      {lat: 18.1734, lng: -76.3434},
      {lat: 18.1734, lng: -76.6434},
      {lat: 18.0034, lng: -76.7534},
      {lat: 17.8824, lng: -76.5834},
      {lat: 17.8824, lng: -76.3334}
    ]
  }
];