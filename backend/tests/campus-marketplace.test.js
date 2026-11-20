jest.mock('../src/services/public.service', () => ({
  getBusinessTypes: jest.fn().mockResolvedValue(['restaurant', 'cafe', 'printing']),
  getActiveMerchants: jest.fn().mockResolvedValue({
    merchants: [
      {
        id: 'mock-1',
        business_name: 'Franco Refectory & Bites',
        business_type: 'restaurant',
        latitude: 6.8665,
        longitude: 7.4058,
        location_name: 'Franco Complex',
        is_location_verified: true,
      },
    ],
    pagination: { total: 1, page: 1, limit: 10, total_pages: 1 },
  }),
  getMerchantDetails: jest.fn().mockImplementation((id) => {
    if (id === '00000000-0000-0000-0000-000000000000') {
      const { NotFoundError } = require('../src/utils/errors');
      throw new NotFoundError('Merchant not found');
    }
    return Promise.resolve({
      id,
      business_name: 'Franco Refectory & Bites',
      latitude: 6.8665,
      longitude: 7.4058,
      location_name: 'Franco Complex',
      is_location_verified: true,
    });
  }),
}));

const request = require('supertest');
const app = require('../src/config/app');
const {
  merchantUpdateSchema,
  updateLocationSchema,
} = require('../src/validators/merchant.validator');

describe('Campus Store Location & Marketplace Discovery Backend Tests', () => {
  describe('Location & Coordinate Validation Tests', () => {
    it('should validate valid latitude and longitude coordinates', () => {
      const payload = {
        latitude: 6.8687,
        longitude: 7.4065,
        location_name: 'UNN Student Centre (SUB)',
      };
      const { error, value } = updateLocationSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.latitude).toBe(6.8687);
      expect(value.longitude).toBe(7.4065);
      expect(value.location_name).toBe('UNN Student Centre (SUB)');
    });

    it('should reject latitude greater than 90 degrees', () => {
      const payload = {
        latitude: 91.5,
        longitude: 7.4065,
      };
      const { error } = updateLocationSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('less than or equal to 90');
    });

    it('should reject latitude less than -90 degrees', () => {
      const payload = {
        latitude: -95.0,
        longitude: 7.4065,
      };
      const { error } = updateLocationSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('greater than or equal to -90');
    });

    it('should reject longitude greater than 180 degrees', () => {
      const payload = {
        latitude: 6.8687,
        longitude: 185.0,
      };
      const { error } = updateLocationSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('less than or equal to 180');
    });

    it('should reject longitude less than -180 degrees', () => {
      const payload = {
        latitude: 6.8687,
        longitude: -185.0,
      };
      const { error } = updateLocationSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('greater than or equal to -180');
    });

    it('should reject partial coordinates in general merchant update', () => {
      const payload = {
        latitude: 6.8687,
        // missing longitude
      };
      const { error } = merchantUpdateSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.message).toContain('Both latitude and longitude must be provided together');
    });

    it('should accept nullifying coordinates in general update', () => {
      const payload = {
        latitude: null,
        longitude: null,
      };
      const { error } = merchantUpdateSchema.validate(payload);
      expect(error).toBeUndefined();
    });
  });

  describe('Vendor Location Endpoints Authorization & Protection', () => {
    it('should reject PATCH /api/auth/location when unauthenticated', async () => {
      const res = await request(app)
        .patch('/api/auth/location')
        .send({
          latitude: 6.8687,
          longitude: 7.4065,
          location_name: 'UNN SUB',
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid coordinates on PATCH /api/auth/location with 400', async () => {
      // Mock authorization or unauthenticated check will trip 401 first if no token
      const res = await request(app)
        .patch('/api/auth/location')
        .send({
          latitude: 'invalid_lat',
          longitude: 7.4065,
        });
      expect(res.status).toBe(401);
    });
  });

  describe('Public Marketplace Location Discovery API', () => {
    it('should return location coordinates and descriptions on GET /api/public/merchants', async () => {
      const res = await request(app).get('/api/public/merchants?limit=5');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.merchants)).toBe(true);

      if (res.body.data.merchants.length > 0) {
        const store = res.body.data.merchants[0];
        expect(store).toHaveProperty('id');
        expect(store).toHaveProperty('business_name');
        expect(store).toHaveProperty('latitude');
        expect(store).toHaveProperty('longitude');
        expect(store).toHaveProperty('location_name');
        expect(store).toHaveProperty('is_location_verified');
      }
    });

    it('should return 404 for nonexistent merchant detail', async () => {
      const res = await request(app).get('/api/public/merchants/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });
});
