import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPlans, migratePlans } from "../src/lib/plans";
import {
  createMockListResponse,
  createMockPlan,
  createMockStripe,
  mockConsole,
} from "./mocks";

describe("plans", () => {
  let mockStripe: ReturnType<typeof createMockStripe>;
  let consoleSpy: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    mockStripe = createMockStripe();
    consoleSpy = mockConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchPlans", () => {
    it("should fetch all plans from a single page", async () => {
      const plans = [createMockPlan({ id: "plan_1" })];
      mockStripe.plans.list.mockResolvedValue(createMockListResponse(plans));

      const result = await fetchPlans(mockStripe);

      expect(result).toEqual(plans);
      expect(mockStripe.plans.list).toHaveBeenCalledTimes(1);
      expect(mockStripe.plans.list).toHaveBeenCalledWith({ limit: 100 });
    });

    it("should paginate through multiple pages", async () => {
      const page1Plans = [
        createMockPlan({ id: "plan_1" }),
        createMockPlan({ id: "plan_2" }),
      ];
      const page2Plans = [createMockPlan({ id: "plan_3" })];

      mockStripe.plans.list
        .mockResolvedValueOnce(createMockListResponse(page1Plans, true))
        .mockResolvedValueOnce(createMockListResponse(page2Plans, false));

      const result = await fetchPlans(mockStripe);

      expect(result).toHaveLength(3);
      expect(mockStripe.plans.list).toHaveBeenCalledTimes(2);
      expect(mockStripe.plans.list).toHaveBeenNthCalledWith(2, {
        limit: 100,
        starting_after: "plan_2",
      });
    });

    it("should handle empty plan list", async () => {
      mockStripe.plans.list.mockResolvedValue(createMockListResponse([]));

      const result = await fetchPlans(mockStripe);

      expect(result).toEqual([]);
    });

    it("should log the number of fetched plans", async () => {
      const plans = [createMockPlan({ id: "plan_1" })];
      mockStripe.plans.list.mockResolvedValue(createMockListResponse(plans));

      await fetchPlans(mockStripe);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("1 plans")
      );
    });
  });

  describe("migratePlans", () => {
    let oldStripe: ReturnType<typeof createMockStripe>;
    let newStripe: ReturnType<typeof createMockStripe>;

    beforeEach(() => {
      oldStripe = createMockStripe();
      newStripe = createMockStripe();
    });

    it("should only migrate active plans", async () => {
      const plans = [
        createMockPlan({ id: "plan_active", active: true }),
        createMockPlan({ id: "plan_inactive", active: false }),
      ];
      oldStripe.plans.list.mockResolvedValue(createMockListResponse(plans));
      newStripe.plans.create.mockResolvedValue(
        createMockPlan({ id: "plan_active" })
      );

      await migratePlans(oldStripe, newStripe);

      expect(newStripe.plans.create).toHaveBeenCalledTimes(1);
      expect(newStripe.plans.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: "plan_active" })
      );
    });

    it("should create plan with all properties", async () => {
      const plan = createMockPlan({
        id: "plan_test",
        amount: 2000,
        currency: "usd",
        interval: "month",
        interval_count: 1,
        metadata: { key: "value" },
        nickname: "Pro Plan",
        product: "prod_123",
        usage_type: "licensed",
      });
      oldStripe.plans.list.mockResolvedValue(createMockListResponse([plan]));
      newStripe.plans.create.mockResolvedValue(plan);

      await migratePlans(oldStripe, newStripe);

      expect(newStripe.plans.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "plan_test",
          amount: 2000,
          currency: "usd",
          interval: "month",
          interval_count: 1,
          metadata: { key: "value" },
          nickname: "Pro Plan",
          product: "prod_123",
          usage_type: "licensed",
        })
      );
    });

    it("should handle product as object", async () => {
      const plan = createMockPlan({
        id: "plan_test",
        product: { id: "prod_456" } as unknown as string,
      });
      oldStripe.plans.list.mockResolvedValue(createMockListResponse([plan]));
      newStripe.plans.create.mockResolvedValue(plan);

      await migratePlans(oldStripe, newStripe);

      expect(newStripe.plans.create).toHaveBeenCalledWith(
        expect.objectContaining({
          product: "prod_456",
        })
      );
    });

    it("should transform tiers correctly", async () => {
      const plan = createMockPlan({
        id: "plan_tiered",
        tiers_mode: "graduated",
        tiers: [
          {
            up_to: 10,
            flat_amount: 500,
            flat_amount_decimal: "500",
            unit_amount: 100,
            unit_amount_decimal: "100",
          },
          {
            up_to: null,
            flat_amount: null,
            flat_amount_decimal: null,
            unit_amount: 50,
            unit_amount_decimal: "50",
          },
        ],
      });
      oldStripe.plans.list.mockResolvedValue(createMockListResponse([plan]));
      newStripe.plans.create.mockResolvedValue(plan);

      await migratePlans(oldStripe, newStripe);

      expect(newStripe.plans.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tiers: [
            {
              up_to: 10,
              flat_amount: 500,
              flat_amount_decimal: "500",
              unit_amount: 100,
              unit_amount_decimal: "100",
            },
            {
              up_to: "inf",
              flat_amount: undefined,
              flat_amount_decimal: undefined,
              unit_amount: 50,
              unit_amount_decimal: "50",
            },
          ],
        })
      );
    });

    it("should skip existing plans", async () => {
      const plan = createMockPlan({ id: "plan_existing" });
      oldStripe.plans.list.mockResolvedValue(createMockListResponse([plan]));
      newStripe.plans.create.mockRejectedValue(
        new Error("Plan already exists in live mode: plan_existing")
      );

      const result = await migratePlans(oldStripe, newStripe);

      expect(result).toContain(undefined);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("already exists")
      );
    });

    it('should throw non-"already exists" errors', async () => {
      const plan = createMockPlan({ id: "plan_test" });
      oldStripe.plans.list.mockResolvedValue(createMockListResponse([plan]));
      newStripe.plans.create.mockRejectedValue(new Error("Network error"));

      await expect(migratePlans(oldStripe, newStripe)).rejects.toThrow(
        "Network error"
      );
    });

    it("should return array of created plans", async () => {
      const plans = [
        createMockPlan({ id: "plan_1" }),
        createMockPlan({ id: "plan_2" }),
      ];
      oldStripe.plans.list.mockResolvedValue(createMockListResponse(plans));
      newStripe.plans.create
        .mockResolvedValueOnce(plans[0])
        .mockResolvedValueOnce(plans[1]);

      const result = await migratePlans(oldStripe, newStripe);

      expect(result).toHaveLength(2);
    });

    it("should handle plans without tiers", async () => {
      const plan = createMockPlan({
        id: "plan_simple",
        tiers: null,
        tiers_mode: null,
      });
      oldStripe.plans.list.mockResolvedValue(createMockListResponse([plan]));
      newStripe.plans.create.mockResolvedValue(plan);

      await migratePlans(oldStripe, newStripe);

      expect(newStripe.plans.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tiers: undefined,
          tiers_mode: undefined,
        })
      );
    });
  });
});
