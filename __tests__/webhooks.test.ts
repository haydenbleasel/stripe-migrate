import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWebhooks, migrateWebhooks } from "../src/lib/webhooks";
import {
  createMockListResponse,
  createMockStripe,
  createMockWebhookEndpoint,
  mockConsole,
} from "./mocks";

describe("webhooks", () => {
  let mockStripe: ReturnType<typeof createMockStripe>;
  let consoleSpy: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    mockStripe = createMockStripe();
    consoleSpy = mockConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchWebhooks", () => {
    it("should fetch all webhooks from a single page", async () => {
      const webhooks = [createMockWebhookEndpoint({ id: "we_1" })];
      mockStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse(webhooks)
      );

      const result = await fetchWebhooks(mockStripe);

      expect(result).toEqual(webhooks);
      expect(mockStripe.webhookEndpoints.list).toHaveBeenCalledTimes(1);
      expect(mockStripe.webhookEndpoints.list).toHaveBeenCalledWith({
        limit: 100,
      });
    });

    it("should paginate through multiple pages", async () => {
      const page1Webhooks = [
        createMockWebhookEndpoint({ id: "we_1" }),
        createMockWebhookEndpoint({ id: "we_2" }),
      ];
      const page2Webhooks = [createMockWebhookEndpoint({ id: "we_3" })];

      mockStripe.webhookEndpoints.list
        .mockResolvedValueOnce(createMockListResponse(page1Webhooks, true))
        .mockResolvedValueOnce(createMockListResponse(page2Webhooks, false));

      const result = await fetchWebhooks(mockStripe);

      expect(result).toHaveLength(3);
      expect(mockStripe.webhookEndpoints.list).toHaveBeenCalledTimes(2);
      expect(mockStripe.webhookEndpoints.list).toHaveBeenNthCalledWith(2, {
        limit: 100,
        starting_after: "we_2",
      });
    });

    it("should handle empty webhook list", async () => {
      mockStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([])
      );

      const result = await fetchWebhooks(mockStripe);

      expect(result).toEqual([]);
    });

    it("should log the number of fetched webhooks", async () => {
      const webhooks = [
        createMockWebhookEndpoint({ id: "we_1" }),
        createMockWebhookEndpoint({ id: "we_2" }),
      ];
      mockStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse(webhooks)
      );

      await fetchWebhooks(mockStripe);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("2 webhook endpoints")
      );
    });
  });

  describe("migrateWebhooks", () => {
    let oldStripe: ReturnType<typeof createMockStripe>;
    let newStripe: ReturnType<typeof createMockStripe>;

    beforeEach(() => {
      oldStripe = createMockStripe();
      newStripe = createMockStripe();
    });

    it("should create webhook when it does not exist", async () => {
      const webhook = createMockWebhookEndpoint({
        id: "we_old",
        url: "https://example.com/webhook",
        enabled_events: ["customer.created"],
      });
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([webhook])
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([])
      );
      newStripe.webhookEndpoints.create.mockResolvedValue(
        createMockWebhookEndpoint({ id: "we_new" })
      );

      await migrateWebhooks(oldStripe, newStripe);

      expect(newStripe.webhookEndpoints.create).toHaveBeenCalledTimes(1);
      expect(newStripe.webhookEndpoints.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://example.com/webhook",
          enabled_events: ["customer.created"],
        })
      );
    });

    it("should skip webhook with same URL and all events", async () => {
      const events = ["customer.created", "customer.updated"];
      const oldWebhook = createMockWebhookEndpoint({
        id: "we_old",
        url: "https://example.com/webhook",
        enabled_events: events,
      });
      const newWebhook = createMockWebhookEndpoint({
        id: "we_existing",
        url: "https://example.com/webhook",
        enabled_events: events,
      });
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([oldWebhook])
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([newWebhook])
      );

      await migrateWebhooks(oldStripe, newStripe);

      expect(newStripe.webhookEndpoints.create).not.toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("already exists")
      );
    });

    it("should create webhook when URL matches but events differ", async () => {
      const oldWebhook = createMockWebhookEndpoint({
        id: "we_old",
        url: "https://example.com/webhook",
        enabled_events: ["customer.created", "invoice.created"],
      });
      const newWebhook = createMockWebhookEndpoint({
        id: "we_existing",
        url: "https://example.com/webhook",
        enabled_events: ["customer.created"], // Missing invoice.created
      });
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([oldWebhook])
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([newWebhook])
      );
      newStripe.webhookEndpoints.create.mockResolvedValue(
        createMockWebhookEndpoint({ id: "we_new" })
      );

      await migrateWebhooks(oldStripe, newStripe);

      expect(newStripe.webhookEndpoints.create).toHaveBeenCalledTimes(1);
    });

    it("should create webhook when URL is different", async () => {
      const oldWebhook = createMockWebhookEndpoint({
        id: "we_old",
        url: "https://example.com/webhook-new",
        enabled_events: ["customer.created"],
      });
      const newWebhook = createMockWebhookEndpoint({
        id: "we_existing",
        url: "https://example.com/webhook-old",
        enabled_events: ["customer.created"],
      });
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([oldWebhook])
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([newWebhook])
      );
      newStripe.webhookEndpoints.create.mockResolvedValue(
        createMockWebhookEndpoint({ id: "we_new" })
      );

      await migrateWebhooks(oldStripe, newStripe);

      expect(newStripe.webhookEndpoints.create).toHaveBeenCalledTimes(1);
    });

    it("should create webhook with all properties", async () => {
      const webhook = createMockWebhookEndpoint({
        id: "we_old",
        url: "https://example.com/webhook",
        enabled_events: ["customer.created", "payment_intent.succeeded"],
        api_version: "2022-11-15",
        description: "Test webhook",
        metadata: { env: "production" },
      });
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([webhook])
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([])
      );
      newStripe.webhookEndpoints.create.mockResolvedValue(webhook);

      await migrateWebhooks(oldStripe, newStripe);

      expect(newStripe.webhookEndpoints.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://example.com/webhook",
          enabled_events: ["customer.created", "payment_intent.succeeded"],
          api_version: "2022-11-15",
          description: "Test webhook",
          metadata: { env: "production" },
        })
      );
    });

    it("should return array of created webhooks", async () => {
      const webhooks = [
        createMockWebhookEndpoint({
          id: "we_1",
          url: "https://example.com/webhook1",
        }),
        createMockWebhookEndpoint({
          id: "we_2",
          url: "https://example.com/webhook2",
        }),
      ];
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse(webhooks)
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([])
      );
      newStripe.webhookEndpoints.create
        .mockResolvedValueOnce(webhooks[0])
        .mockResolvedValueOnce(webhooks[1]);

      const result = await migrateWebhooks(oldStripe, newStripe);

      expect(result).toHaveLength(2);
    });

    it("should handle webhook with null api_version", async () => {
      const webhook = createMockWebhookEndpoint({
        id: "we_old",
        url: "https://example.com/webhook",
        api_version: null,
      });
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([webhook])
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([])
      );
      newStripe.webhookEndpoints.create.mockResolvedValue(webhook);

      await migrateWebhooks(oldStripe, newStripe);

      expect(newStripe.webhookEndpoints.create).toHaveBeenCalledWith(
        expect.objectContaining({
          api_version: undefined,
        })
      );
    });

    it("should skip webhook when new account has superset of events", async () => {
      const oldWebhook = createMockWebhookEndpoint({
        id: "we_old",
        url: "https://example.com/webhook",
        enabled_events: ["customer.created"],
      });
      const newWebhook = createMockWebhookEndpoint({
        id: "we_existing",
        url: "https://example.com/webhook",
        enabled_events: ["customer.created", "customer.updated"],
      });
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([oldWebhook])
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse([newWebhook])
      );

      await migrateWebhooks(oldStripe, newStripe);

      expect(newStripe.webhookEndpoints.create).not.toHaveBeenCalled();
    });

    it("should migrate multiple webhooks correctly", async () => {
      const existingEvents = ["customer.created"];
      const oldWebhooks = [
        createMockWebhookEndpoint({
          id: "we_1",
          url: "https://example.com/webhook1",
          enabled_events: existingEvents,
        }),
        createMockWebhookEndpoint({
          id: "we_2",
          url: "https://example.com/webhook2",
          enabled_events: ["invoice.created"],
        }),
      ];
      const newWebhooks = [
        createMockWebhookEndpoint({
          id: "we_existing",
          url: "https://example.com/webhook1",
          enabled_events: existingEvents,
        }),
      ];
      oldStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse(oldWebhooks)
      );
      newStripe.webhookEndpoints.list.mockResolvedValue(
        createMockListResponse(newWebhooks)
      );
      newStripe.webhookEndpoints.create.mockResolvedValue(
        createMockWebhookEndpoint({ id: "we_new" })
      );

      await migrateWebhooks(oldStripe, newStripe);

      // Only webhook2 should be created as webhook1 already exists
      expect(newStripe.webhookEndpoints.create).toHaveBeenCalledTimes(1);
      expect(newStripe.webhookEndpoints.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://example.com/webhook2",
        })
      );
    });
  });
});
