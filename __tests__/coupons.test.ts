import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCoupons, migrateCoupons } from '../src/lib/coupons';
import {
  createMockStripe,
  createMockCoupon,
  createMockListResponse,
  mockConsole,
} from './mocks';

describe('coupons', () => {
  let mockStripe: ReturnType<typeof createMockStripe>;
  let consoleSpy: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    mockStripe = createMockStripe();
    consoleSpy = mockConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchCoupons', () => {
    it('should fetch all coupons from a single page', async () => {
      const coupons = [createMockCoupon({ id: 'coupon_1' })];
      mockStripe.coupons.list.mockResolvedValue(
        createMockListResponse(coupons)
      );

      const result = await fetchCoupons(mockStripe);

      expect(result).toEqual(coupons);
      expect(mockStripe.coupons.list).toHaveBeenCalledTimes(1);
      expect(mockStripe.coupons.list).toHaveBeenCalledWith({ limit: 100 });
    });

    it('should paginate through multiple pages', async () => {
      const page1Coupons = [
        createMockCoupon({ id: 'coupon_1' }),
        createMockCoupon({ id: 'coupon_2' }),
      ];
      const page2Coupons = [createMockCoupon({ id: 'coupon_3' })];

      mockStripe.coupons.list
        .mockResolvedValueOnce(createMockListResponse(page1Coupons, true))
        .mockResolvedValueOnce(createMockListResponse(page2Coupons, false));

      const result = await fetchCoupons(mockStripe);

      expect(result).toHaveLength(3);
      expect(mockStripe.coupons.list).toHaveBeenCalledTimes(2);
      expect(mockStripe.coupons.list).toHaveBeenNthCalledWith(2, {
        limit: 100,
        starting_after: 'coupon_2',
      });
    });

    it('should handle empty coupon list', async () => {
      mockStripe.coupons.list.mockResolvedValue(createMockListResponse([]));

      const result = await fetchCoupons(mockStripe);

      expect(result).toEqual([]);
    });

    it('should log the number of fetched coupons', async () => {
      const coupons = [
        createMockCoupon({ id: 'coupon_1' }),
        createMockCoupon({ id: 'coupon_2' }),
        createMockCoupon({ id: 'coupon_3' }),
      ];
      mockStripe.coupons.list.mockResolvedValue(
        createMockListResponse(coupons)
      );

      await fetchCoupons(mockStripe);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('3 coupons')
      );
    });
  });

  describe('migrateCoupons', () => {
    let oldStripe: ReturnType<typeof createMockStripe>;
    let newStripe: ReturnType<typeof createMockStripe>;

    beforeEach(() => {
      oldStripe = createMockStripe();
      newStripe = createMockStripe();
    });

    it('should migrate coupon with null redeem_by', async () => {
      const coupon = createMockCoupon({
        id: 'coupon_valid',
        redeem_by: null,
      });
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse([coupon])
      );
      newStripe.coupons.create.mockResolvedValue(coupon);

      await migrateCoupons(oldStripe, newStripe);

      expect(newStripe.coupons.create).toHaveBeenCalledTimes(1);
    });

    it('should migrate coupon with future redeem_by date', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400; // 1 day in the future
      const coupon = createMockCoupon({
        id: 'coupon_future',
        redeem_by: futureTimestamp,
      });
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse([coupon])
      );
      newStripe.coupons.create.mockResolvedValue(coupon);

      await migrateCoupons(oldStripe, newStripe);

      expect(newStripe.coupons.create).toHaveBeenCalledTimes(1);
    });

    it('should skip expired coupons', async () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1 day in the past
      const coupon = createMockCoupon({
        id: 'coupon_expired',
        redeem_by: pastTimestamp,
      });
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse([coupon])
      );

      await migrateCoupons(oldStripe, newStripe);

      expect(newStripe.coupons.create).not.toHaveBeenCalled();
    });

    it('should create coupon with all properties', async () => {
      const coupon = createMockCoupon({
        id: 'coupon_test',
        amount_off: 500,
        currency: 'usd',
        duration: 'repeating',
        duration_in_months: 3,
        max_redemptions: 100,
        metadata: { promo: 'summer' },
        name: 'Summer Sale',
        percent_off: null,
      });
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse([coupon])
      );
      newStripe.coupons.create.mockResolvedValue(coupon);

      await migrateCoupons(oldStripe, newStripe);

      expect(newStripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'coupon_test',
          amount_off: 500,
          currency: 'usd',
          duration: 'repeating',
          duration_in_months: 3,
          max_redemptions: 100,
          metadata: { promo: 'summer' },
          name: 'Summer Sale',
        })
      );
    });

    it('should create percent_off coupon', async () => {
      const coupon = createMockCoupon({
        id: 'coupon_percent',
        amount_off: null,
        percent_off: 25,
        duration: 'forever',
      });
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse([coupon])
      );
      newStripe.coupons.create.mockResolvedValue(coupon);

      await migrateCoupons(oldStripe, newStripe);

      expect(newStripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining({
          percent_off: 25,
          duration: 'forever',
        })
      );
    });

    it('should skip existing coupons', async () => {
      const coupon = createMockCoupon({ id: 'coupon_existing' });
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse([coupon])
      );
      newStripe.coupons.create.mockRejectedValue(
        new Error('Coupon already exists in live mode: coupon_existing')
      );

      const result = await migrateCoupons(oldStripe, newStripe);

      expect(result).toContain(undefined);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('already exists')
      );
    });

    it('should throw non-"already exists" errors', async () => {
      const coupon = createMockCoupon({ id: 'coupon_test' });
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse([coupon])
      );
      newStripe.coupons.create.mockRejectedValue(new Error('Network error'));

      await expect(migrateCoupons(oldStripe, newStripe)).rejects.toThrow(
        'Network error'
      );
    });

    it('should return array of created coupons', async () => {
      const coupons = [
        createMockCoupon({ id: 'coupon_1' }),
        createMockCoupon({ id: 'coupon_2' }),
      ];
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse(coupons)
      );
      newStripe.coupons.create
        .mockResolvedValueOnce(coupons[0])
        .mockResolvedValueOnce(coupons[1]);

      const result = await migrateCoupons(oldStripe, newStripe);

      expect(result).toHaveLength(2);
    });

    it('should filter out expired coupons and migrate valid ones', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;
      const pastTimestamp = Math.floor(Date.now() / 1000) - 86400;
      const coupons = [
        createMockCoupon({ id: 'coupon_valid', redeem_by: futureTimestamp }),
        createMockCoupon({ id: 'coupon_expired', redeem_by: pastTimestamp }),
        createMockCoupon({ id: 'coupon_no_expiry', redeem_by: null }),
      ];
      oldStripe.coupons.list.mockResolvedValue(
        createMockListResponse(coupons)
      );
      newStripe.coupons.create.mockResolvedValue(coupons[0]);

      await migrateCoupons(oldStripe, newStripe);

      expect(newStripe.coupons.create).toHaveBeenCalledTimes(2);
    });
  });
});
