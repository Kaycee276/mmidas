import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Store,
  Map as MapIcon,
  List as ListIcon,
  Navigation,
} from 'lucide-react';
import { listMerchants } from '../../api/public';
import { getCacheKey, getFromCache } from '../../api/cache';
import type { ApiResponse, Merchant, Pagination } from '../../types';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import CampusMap from '../../components/map/CampusMap';
import StorePreviewCard from '../../components/map/StorePreviewCard';
import { useCampusGeolocation } from '../../hooks/useCampusGeolocation';
import {
  calculateDistanceKm,
  formatDistance,
  isValidCoordinate,
} from '../../lib/campusLocations';

const businessTypeOptions = [
  'restaurant',
  'cafe',
  'food_truck',
  'retail',
  'bookstore',
  'laundry',
  'salon',
  'gym',
  'tutoring',
  'printing',
  'electronics',
  'clothing',
  'other',
].map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

const proximityOptions = [
  { value: 'on_campus', label: 'On Campus' },
  { value: 'within_1km', label: 'Within 1km' },
  { value: 'within_2km', label: 'Within 2km' },
  { value: 'within_5km', label: 'Within 5km' },
  { value: 'more_than_5km', label: 'More than 5km' },
];

const formatProximity = (p: string) => proximityOptions.find((o) => o.value === p)?.label || p;

const MerchantList = () => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [proximity, setProximity] = useState('');
  const [sortByProximity, setSortByProximity] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);

  const {
    location: userLocation,
    status: geoStatus,
    loading: geoLoading,
    requestLocation,
    clearLocation,
  } = useCampusGeolocation();

  // Hydrate from cache immediately for 0ms instantaneous render on "Back to Merchants"
  const [merchants, setMerchants] = useState<Merchant[]>(() => {
    const key = getCacheKey('/public/merchants', { page: 1, limit: 12 });
    const cached =
      getFromCache<ApiResponse<{ merchants: Merchant[]; pagination: Pagination }>>(key);
    return cached?.data?.merchants || [];
  });
  const [pagination, setPagination] = useState<Pagination | null>(() => {
    const key = getCacheKey('/public/merchants', { page: 1, limit: 12 });
    const cached =
      getFromCache<ApiResponse<{ merchants: Merchant[]; pagination: Pagination }>>(key);
    return cached?.data?.pagination || null;
  });
  const [loading, setLoading] = useState(() => merchants.length === 0);

  const fetchMerchants = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner || merchants.length === 0) {
      setLoading(true);
    }
    try {
      const { data } = await listMerchants({
        page,
        limit: 12,
        search: search || undefined,
        business_type: businessType || undefined,
        proximity: proximity || undefined,
      });
      setMerchants(data.data.merchants);
      setPagination(data.data.pagination);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only show full-screen spinner if we don't already have merchants displayed
    fetchMerchants(merchants.length === 0);
  }, [page, businessType, proximity]);

  const handleSearch = () => {
    setPage(1);
    fetchMerchants(true);
  };

  // Calculate distances & proximity sort when user location is available
  const processedMerchants = useMemo(() => {
    const withDistance = merchants.map((m) => {
      let distanceKm: number | null = null;
      if (
        userLocation &&
        isValidCoordinate(m.latitude, m.longitude) &&
        m.latitude !== null &&
        m.latitude !== undefined &&
        m.longitude !== null &&
        m.longitude !== undefined
      ) {
        distanceKm = calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          m.latitude,
          m.longitude
        );
      }
      return { ...m, distanceKm };
    });

    if (sortByProximity && userLocation) {
      return [...withDistance].sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return withDistance;
  }, [merchants, userLocation, sortByProximity]);

  const selectedStoreDistance = useMemo(() => {
    if (!selectedMerchant || !userLocation) return null;
    if (
      !isValidCoordinate(selectedMerchant.latitude, selectedMerchant.longitude) ||
      selectedMerchant.latitude === null ||
      selectedMerchant.latitude === undefined ||
      selectedMerchant.longitude === null ||
      selectedMerchant.longitude === undefined
    ) {
      return null;
    }
    return calculateDistanceKm(
      userLocation.lat,
      userLocation.lng,
      selectedMerchant.latitude,
      selectedMerchant.longitude
    );
  }, [selectedMerchant, userLocation]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--text)">
            Campus Marketplace Discovery
          </h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            Explore verified shops and student ventures at University of Nigeria, Nsukka (UNN).
          </p>
        </div>

        {/* View Toggle: List vs Campus Map */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-(--border) bg-(--bg-secondary) p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-(--bg-primary) text-(--text) shadow-xs'
                  : 'text-(--text-secondary) hover:text-(--text)'
              }`}
            >
              <ListIcon className="h-4 w-4" />
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-(--accent-primary) text-white shadow-xs'
                  : 'text-(--text-secondary) hover:text-(--text)'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              Campus Map
            </button>
          </div>
        </div>
      </div>

      {/* Geolocation Status / Proximity Discovery Banner */}
      <div className="mb-6 rounded-xl border border-(--border) bg-(--bg-secondary)/60 p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-(--text-secondary)">
          <Navigation className="h-4 w-4 text-(--accent-primary)" />
          {userLocation ? (
            <span>
              <strong className="text-(--text)">Your Device Location Active</strong> &bull; Distance calculated to campus shops.
            </span>
          ) : geoStatus === 'denied' ? (
            <span>
              Location permission denied. Browsing in campus default overview mode.
            </span>
          ) : (
            <span>
              Enable location discovery to see exact walking distances and sort nearby campus stores.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {userLocation ? (
            <>
              <button
                type="button"
                onClick={() => setSortByProximity(!sortByProximity)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                  sortByProximity
                    ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
                    : 'border-(--border) bg-(--bg-primary) text-(--text-secondary) hover:text-(--text)'
                }`}
              >
                {sortByProximity ? '✓ Sorted by Proximity' : 'Sort by Distance'}
              </button>
              <button
                type="button"
                onClick={clearLocation}
                className="text-[11px] text-(--text-tertiary) hover:text-(--text) underline"
              >
                Clear
              </button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={requestLocation}
              loading={geoLoading}
              className="gap-1.5 text-xs"
            >
              <Navigation className="h-3.5 w-3.5 text-(--accent-primary)" />
              Enable Nearby Discovery
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search merchants by name or services..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Select
            options={businessTypeOptions}
            value={businessType}
            onChange={(e) => {
              setBusinessType(e.target.value);
              setPage(1);
            }}
            placeholder="All Categories"
          />
          <Select
            options={proximityOptions}
            value={proximity}
            onChange={(e) => {
              setProximity(e.target.value);
              setPage(1);
            }}
            placeholder="Any Proximity"
          />
        </div>
      </Card>

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <div className="space-y-6">
          <CampusMap
            merchants={processedMerchants}
            selectedMerchantId={selectedMerchant?.id}
            onSelectMerchant={(m) => setSelectedMerchant(m)}
            userLocation={userLocation}
            onLocateMe={requestLocation}
            locationLoading={geoLoading}
          />

          {/* Interactive Selected Store Preview */}
          {selectedMerchant && (
            <div className="animate-in fade-in duration-200">
              <StorePreviewCard
                store={selectedMerchant}
                distanceKm={selectedStoreDistance}
                onClose={() => setSelectedMerchant(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <>
          {loading ? (
            <Spinner size="lg" className="py-20" />
          ) : processedMerchants.length === 0 ? (
            <div className="py-20 text-center text-(--text-secondary)">
              <Store className="mx-auto h-12 w-12 text-(--text-tertiary)" />
              <p className="mt-4">No merchants found matching your campus filters</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {processedMerchants.map((m) => (
                  <Link key={m.id} to={`/merchants/${m.id}`}>
                    <Card className="h-full transition-all hover:border-(--accent-primary) hover:shadow-md flex flex-col justify-between p-5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold text-(--text) line-clamp-1">
                            {m.business_name}
                          </h3>
                          <Badge>{m.business_type.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-(--text-secondary) leading-relaxed">
                          {m.business_description}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-(--border) pt-3 space-y-1 text-xs text-(--text-tertiary)">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 text-(--accent-primary) shrink-0" />
                            {m.location_name || formatProximity(m.proximity_to_campus)}
                          </span>
                          {m.is_location_verified && (
                            <span className="shrink-0 text-[10px] text-(--success) font-medium">
                              Verified
                            </span>
                          )}
                        </div>

                        {m.distanceKm !== null && m.distanceKm !== undefined && (
                          <div className="flex items-center gap-1 font-mono text-[11px] font-medium text-(--accent-primary)">
                            <Navigation className="h-3 w-3 shrink-0" />
                            {formatDistance(m.distanceKm)} away
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              {pagination && pagination.total_pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-(--text-secondary)">
                    Page {page} of {pagination.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.total_pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MerchantList;
