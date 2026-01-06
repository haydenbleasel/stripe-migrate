import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelAllSubscriptions,
  fetchCustomers,
  fetchSubscriptions,
  getAnonymisedEmail,
  migrateSubscriptions,
} from "../src/lib/subscriptions";
import {
  createMockCustomer,
  createMockListResponse,
  createMockPaymentMethod,
  createMockStripe,
  createMockSubscription,
  mockConsole,
} from "./mocks";

const EXAMPLE_EMAIL_REGEX = /@example\.com$/;

describe("subscriptions", () => {
  let consoleSpy: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    consoleSpy = mockConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAnonymisedEmail", () => {
    it("should return MD5 hash of email with @example.com domain", () => {
      const email = "test@test.com";
      const expectedHash = crypto.createHash("md5").update(email).digest("hex");
      const result = getAnonymisedEmail(email);

      expect(result).toBe(`${expectedHash}@example.com`);
    });

    it("should return consistent hash for same email", () => {
      const email = "consistent@test.com";
      const result1 = getAnonymisedEmail(email);
      const result2 = getAnonymisedEmail(email);

      expect(result1).toBe(result2);
    });

    it("should return different hashes for different emails", () => {
      const result1 = getAnonymisedEmail("email1@test.com");
      const result2 = getAnonymisedEmail("email2@test.com");

      expect(result1).not.toBe(result2);
    });

    it("should always end with @example.com", () => {
      const emails = ["test@gmail.com", "user@company.org", "admin@site.io"];

      for (const email of emails) {
        expect(getAnonymisedEmail(email)).toMatch(EXAMPLE_EMAIL_REGEX);
      }
    });

    it("should handle empty string", () => {
      const result = getAnonymisedEmail("");
      const expectedHash = crypto.createHash("md5").update("").digest("hex");

      expect(result).toBe(`${expectedHash}@example.com`);
    });
  });

  describe("fetchSubscriptions", () => {
    let mockStripe: ReturnType<typeof createMockStripe>;

    beforeEach(() => {
      mockStripe = createMockStripe();
    });

    it("should fetch all subscriptions from a single page", async () => {
      const subscriptions = [createMockSubscription({ id: "sub_1" })];
      mockStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse(subscriptions)
      );

      const result = await fetchSubscriptions(mockStripe);

      expect(result).toEqual(subscriptions);
      expect(mockStripe.subscriptions.list).toHaveBeenCalledTimes(1);
      expect(mockStripe.subscriptions.list).toHaveBeenCalledWith({
        limit: 100,
        expand: ["data.customer", "data.default_payment_method"],
      });
    });

    it("should paginate through multiple pages", async () => {
      const page1Subscriptions = [
        createMockSubscription({ id: "sub_1" }),
        createMockSubscription({ id: "sub_2" }),
      ];
      const page2Subscriptions = [createMockSubscription({ id: "sub_3" })];

      mockStripe.subscriptions.list
        .mockResolvedValueOnce(createMockListResponse(page1Subscriptions, true))
        .mockResolvedValueOnce(
          createMockListResponse(page2Subscriptions, false)
        );

      const result = await fetchSubscriptions(mockStripe);

      expect(result).toHaveLength(3);
      expect(mockStripe.subscriptions.list).toHaveBeenCalledTimes(2);
    });

    it("should handle empty subscription list", async () => {
      mockStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([])
      );

      const result = await fetchSubscriptions(mockStripe);

      expect(result).toEqual([]);
    });

    it("should log the number of fetched subscriptions", async () => {
      const subscriptions = [
        createMockSubscription({ id: "sub_1" }),
        createMockSubscription({ id: "sub_2" }),
      ];
      mockStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse(subscriptions)
      );

      await fetchSubscriptions(mockStripe);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("2 subscriptions")
      );
    });
  });

  describe("fetchCustomers", () => {
    let mockStripe: ReturnType<typeof createMockStripe>;

    beforeEach(() => {
      mockStripe = createMockStripe();
    });

    it("should fetch all customers from a single page", async () => {
      const customers = [createMockCustomer({ id: "cus_1" })];
      mockStripe.customers.list.mockResolvedValue(
        createMockListResponse(customers)
      );

      const result = await fetchCustomers(mockStripe);

      expect(result).toEqual(customers);
      expect(mockStripe.customers.list).toHaveBeenCalledTimes(1);
      expect(mockStripe.customers.list).toHaveBeenCalledWith({ limit: 100 });
    });

    it("should paginate through multiple pages", async () => {
      const page1Customers = [
        createMockCustomer({ id: "cus_1" }),
        createMockCustomer({ id: "cus_2" }),
      ];
      const page2Customers = [createMockCustomer({ id: "cus_3" })];

      mockStripe.customers.list
        .mockResolvedValueOnce(createMockListResponse(page1Customers, true))
        .mockResolvedValueOnce(createMockListResponse(page2Customers, false));

      const result = await fetchCustomers(mockStripe);

      expect(result).toHaveLength(3);
      expect(mockStripe.customers.list).toHaveBeenCalledTimes(2);
    });

    it("should handle empty customer list", async () => {
      mockStripe.customers.list.mockResolvedValue(createMockListResponse([]));

      const result = await fetchCustomers(mockStripe);

      expect(result).toEqual([]);
    });

    it("should log the number of fetched customers", async () => {
      const customers = [createMockCustomer({ id: "cus_1" })];
      mockStripe.customers.list.mockResolvedValue(
        createMockListResponse(customers)
      );

      await fetchCustomers(mockStripe);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("1 customers")
      );
    });
  });

  describe("cancelAllSubscriptions", () => {
    let mockStripe: ReturnType<typeof createMockStripe>;

    beforeEach(() => {
      mockStripe = createMockStripe();
    });

    it("should fetch and cancel all subscriptions", async () => {
      const subscriptions = [
        createMockSubscription({ id: "sub_1" }),
        createMockSubscription({ id: "sub_2" }),
        createMockSubscription({ id: "sub_3" }),
      ];
      mockStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse(subscriptions)
      );
      mockStripe.subscriptions.cancel.mockResolvedValue({});

      await cancelAllSubscriptions(mockStripe);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledTimes(3);
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith("sub_1");
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith("sub_2");
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith("sub_3");
    });

    it("should handle empty subscription list", async () => {
      mockStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([])
      );

      await cancelAllSubscriptions(mockStripe);

      expect(mockStripe.subscriptions.cancel).not.toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("No subscriptions to cancel")
      );
    });

    it("should paginate through multiple pages", async () => {
      const page1Subscriptions = [
        createMockSubscription({ id: "sub_1" }),
        createMockSubscription({ id: "sub_2" }),
      ];
      const page2Subscriptions = [createMockSubscription({ id: "sub_3" })];

      mockStripe.subscriptions.list
        .mockResolvedValueOnce(createMockListResponse(page1Subscriptions, true))
        .mockResolvedValueOnce(
          createMockListResponse(page2Subscriptions, false)
        );
      mockStripe.subscriptions.cancel.mockResolvedValue({});

      await cancelAllSubscriptions(mockStripe);

      expect(mockStripe.subscriptions.list).toHaveBeenCalledTimes(2);
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledTimes(3);
    });

    it("should log success count", async () => {
      const subscriptions = [
        createMockSubscription({ id: "sub_1" }),
        createMockSubscription({ id: "sub_2" }),
      ];
      mockStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse(subscriptions)
      );
      mockStripe.subscriptions.cancel.mockResolvedValue({});

      await cancelAllSubscriptions(mockStripe);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Cancelled 2 subscriptions")
      );
    });

    it("should handle partial failures gracefully", async () => {
      const subscriptions = [
        createMockSubscription({ id: "sub_1" }),
        createMockSubscription({ id: "sub_2" }),
        createMockSubscription({ id: "sub_3" }),
      ];
      mockStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse(subscriptions)
      );
      mockStripe.subscriptions.cancel
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("API error"))
        .mockResolvedValueOnce({});

      await cancelAllSubscriptions(mockStripe);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Cancelled 2 subscriptions")
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Failed to cancel 1 subscriptions")
      );
    });

    it("should log each cancelled subscription", async () => {
      const subscriptions = [createMockSubscription({ id: "sub_123" })];
      mockStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse(subscriptions)
      );
      mockStripe.subscriptions.cancel.mockResolvedValue({});

      await cancelAllSubscriptions(mockStripe);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Cancelled subscription sub_123")
      );
    });
  });

  describe("migrateSubscriptions", () => {
    let oldStripe: ReturnType<typeof createMockStripe>;
    let newStripe: ReturnType<typeof createMockStripe>;

    beforeEach(() => {
      oldStripe = createMockStripe();
      newStripe = createMockStripe();
    });

    it("should filter deleted customers", async () => {
      const customers = [
        createMockCustomer({ id: "cus_active", deleted: undefined }),
        createMockCustomer({
          id: "cus_deleted",
          deleted: true,
        } as unknown as Partial<import("stripe").Stripe.Customer>),
      ];
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse(customers)
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([])
      );

      await migrateSubscriptions(oldStripe, newStripe, [], [], false);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("1 customers")
      );
    });

    it("should filter customers by customerIds when provided", async () => {
      const customers = [
        createMockCustomer({ id: "cus_1" }),
        createMockCustomer({ id: "cus_2" }),
        createMockCustomer({ id: "cus_3" }),
      ];
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse(customers)
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([])
      );

      await migrateSubscriptions(
        oldStripe,
        newStripe,
        ["cus_1", "cus_2"],
        [],
        false
      );

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("only include 2 customer ids")
      );
    });

    it("should omit customers by omitCustomerIds when provided", async () => {
      const customers = [
        createMockCustomer({ id: "cus_1" }),
        createMockCustomer({ id: "cus_2" }),
        createMockCustomer({ id: "cus_3" }),
      ];
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse(customers)
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([])
      );

      await migrateSubscriptions(oldStripe, newStripe, [], ["cus_3"], false);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("omit 1 customer ids")
      );
    });

    it("should only migrate active subscriptions", async () => {
      const customer = createMockCustomer({ id: "cus_test" });
      const subscriptions = [
        createMockSubscription({
          id: "sub_active",
          status: "active",
          customer: "cus_test",
        }),
        createMockSubscription({
          id: "sub_canceled",
          status: "canceled",
          customer: "cus_test",
        }),
        createMockSubscription({
          id: "sub_past_due",
          status: "past_due",
          customer: "cus_test",
        }),
      ];
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse([customer])
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse(subscriptions)
      );
      newStripe.paymentMethods.list.mockResolvedValue(
        createMockListResponse([createMockPaymentMethod()])
      );
      newStripe.subscriptions.create.mockResolvedValue(
        createMockSubscription({ id: "sub_new" })
      );

      await migrateSubscriptions(oldStripe, newStripe, [], [], false);

      expect(newStripe.subscriptions.create).toHaveBeenCalledTimes(1);
    });

    it("should only migrate subscriptions for specified customers", async () => {
      const customers = [
        createMockCustomer({ id: "cus_1" }),
        createMockCustomer({ id: "cus_2" }),
      ];
      const subscriptions = [
        createMockSubscription({
          id: "sub_1",
          customer: "cus_1",
          status: "active",
        }),
        createMockSubscription({
          id: "sub_2",
          customer: "cus_2",
          status: "active",
        }),
      ];
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse(customers)
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse(subscriptions)
      );
      newStripe.paymentMethods.list.mockResolvedValue(
        createMockListResponse([createMockPaymentMethod()])
      );
      newStripe.subscriptions.create.mockResolvedValue(
        createMockSubscription({ id: "sub_new" })
      );

      await migrateSubscriptions(oldStripe, newStripe, ["cus_1"], [], false);

      expect(newStripe.subscriptions.create).toHaveBeenCalledTimes(1);
      expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_1",
        })
      );
    });

    it("should throw error when customer in customerIds is not found", async () => {
      const customers = [createMockCustomer({ id: "cus_1" })];
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse(customers)
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([])
      );

      await expect(
        migrateSubscriptions(
          oldStripe,
          newStripe,
          ["cus_nonexistent"],
          [],
          false
        )
      ).rejects.toThrow("Failed to find customer cus_nonexistent");
    });

    it("should set trial_end to current_period_end", async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 86_400 * 30;
      const customer = createMockCustomer({ id: "cus_test" });
      const subscription = createMockSubscription({
        id: "sub_test",
        customer: "cus_test",
        status: "active",
        current_period_end: periodEnd,
      });
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse([customer])
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([subscription])
      );
      newStripe.paymentMethods.list.mockResolvedValue(
        createMockListResponse([createMockPaymentMethod()])
      );
      newStripe.subscriptions.create.mockResolvedValue(
        createMockSubscription({ id: "sub_new" })
      );

      await migrateSubscriptions(oldStripe, newStripe, [], [], false);

      expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_end: periodEnd,
        })
      );
    });

    it("should return subscription ID mapping", async () => {
      const customer = createMockCustomer({ id: "cus_test" });
      const subscription = createMockSubscription({
        id: "sub_old",
        customer: "cus_test",
        status: "active",
      });
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse([customer])
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([subscription])
      );
      newStripe.paymentMethods.list.mockResolvedValue(
        createMockListResponse([createMockPaymentMethod()])
      );
      newStripe.subscriptions.create.mockResolvedValue(
        createMockSubscription({ id: "sub_new" })
      );

      const result = await migrateSubscriptions(
        oldStripe,
        newStripe,
        [],
        [],
        false
      );

      expect(result).toEqual({ sub_old: "sub_new" });
    });

    it("should throw error when no payment method found on customer", async () => {
      const customer = createMockCustomer({ id: "cus_test" });
      const subscription = createMockSubscription({
        id: "sub_test",
        customer: "cus_test",
        status: "active",
      });
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse([customer])
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([subscription])
      );
      newStripe.paymentMethods.list.mockResolvedValue(
        createMockListResponse([])
      );

      await expect(
        migrateSubscriptions(oldStripe, newStripe, [], [], false)
      ).rejects.toThrow("Failed to find payment method on customer");
    });

    describe("dry-run mode", () => {
      it("should create mock customers with anonymized emails", async () => {
        const customer = createMockCustomer({
          id: "cus_test",
          email: "real@email.com",
          name: "Test User",
        });
        oldStripe.customers.list.mockResolvedValue(
          createMockListResponse([customer])
        );
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([])
        );
        newStripe.customers.create.mockResolvedValue(
          createMockCustomer({
            id: "cus_mock",
            email: getAnonymisedEmail("real@email.com"),
          })
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], true);

        expect(newStripe.customers.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: getAnonymisedEmail("real@email.com"),
            name: "Test User",
            payment_method: "pm_card_visa",
          })
        );
      });

      it("should limit to 20 random customers in dry-run without customerIds", async () => {
        const customers = Array.from({ length: 30 }, (_, i) =>
          createMockCustomer({ id: `cus_${i}`, email: `user${i}@test.com` })
        );
        oldStripe.customers.list.mockResolvedValue(
          createMockListResponse(customers)
        );
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([])
        );
        newStripe.customers.create.mockResolvedValue(
          createMockCustomer({ id: "cus_mock" })
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], true);

        expect(newStripe.customers.create).toHaveBeenCalledTimes(20);
      });

      it("should not limit customers in dry-run when customerIds provided", async () => {
        const customerIds = Array.from({ length: 25 }, (_, i) => `cus_${i}`);
        const customers = customerIds.map((id) =>
          createMockCustomer({ id, email: `${id}@test.com` })
        );
        oldStripe.customers.list.mockResolvedValue(
          createMockListResponse(customers)
        );
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([])
        );
        newStripe.customers.create.mockResolvedValue(
          createMockCustomer({ id: "cus_mock" })
        );

        await migrateSubscriptions(oldStripe, newStripe, customerIds, [], true);

        expect(newStripe.customers.create).toHaveBeenCalledTimes(25);
      });

      it("should handle customer with null email in dry-run", async () => {
        const customer = createMockCustomer({
          id: "cus_test",
          email: null,
          name: "No Email User",
        });
        oldStripe.customers.list.mockResolvedValue(
          createMockListResponse([customer])
        );
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([])
        );
        newStripe.customers.create.mockResolvedValue(
          createMockCustomer({ id: "cus_mock", email: null })
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], true);

        expect(newStripe.customers.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: undefined,
            name: "No Email User",
          })
        );
      });

      it("should use mock customer payment method for subscription", async () => {
        const customer = createMockCustomer({
          id: "cus_old",
          email: "test@test.com",
        });
        const subscription = createMockSubscription({
          id: "sub_old",
          customer,
          status: "active",
        });
        const mockCustomer = createMockCustomer({
          id: "cus_mock",
          email: getAnonymisedEmail("test@test.com"),
        });
        const mockPaymentMethod = createMockPaymentMethod({ id: "pm_mock" });

        oldStripe.customers.list.mockResolvedValue(
          createMockListResponse([customer])
        );
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );
        newStripe.customers.create.mockResolvedValue(mockCustomer);
        newStripe.paymentMethods.list.mockResolvedValue(
          createMockListResponse([mockPaymentMethod])
        );
        newStripe.subscriptions.create.mockResolvedValue(
          createMockSubscription({ id: "sub_new" })
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], true);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: "cus_mock",
            default_payment_method: "pm_mock",
          })
        );
      });

      it("should disable automatic_tax in dry-run mode", async () => {
        const customer = createMockCustomer({
          id: "cus_old",
          email: "test@test.com",
        });
        const subscription = createMockSubscription({
          id: "sub_old",
          customer,
          status: "active",
          automatic_tax: { enabled: true, liability: null },
        });
        const mockCustomer = createMockCustomer({
          id: "cus_mock",
          email: getAnonymisedEmail("test@test.com"),
        });

        oldStripe.customers.list.mockResolvedValue(
          createMockListResponse([customer])
        );
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );
        newStripe.customers.create.mockResolvedValue(mockCustomer);
        newStripe.paymentMethods.list.mockResolvedValue(
          createMockListResponse([createMockPaymentMethod({ id: "pm_mock" })])
        );
        newStripe.subscriptions.create.mockResolvedValue(
          createMockSubscription({ id: "sub_new" })
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], true);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            automatic_tax: undefined,
          })
        );
      });
    });

    describe("subscription property transformations", () => {
      let customer: ReturnType<typeof createMockCustomer>;
      let baseSubscription: ReturnType<typeof createMockSubscription>;

      beforeEach(() => {
        customer = createMockCustomer({ id: "cus_test" });
        baseSubscription = createMockSubscription({
          id: "sub_test",
          customer: "cus_test",
          status: "active",
        });
        oldStripe.customers.list.mockResolvedValue(
          createMockListResponse([customer])
        );
        newStripe.paymentMethods.list.mockResolvedValue(
          createMockListResponse([createMockPaymentMethod()])
        );
        newStripe.subscriptions.create.mockResolvedValue(
          createMockSubscription({ id: "sub_new" })
        );
      });

      it("should handle customer as object", async () => {
        const subscription = createMockSubscription({
          ...baseSubscription,
          customer: customer as unknown as string,
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: "cus_test",
          })
        );
      });

      it("should transform billing_thresholds", async () => {
        const subscription = createMockSubscription({
          ...baseSubscription,
          billing_thresholds: {
            amount_gte: 5000,
            reset_billing_cycle_anchor: true,
          },
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            billing_thresholds: {
              amount_gte: 5000,
              reset_billing_cycle_anchor: true,
            },
          })
        );
      });

      it("should transform default_tax_rates", async () => {
        const subscription = createMockSubscription({
          ...baseSubscription,
          default_tax_rates: [
            { id: "txr_1" } as unknown as import("stripe").Stripe.TaxRate,
            { id: "txr_2" } as unknown as import("stripe").Stripe.TaxRate,
          ],
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            default_tax_rates: ["txr_1", "txr_2"],
          })
        );
      });

      it("should use promotion_code when no coupon is set", async () => {
        const subscription = createMockSubscription({
          ...baseSubscription,
          discount: {
            id: "di_test",
            object: "discount",
            checkout_session: null,
            coupon: null as unknown as import("stripe").Stripe.Coupon,
            customer: "cus_test",
            end: null,
            invoice: null,
            invoice_item: null,
            promotion_code: "promo_123",
            start: 1_234_567_890,
            subscription: "sub_test",
            subscription_item: null,
          },
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            promotion_code: "promo_123",
            coupon: undefined,
          })
        );
      });

      it("should use coupon instead of promotion_code when coupon is set", async () => {
        const subscription = createMockSubscription({
          ...baseSubscription,
          discount: {
            id: "di_test",
            object: "discount",
            checkout_session: null,
            coupon: {
              id: "coupon_123",
            } as import("stripe").Stripe.Coupon,
            customer: "cus_test",
            end: null,
            invoice: null,
            invoice_item: null,
            promotion_code: "promo_123",
            start: 1_234_567_890,
            subscription: "sub_test",
            subscription_item: null,
          },
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            promotion_code: undefined,
            coupon: "coupon_123",
          })
        );
      });

      it("should clear cancel_at when cancel_at_period_end is true", async () => {
        const futureTimestamp = Math.floor(Date.now() / 1000) + 86_400;
        const subscription = createMockSubscription({
          ...baseSubscription,
          cancel_at: futureTimestamp,
          cancel_at_period_end: true,
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            cancel_at: undefined,
            cancel_at_period_end: true,
          })
        );
      });

      it("should preserve cancel_at when cancel_at_period_end is false", async () => {
        const futureTimestamp = Math.floor(Date.now() / 1000) + 86_400;
        const subscription = createMockSubscription({
          ...baseSubscription,
          cancel_at: futureTimestamp,
          cancel_at_period_end: false,
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            cancel_at: futureTimestamp,
            cancel_at_period_end: false,
          })
        );
      });

      it("should handle on_behalf_of as object", async () => {
        const subscription = createMockSubscription({
          ...baseSubscription,
          on_behalf_of: { id: "acct_123" } as unknown as string,
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            on_behalf_of: "acct_123",
          })
        );
      });

      it("should transform transfer_data with destination as object", async () => {
        const subscription = createMockSubscription({
          ...baseSubscription,
          transfer_data: {
            destination: { id: "acct_dest" } as unknown as string,
            amount_percent: 80,
          },
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            transfer_data: {
              destination: "acct_dest",
              amount_percent: 80,
            },
          })
        );
      });

      it("should handle default_source as object", async () => {
        const subscription = createMockSubscription({
          ...baseSubscription,
          default_source: { id: "src_123" } as unknown as string,
        });
        oldStripe.subscriptions.list.mockResolvedValue(
          createMockListResponse([subscription])
        );

        await migrateSubscriptions(oldStripe, newStripe, [], [], false);

        expect(newStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            default_source: "src_123",
          })
        );
      });
    });

    it("should log subscription mapping when subscriptions are created", async () => {
      const customer = createMockCustomer({ id: "cus_test" });
      const subscription = createMockSubscription({
        id: "sub_old",
        customer: "cus_test",
        status: "active",
      });
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse([customer])
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([subscription])
      );
      newStripe.paymentMethods.list.mockResolvedValue(
        createMockListResponse([createMockPaymentMethod()])
      );
      newStripe.subscriptions.create.mockResolvedValue(
        createMockSubscription({ id: "sub_new" })
      );

      await migrateSubscriptions(oldStripe, newStripe, [], [], false);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Subscription ID mapping")
      );
    });

    it("should return empty mapping when no subscriptions are migrated", async () => {
      const customer = createMockCustomer({ id: "cus_test" });
      oldStripe.customers.list.mockResolvedValue(
        createMockListResponse([customer])
      );
      oldStripe.subscriptions.list.mockResolvedValue(
        createMockListResponse([])
      );

      const result = await migrateSubscriptions(
        oldStripe,
        newStripe,
        [],
        [],
        false
      );

      expect(result).toEqual({});
    });
  });
});
