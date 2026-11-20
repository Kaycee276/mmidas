import { Link } from 'react-router-dom';
import {
  Store,
  MapPin,
  ExternalLink,
  Navigation,
  ShieldCheck,
  X,
  Phone,
} from 'lucide-react';
import type { Merchant } from '../../types';
import { formatDistance, isValidCoordinate } from '../../lib/campusLocations';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface StorePreviewCardProps {
  store: Merchant;
  distanceKm?: number | null;
  onClose?: () => void;
  className?: string;
}

export const StorePreviewCard = ({
  store,
  distanceKm,
  onClose,
  className = '',
}: StorePreviewCardProps) => {
  const hasCoordinates = isValidCoordinate(store.latitude, store.longitude);

  const googleMapsDirectionsUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${store.business_name} ${store.business_address} UNN Nsukka`
      )}`;

  return (
    <Card className={`relative overflow-hidden border-(--accent-primary)/30 shadow-lg ${className}`}>
      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-lg p-1.5 text-(--text-tertiary) hover:bg-(--bg-tertiary) hover:text-(--text) transition-colors"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--bg-tertiary) text-(--accent-primary)">
            <Store className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-semibold text-base text-(--text) truncate">
                {store.business_name}
              </h3>
              {store.is_location_verified ? (
                <Badge variant="success" className="text-[10px] gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified Location
                </Badge>
              ) : (
                <Badge variant="default" className="text-[10px]">
                  Registered
                </Badge>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--text-secondary)">
              <span className="capitalize font-medium">
                {(store.business_type || 'Retail').replace(/_/g, ' ')}
              </span>
              {distanceKm !== undefined && distanceKm !== null && (
                <>
                  <span>•</span>
                  <span className="font-mono font-medium text-(--accent-primary)">
                    {formatDistance(distanceKm)} from you
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Location & description */}
        <div className="mt-4 space-y-2 border-t border-(--border) pt-3 text-xs">
          <div className="flex items-start gap-2 text-(--text-secondary)">
            <MapPin className="h-4 w-4 shrink-0 text-(--accent-primary) mt-0.5" />
            <div>
              <span className="font-medium text-(--text)">
                {store.location_name || 'UNN Campus Storefront'}
              </span>
              <p className="text-(--text-tertiary)">{store.business_address}</p>
            </div>
          </div>

          {store.business_description && (
            <p className="line-clamp-2 text-(--text-secondary) pt-1 text-xs leading-relaxed">
              {store.business_description}
            </p>
          )}

          {store.business_phone && (
            <div className="flex items-center gap-2 text-(--text-tertiary)">
              <Phone className="h-3.5 w-3.5" />
              <span>{store.business_phone}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-(--border) pt-4">
          <Link to={`/merchants/${store.id}`} className="flex-1 min-w-[130px]">
            <Button size="sm" className="w-full gap-1.5">
              <Store className="h-3.5 w-3.5" /> Visit Store
            </Button>
          </Link>

          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[130px]"
          >
            <Button variant="secondary" size="sm" className="w-full gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-(--accent-primary)" /> Directions
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
};

export default StorePreviewCard;
