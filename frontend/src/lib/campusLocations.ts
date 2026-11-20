/**
 * UNN (University of Nigeria, Nsukka) Campus & Surrounding Commercial Landmarks
 * Reference coordinates for maps and location presets.
 */

export const UNN_CAMPUS_CENTER = {
  lat: 6.8687,
  lng: 7.4065,
};

export interface CampusLandmark {
  name: string;
  category: 'gate' | 'academic' | 'commercial' | 'hostel' | 'landmark';
  lat: number;
  lng: number;
  description: string;
}

export const UNN_LANDMARKS: CampusLandmark[] = [
  {
    name: 'UNN Student Union Building (SUB)',
    category: 'commercial',
    lat: 6.8678,
    lng: 7.4072,
    description: 'SUB Complex & Student Arcade',
  },
  {
    name: 'Nnamdi Azikiwe Library',
    category: 'academic',
    lat: 6.8695,
    lng: 7.4082,
    description: 'Zik Library Arcade & Promenade',
  },
  {
    name: 'Franco Refectory Complex',
    category: 'commercial',
    lat: 6.8665,
    lng: 7.4058,
    description: 'Franco Dining Hall & Commercial Kiosks',
  },
  {
    name: 'Faculty of Engineering (New Hall)',
    category: 'academic',
    lat: 6.8712,
    lng: 7.4115,
    description: 'Engineering complex & workshops',
  },
  {
    name: 'Faculty of Physical & Biological Sciences',
    category: 'academic',
    lat: 6.8701,
    lng: 7.4045,
    description: 'Science block & laboratory arcades',
  },
  {
    name: 'Odim Gate',
    category: 'gate',
    lat: 6.8631,
    lng: 7.4124,
    description: 'Odim Hill exit & student residential axis',
  },
  {
    name: 'UNN Main Gate (University Road)',
    category: 'gate',
    lat: 6.8582,
    lng: 7.4021,
    description: 'Primary campus entrance & transit hub',
  },
  {
    name: 'Green House / Flat Gate (Odenigwe Axis)',
    category: 'gate',
    lat: 6.8745,
    lng: 7.3995,
    description: 'Hilltop & Odenigwe student housing corridor',
  },
  {
    name: 'Marver Flat / Bello Hostel Axis',
    category: 'hostel',
    lat: 6.8648,
    lng: 7.4038,
    description: 'Student hostel corridor',
  },
  {
    name: 'Nsukka Campus Market & Ogige Commercial Axis',
    category: 'commercial',
    lat: 6.8562,
    lng: 7.3958,
    description: 'Off-campus retail, groceries & supplies',
  },
];

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats a distance in km into a human-readable string (e.g. "350 m" or "1.2 km")
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return '';
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Validates coordinate pair
 */
export function isValidCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined
): lat is number {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
