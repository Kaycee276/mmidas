import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Store,
  Layers,
} from 'lucide-react';
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader';
import {
  UNN_CAMPUS_CENTER,
  UNN_LANDMARKS,
  isValidCoordinate,
  calculateDistanceKm,
  formatDistance,
} from '../../lib/campusLocations';
import type { Merchant } from '../../types';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface CampusMapProps {
  merchants: Merchant[];
  selectedMerchantId?: string | null;
  onSelectMerchant?: (merchant: Merchant | null) => void;
  userLocation?: { lat: number; lng: number } | null;
  onLocateMe?: () => void;
  locationLoading?: boolean;
  className?: string;
}

export const CampusMap = ({
  merchants,
  selectedMerchantId,
  onSelectMerchant,
  userLocation,
  onLocateMe,
  locationLoading,
  className = '',
}: CampusMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);

  const { isLoaded, loadError, hasApiKey } = useGoogleMapsLoader();
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified'>('all');

  // Filter merchants that actually have valid coordinates
  const storesWithLocation = merchants.filter((m) =>
    isValidCoordinate(m.latitude, m.longitude)
  );

  const displayedStores = storesWithLocation.filter((m) => {
    if (activeFilter === 'verified') return m.is_location_verified;
    return true;
  });

  // Initialize or re-center Google Map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: UNN_CAMPUS_CENTER,
        zoom: 15,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi.school',
            elementType: 'geometry',
            stylers: [{ color: '#f5f5f5' }],
          },
          {
            featureType: 'poi.business',
            elementType: 'labels',
            stylers: [{ visibility: 'simplified' }],
          },
        ],
      });
      mapInstanceRef.current = map;
    }
  }, [isLoaded]);

  // Update store markers on map
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    const bounds = new window.google.maps.LatLngBounds();

    displayedStores.forEach((store) => {
      if (!isValidCoordinate(store.latitude, store.longitude)) return;

      const isSelected = selectedMerchantId === store.id;
      const position = { lat: store.latitude, lng: store.longitude };

      // SVG custom Pin styled to Midas design system
      const markerPinSvg = encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
            </filter>
          </defs>
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" 
                fill="${isSelected ? '#2563eb' : '#1e293b'}" 
                filter="url(#shadow)" stroke="#ffffff" stroke-width="2"/>
          <circle cx="18" cy="17" r="7" fill="#ffffff"/>
          <circle cx="18" cy="17" r="4.5" fill="${isSelected ? '#2563eb' : '#3b82f6'}"/>
        </svg>
      `);

      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: store.business_name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${markerPinSvg}`,
          scaledSize: new window.google.maps.Size(36, 44),
          anchor: new window.google.maps.Point(18, 44),
        },
        zIndex: isSelected ? 999 : 10,
      });

      marker.addListener('click', () => {
        if (onSelectMerchant) {
          onSelectMerchant(store);
        }
      });

      markersRef.current.set(store.id, marker);
      bounds.extend(position);
    });

    if (userLocation) {
      bounds.extend(userLocation);
    }

    // If a store was selected, pan smoothly to it
    if (selectedMerchantId) {
      const activeStore = displayedStores.find((s) => s.id === selectedMerchantId);
      if (
        activeStore &&
        isValidCoordinate(activeStore.latitude, activeStore.longitude)
      ) {
        mapInstanceRef.current.panTo({
          lat: activeStore.latitude,
          lng: activeStore.longitude,
        });
      }
    }
  }, [isLoaded, displayedStores, selectedMerchantId, userLocation, onSelectMerchant]);

  // Update user geolocation marker on map
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !window.google?.maps) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userDotSvg = encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="#3b82f6" fill-opacity="0.25"/>
          <circle cx="14" cy="14" r="7" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
          <circle cx="14" cy="14" r="4.5" fill="#2563eb"/>
        </svg>
      `);

      userMarkerRef.current = new window.google.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        title: 'You are here',
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${userDotSvg}`,
          scaledSize: new window.google.maps.Size(28, 28),
          anchor: new window.google.maps.Point(14, 14),
        },
        zIndex: 1000,
      });

      mapInstanceRef.current.panTo(userLocation);
    }
  }, [isLoaded, userLocation]);

  const recenterUNN = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(UNN_CAMPUS_CENTER);
      mapInstanceRef.current.setZoom(15);
    }
  };

  const handleLandmarkSelect = (landmark: (typeof UNN_LANDMARKS)[0]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: landmark.lat, lng: landmark.lng });
      mapInstanceRef.current.setZoom(17);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-(--border) bg-(--bg-secondary) ${className}`}>
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-xl border border-(--border) bg-(--bg-primary)/95 p-1 shadow-md backdrop-blur-md pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-(--accent-primary) text-white'
                : 'text-(--text-secondary) hover:text-(--text)'
            }`}
          >
            All Stores ({storesWithLocation.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('verified')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeFilter === 'verified'
                ? 'bg-(--accent-primary) text-white'
                : 'text-(--text-secondary) hover:text-(--text)'
            }`}
          >
            Verified Locations
          </button>
        </div>

        {/* Map Center & Geolocation Control Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={recenterUNN}
            className="gap-1.5 shadow-md bg-(--bg-primary)/95 backdrop-blur-md text-xs"
            title="Recenter on UNN Campus"
          >
            <Compass className="h-3.5 w-3.5 text-(--accent-primary)" />
            UNN Campus
          </Button>

          {onLocateMe && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onLocateMe}
              loading={locationLoading}
              className="gap-1.5 shadow-md bg-(--bg-primary)/95 backdrop-blur-md text-xs"
              title="Locate me on UNN Campus"
            >
              <Navigation className="h-3.5 w-3.5 text-(--accent-primary)" />
              {userLocation ? 'Near Me' : 'Find Near Me'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Map Canvas or Fallback View */}
      {isLoaded ? (
        <div
          ref={mapContainerRef}
          className="h-[460px] w-full sm:h-[540px] lg:h-[600px]"
          data-testid="google-campus-map"
        />
      ) : (
        /* Native Fallback Interactive Campus Explorer when Google Maps API key is pending or loading */
        <div className="flex h-[460px] w-full flex-col items-center justify-between p-6 sm:h-[540px] lg:h-[600px] bg-gradient-to-br from-(--bg-secondary) via-(--bg-primary) to-(--bg-tertiary)">
          <div className="text-center pt-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-(--accent-primary)/10 text-(--accent-primary) ring-1 ring-(--accent-primary)/20">
              <Compass className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-(--text)">
              UNN Interactive Campus Grid
            </h3>
            <p className="mt-1 max-w-md text-xs text-(--text-secondary)">
              {hasApiKey && loadError
                ? `Maps script error: ${loadError}. Showing high-precision UNN interactive campus coordinate explorer.`
                : 'Interactive UNN campus map view. Click any landmark or registered store below to explore.'}
            </p>
          </div>

          {/* UNN Landmark Nodes Grid */}
          <div className="w-full max-w-2xl py-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-(--text-tertiary) flex items-center gap-1">
                <Layers className="h-3 w-3" /> Key UNN Campus Zones
              </span>
              <span className="text-[10px] text-(--text-secondary)">
                Center: 6.8687° N, 7.4065° E
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {UNN_LANDMARKS.slice(0, 6).map((lm) => (
                <button
                  key={lm.name}
                  type="button"
                  onClick={() => handleLandmarkSelect(lm)}
                  className="flex flex-col text-left p-2.5 rounded-xl border border-(--border) bg-(--bg-primary) hover:border-(--accent-primary) transition-all text-xs"
                >
                  <span className="font-semibold text-(--text) truncate">{lm.name}</span>
                  <span className="text-[10px] text-(--text-tertiary) truncate">
                    {lm.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Registered Stores in UNN Vicinity */}
          <div className="w-full max-w-2xl pb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-(--text-tertiary) flex items-center gap-1">
                <Store className="h-3 w-3" /> Physical Store Pins ({displayedStores.length})
              </span>
              {displayedStores.length === 0 && (
                <span className="text-[11px] text-(--warning)">No registered coordinates yet</span>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {displayedStores.length === 0 ? (
                <div className="w-full rounded-xl border border-dashed border-(--border) p-4 text-center text-xs text-(--text-secondary)">
                  No stores have registered their campus GPS coordinates yet. Stores with physical locations will appear here automatically.
                </div>
              ) : (
                displayedStores.map((store) => {
                  const isSelected = selectedMerchantId === store.id;
                  const dist = userLocation && store.latitude && store.longitude
                    ? calculateDistanceKm(userLocation.lat, userLocation.lng, store.latitude, store.longitude)
                    : null;
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => onSelectMerchant && onSelectMerchant(store)}
                      className={`shrink-0 min-w-[200px] max-w-[240px] text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-(--accent-primary) bg-(--accent-primary)/5 ring-1 ring-(--accent-primary)'
                          : 'border-(--border) bg-(--bg-primary) hover:border-(--accent-primary)/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-(--text) truncate">
                          {store.business_name}
                        </span>
                        {store.is_location_verified && (
                          <Badge variant="success" className="text-[9px] px-1 py-0">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-(--text-secondary) truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-(--accent-primary) shrink-0" />
                        {store.location_name || store.business_address}
                      </p>
                      {dist !== null && (
                        <p className="mt-1 text-[10px] font-mono text-(--accent-primary)">
                          {formatDistance(dist)} away
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campus Map Landmark Navigation Quick Drawer */}
      <div className="border-t border-(--border) bg-(--bg-primary)/90 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="shrink-0 text-[11px] font-semibold text-(--text-secondary) flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-(--accent-primary)" />
              Jump to UNN Landmark:
            </span>
            {UNN_LANDMARKS.slice(0, 5).map((lm) => (
              <button
                key={lm.name}
                type="button"
                onClick={() => handleLandmarkSelect(lm)}
                className="shrink-0 rounded-md border border-(--border) bg-(--bg-secondary) px-2 py-0.5 text-[11px] font-medium text-(--text-secondary) hover:border-(--accent-primary) hover:text-(--text) transition-colors"
              >
                {lm.name.replace('UNN ', '')}
              </button>
            ))}
          </div>

          <span className="shrink-0 text-[11px] text-(--text-tertiary)">
            {displayedStores.length} stores pinned
          </span>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;
