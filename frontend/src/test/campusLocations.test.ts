import { describe, it, expect } from 'vitest';
import {
  calculateDistanceKm,
  formatDistance,
  isValidCoordinate,
  UNN_CAMPUS_CENTER,
  UNN_LANDMARKS,
} from '../lib/campusLocations';

describe('Campus Location & Marketplace Discovery Client Logic', () => {
  describe('Distance Calculation & Formatting', () => {
    it('should calculate distance between two identical points as 0', () => {
      const dist = calculateDistanceKm(
        UNN_CAMPUS_CENTER.lat,
        UNN_CAMPUS_CENTER.lng,
        UNN_CAMPUS_CENTER.lat,
        UNN_CAMPUS_CENTER.lng
      );
      expect(dist).toBeCloseTo(0, 4);
    });

    it('should calculate distance between UNN SUB and Franco Complex accurately (~200m)', () => {
      const sub = UNN_LANDMARKS.find((l) => l.name.includes('SUB'))!;
      const franco = UNN_LANDMARKS.find((l) => l.name.includes('Franco'))!;
      const distKm = calculateDistanceKm(sub.lat, sub.lng, franco.lat, franco.lng);
      // Distance is ~0.2 km
      expect(distKm).toBeGreaterThan(0.1);
      expect(distKm).toBeLessThan(0.4);
    });

    it('should format sub-kilometer distances in meters', () => {
      expect(formatDistance(0.35)).toBe('350 m');
      expect(formatDistance(0.05)).toBe('50 m');
    });

    it('should format kilometer distances with 1 decimal place', () => {
      expect(formatDistance(1.24)).toBe('1.2 km');
      expect(formatDistance(5.67)).toBe('5.7 km');
    });

    it('should handle null/undefined/NaN safely', () => {
      expect(formatDistance(null)).toBe('');
      expect(formatDistance(undefined)).toBe('');
      expect(formatDistance(NaN)).toBe('');
    });
  });

  describe('Coordinate Validation', () => {
    it('should accept valid coordinate numbers', () => {
      expect(isValidCoordinate(6.8687, 7.4065)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(-45.5, 120.12)).toBe(true);
    });

    it('should reject coordinates outside geographic bounds', () => {
      expect(isValidCoordinate(91.0, 7.4065)).toBe(false);
      expect(isValidCoordinate(-91.0, 7.4065)).toBe(false);
      expect(isValidCoordinate(6.8687, 181.0)).toBe(false);
      expect(isValidCoordinate(6.8687, -181.0)).toBe(false);
    });

    it('should reject null or undefined coordinates', () => {
      expect(isValidCoordinate(null, 7.4065)).toBe(false);
      expect(isValidCoordinate(6.8687, null)).toBe(false);
      expect(isValidCoordinate(undefined, undefined)).toBe(false);
    });
  });

  describe('Nearby Sorting', () => {
    it('should correctly sort stores by distance from user location', () => {
      const userLoc = { lat: 6.8687, lng: 7.4065 }; // UNN center

      const stores = [
        {
          id: '1',
          business_name: 'Far Store',
          latitude: 6.8562,
          longitude: 7.3958, // Ogige market (~1.8km)
        },
        {
          id: '2',
          business_name: 'Near Store',
          latitude: 6.8678,
          longitude: 7.4072, // SUB (~150m)
        },
        {
          id: '3',
          business_name: 'No Coord Store',
          latitude: null,
          longitude: null,
        },
      ];

      const mapped = stores.map((s) => ({
        ...s,
        dist:
          s.latitude !== null && s.longitude !== null
            ? calculateDistanceKm(userLoc.lat, userLoc.lng, s.latitude, s.longitude)
            : null,
      }));

      const sorted = [...mapped].sort((a, b) => {
        if (a.dist === null && b.dist === null) return 0;
        if (a.dist === null) return 1;
        if (b.dist === null) return -1;
        return a.dist - b.dist;
      });

      expect(sorted[0].business_name).toBe('Near Store');
      expect(sorted[1].business_name).toBe('Far Store');
      expect(sorted[2].business_name).toBe('No Coord Store');
    });
  });
});
