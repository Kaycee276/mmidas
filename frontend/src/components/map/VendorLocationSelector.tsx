import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Crosshair,
  Compass,
} from 'lucide-react';
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader';
import {
  UNN_CAMPUS_CENTER,
  UNN_LANDMARKS,
} from '../../lib/campusLocations';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface VendorLocationSelectorProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialLocationName?: string | null;
  onLocationChange: (loc: {
    latitude: number;
    longitude: number;
    locationName: string;
  }) => void;
  className?: string;
}

export const VendorLocationSelector = ({
  initialLatitude,
  initialLongitude,
  initialLocationName,
  onLocationChange,
  className = '',
}: VendorLocationSelectorProps) => {
  const [latitude, setLatitude] = useState<number>(
    initialLatitude || UNN_CAMPUS_CENTER.lat
  );
  const [longitude, setLongitude] = useState<number>(
    initialLongitude || UNN_CAMPUS_CENTER.lng
  );
  const [locationName, setLocationName] = useState<string>(
    initialLocationName || ''
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const { isLoaded } = useGoogleMapsLoader();

  // Notify parent of location changes
  const updateCoords = (lat: number, lng: number, name = locationName) => {
    setLatitude(lat);
    setLongitude(lng);
    onLocationChange({
      latitude: lat,
      longitude: lng,
      locationName: name,
    });
  };

  // Initialize interactive map when Google Maps loads
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !window.google?.maps) return;

    const initialCenter = {
      lat: initialLatitude || UNN_CAMPUS_CENTER.lat,
      lng: initialLongitude || UNN_CAMPUS_CENTER.lng,
    };

    if (!mapRef.current) {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialLatitude ? 17 : 15,
        mapTypeControl: false,
        streetViewControl: false,
      });
      mapRef.current = map;

      // Click to drop or move pin
      map.addListener('click', (e: any) => {
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        updateMarkerPosition(clickedLat, clickedLng);
      });
    }

    if (initialLatitude && initialLongitude) {
      updateMarkerPosition(initialLatitude, initialLongitude);
    }
  }, [isLoaded]);

  const updateMarkerPosition = (lat: number, lng: number) => {
    if (!mapRef.current || !window.google?.maps) return;

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: 'Your Shop Location',
      });

      markerRef.current.addListener('dragend', (e: any) => {
        const draggedLat = e.latLng.lat();
        const draggedLng = e.latLng.lng();
        updateCoords(draggedLat, draggedLng);
      });
    } else {
      markerRef.current.setPosition({ lat, lng });
    }

    mapRef.current.panTo({ lat, lng });
    updateCoords(lat, lng);
  };

  const handleLandmarkSelect = (landmark: (typeof UNN_LANDMARKS)[0]) => {
    updateCoords(landmark.lat, landmark.lng, landmark.name);
    setLocationName(landmark.name);
    if (mapRef.current) {
      updateMarkerPosition(landmark.lat, landmark.lng);
      mapRef.current.setZoom(17);
    }
  };

  const handleUseBrowserLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        updateCoords(lat, lng);
        if (mapRef.current) {
          updateMarkerPosition(lat, lng);
          mapRef.current.setZoom(17);
        }
      },
      () => {
        // Geolocation fallback
      }
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)">
            Physical Campus Location & GPS Pin
          </label>
          <p className="text-xs text-(--text-tertiary)">
            Drop a pin at your physical shop inside or around UNN campus so students can find you on the campus marketplace map.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleUseBrowserLocation}
          className="gap-1.5 text-xs shrink-0"
        >
          <Crosshair className="h-3.5 w-3.5 text-(--accent-primary)" />
          Pin My Current Device Location
        </Button>
      </div>

      {/* Recognizable Location Description */}
      <div>
        <Input
          label="Recognizable Location Landmark"
          placeholder="e.g. UNN Student Centre (SUB), Franco Complex, Odim Gate, Near Faculty of Engineering"
          value={locationName}
          onChange={(e) => {
            setLocationName(e.target.value);
            onLocationChange({
              latitude,
              longitude,
              locationName: e.target.value,
            });
          }}
        />
        <p className="mt-1 text-[11px] text-(--text-tertiary)">
          Students will see this exact campus landmark description on your store map marker preview.
        </p>
      </div>

      {/* Preset Campus Landmarks for Fast Pinning */}
      <div>
        <span className="text-[11px] font-medium text-(--text-tertiary) flex items-center gap-1 mb-2">
          <Compass className="h-3.5 w-3.5 text-(--accent-primary)" />
          Or choose from common UNN campus commercial zones:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {UNN_LANDMARKS.slice(0, 7).map((lm) => (
            <button
              key={lm.name}
              type="button"
              onClick={() => handleLandmarkSelect(lm)}
              className="rounded-lg border border-(--border) bg-(--bg-secondary) px-2.5 py-1 text-xs text-(--text-secondary) hover:border-(--accent-primary) hover:text-(--text) transition-colors"
            >
              {lm.name.replace('UNN ', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Map Pinning Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-(--border)">
        {isLoaded ? (
          <div
            ref={mapContainerRef}
            className="h-[320px] w-full"
            data-testid="vendor-location-map"
          />
        ) : (
          <div className="flex h-[260px] flex-col items-center justify-center p-6 text-center bg-(--bg-secondary)">
            <MapPin className="h-8 w-8 text-(--accent-primary) mb-2" />
            <h4 className="text-sm font-semibold text-(--text)">
              UNN Campus Location Coordinate Picker
            </h4>
            <p className="mt-1 max-w-sm text-xs text-(--text-secondary)">
              Click any of the preset campus landmarks above or manually adjust coordinates below to set your exact storefront position.
            </p>
          </div>
        )}

        <div className="border-t border-(--border) bg-(--bg-primary)/95 p-3 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-(--text-tertiary)">Latitude:</span>{' '}
              <span className="font-mono font-medium text-(--text)">
                {latitude.toFixed(6)}
              </span>
            </div>
            <div>
              <span className="text-(--text-tertiary)">Longitude:</span>{' '}
              <span className="font-mono font-medium text-(--text)">
                {longitude.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorLocationSelector;
