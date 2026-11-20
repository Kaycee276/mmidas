import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StorePreviewCard from '../components/map/StorePreviewCard';
import type { Merchant } from '../types';

describe('StorePreviewCard Component', () => {
  const mockStore: Merchant = {
    id: 'store-123',
    email: 'franco@midas.ng',
    business_name: 'Franco Refectory & Bites',
    business_type: 'restaurant',
    business_description: 'Premier campus dining in Franco Complex.',
    business_address: 'Shop 4, Franco Complex, UNN',
    business_phone: '+234 803 123 4567',
    owner_full_name: 'Emeka Okafor',
    owner_phone: '+234 803 123 4567',
    proximity_to_campus: 'on_campus',
    account_status: 'active',
    kyc_status: 'approved',
    terms_accepted: true,
    latitude: 6.8665,
    longitude: 7.4058,
    location_name: 'Franco Refectory Complex',
    is_location_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders store details, location landmark, and distance badge', () => {
    render(
      <BrowserRouter>
        <StorePreviewCard store={mockStore} distanceKm={0.45} />
      </BrowserRouter>
    );

    expect(screen.getByText('Franco Refectory & Bites')).toBeInTheDocument();
    expect(screen.getByText('Franco Refectory Complex')).toBeInTheDocument();
    expect(screen.getByText('Verified Location')).toBeInTheDocument();
    expect(screen.getByText('450 m from you')).toBeInTheDocument();
  });

  it('contains Visit Store link navigating to existing storefront /merchants/:id', () => {
    render(
      <BrowserRouter>
        <StorePreviewCard store={mockStore} />
      </BrowserRouter>
    );

    const visitLink = screen.getByRole('link', { name: /visit store/i });
    expect(visitLink).toBeInTheDocument();
    expect(visitLink).toHaveAttribute('href', '/merchants/store-123');
  });

  it('provides Google Maps directions anchor for stores with coordinates', () => {
    render(
      <BrowserRouter>
        <StorePreviewCard store={mockStore} />
      </BrowserRouter>
    );

    const directionsLink = screen.getByRole('link', { name: /directions/i });
    expect(directionsLink).toBeInTheDocument();
    expect(directionsLink).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir/?api=1&destination=6.8665,7.4058')
    );
  });

  it('calls onClose callback when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <BrowserRouter>
        <StorePreviewCard store={mockStore} onClose={handleClose} />
      </BrowserRouter>
    );

    const closeBtn = screen.getByLabelText(/close preview/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
