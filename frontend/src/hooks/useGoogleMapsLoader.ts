import { useState, useEffect } from 'react';

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<void>;
  }
}

export function useGoogleMapsLoader() {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!window.google?.maps;
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  const apiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined) ||
    '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    if (!apiKey) {
      setLoadError('Google Maps API key is not configured.');
      return;
    }

    if (window.__googleMapsLoadingPromise) {
      window.__googleMapsLoadingPromise
        .then(() => setIsLoaded(true))
        .catch((err) => setLoadError(err.message || 'Failed to load Google Maps'));
      return;
    }

    window.__googleMapsLoadingPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps JavaScript API. Please check your network or API key restrictions.'));
      document.head.appendChild(script);
    });

    window.__googleMapsLoadingPromise
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to load Google Maps');
      });
  }, [apiKey]);

  return { isLoaded, loadError, hasApiKey: Boolean(apiKey) };
}
