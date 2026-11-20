import { useState, useEffect } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export type GeolocationState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export function useCampusGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<GeolocationState>('prompt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    if ('permissions' in navigator && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((perm) => {
          setStatus(perm.state as GeolocationState);
          perm.onchange = () => {
            setStatus(perm.state as GeolocationState);
          };
        })
        .catch(() => {
          // Ignore permissions query failure
        });
    }
  }, []);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('granted');
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Location permission was denied. You can continue browsing with manual search.');
        } else {
          setError('Unable to retrieve your current location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  const clearLocation = () => {
    setLocation(null);
  };

  return {
    location,
    status,
    loading,
    error,
    requestLocation,
    clearLocation,
  };
}
