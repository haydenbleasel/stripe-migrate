import type Stripe from "stripe";
import { vi } from "vitest";

// Mock product factory
export const createMockProduct = (
  overrides: Partial<Stripe.Product> = {}
): Stripe.Product => ({
  id: "prod_test123",
  object: "product",
  active: true,
  attributes: null,
  caption: null,
  created: 1_234_567_890,
  deactivate_on: [],
  default_price: null,
  deleted: undefined,
  description: "Test product description",
  images: [],
  livemode: false,
  metadata: {},
  name: "Test Product",
  package_dimensions: null,
  shippable: null,
  statement_descriptor: null,
  tax_code: null,
  type: "service",
  unit_label: null,
  updated: 1_234_567_890,
  url: null,
  ...overrides,
});

// Mock plan factory
export const createMockPlan = (
  overrides: Partial<Stripe.Plan> = {}
): Stripe.Plan => ({
  id: "plan_test123",
  object: "plan",
  active: true,
  aggregate_usage: null,
  amount: 1000,
  amount_decimal: "1000",
  billing_scheme: "per_unit",
  created: 1_234_567_890,
  currency: "usd",
  deleted: undefined,
  interval: "month",
  interval_count: 1,
  livemode: false,
  metadata: {},
  meter: null,
  nickname: null,
  product: "prod_test123",
  tiers: null,
  tiers_mode: null,
  transform_usage: null,
  trial_period_days: null,
  usage_type: "licensed",
  ...overrides,
});

// Mock coupon factory
export const createMockCoupon = (
  overrides: Partial<Stripe.Coupon> = {}
): Stripe.Coupon => ({
  id: "coupon_test123",
  object: "coupon",
  amount_off: null,
  applies_to: undefined,
  created: 1_234_567_890,
  currency: null,
  currency_options: undefined,
  deleted: undefined,
  duration: "once",
  duration_in_months: null,
  livemode: false,
  max_redemptions: null,
  metadata: {},
  name: "Test Coupon",
  percent_off: 10,
  redeem_by: null,
  times_redeemed: 0,
  valid: true,
  ...overrides,
});

// Mock customer factory
export const createMockCustomer = (
  overrides: Partial<Stripe.Customer> = {}
): Stripe.Customer =>
  ({
    id: "cus_test123",
    object: "customer",
    address: null,
    balance: 0,
    created: 1_234_567_890,
    currency: null,
    default_source: null,
    delinquent: false,
    description: null,
    discount: null,
    email: "test@example.com",
    invoice_prefix: "ABC123",
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    livemode: false,
    metadata: {},
    name: "Test Customer",
    next_invoice_sequence: 1,
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: "none",
    test_clock: null,
    deleted: undefined,
    ...overrides,
  }) as Stripe.Customer;

// Mock subscription factory
export const createMockSubscription = (
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription =>
  ({
    id: "sub_test123",
    object: "subscription",
    application: null,
    application_fee_percent: null,
    automatic_tax: { enabled: false, liability: null },
    billing_cycle_anchor: 1_234_567_890,
    billing_cycle_anchor_config: null,
    billing_thresholds: null,
    cancel_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    cancellation_details: null,
    collection_method: "charge_automatically",
    created: 1_234_567_890,
    currency: "usd",
    current_period_end: 1_234_567_890 + 30 * 24 * 60 * 60,
    current_period_start: 1_234_567_890,
    customer: "cus_test123",
    days_until_due: null,
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    discounts: [],
    ended_at: null,
    invoice_settings: { account_tax_ids: null, issuer: { type: "self" } },
    items: {
      object: "list",
      data: [
        {
          id: "si_test123",
          object: "subscription_item",
          billing_thresholds: null,
          created: 1_234_567_890,
          discounts: [],
          metadata: {},
          plan: createMockPlan(),
          price: {
            id: "price_test123",
            object: "price",
            active: true,
            billing_scheme: "per_unit",
            created: 1_234_567_890,
            currency: "usd",
            custom_unit_amount: null,
            livemode: false,
            lookup_key: null,
            metadata: {},
            nickname: null,
            product: "prod_test123",
            recurring: {
              aggregate_usage: null,
              interval: "month",
              interval_count: 1,
              meter: null,
              trial_period_days: null,
              usage_type: "licensed",
            },
            tax_behavior: null,
            tiers_mode: null,
            transform_quantity: null,
            type: "recurring",
            unit_amount: 1000,
            unit_amount_decimal: "1000",
          },
          quantity: 1,
          subscription: "sub_test123",
          tax_rates: [],
        },
      ],
      has_more: false,
      url: "/v1/subscription_items?subscription=sub_test123",
    },
    latest_invoice: null,
    livemode: false,
    metadata: {},
    next_pending_invoice_item_invoice: null,
    on_behalf_of: null,
    pause_collection: null,
    payment_settings: {
      payment_method_options: null,
      payment_method_types: null,
      save_default_payment_method: null,
    },
    pending_invoice_item_interval: null,
    pending_setup_intent: null,
    pending_update: null,
    schedule: null,
    start_date: 1_234_567_890,
    status: "active",
    test_clock: null,
    transfer_data: null,
    trial_end: null,
    trial_settings: null,
    trial_start: null,
    ...overrides,
  }) as Stripe.Subscription;

// Mock webhook endpoint factory
export const createMockWebhookEndpoint = (
  overrides: Partial<Stripe.WebhookEndpoint> = {}
): Stripe.WebhookEndpoint => ({
  id: "we_test123",
  object: "webhook_endpoint",
  api_version: "2022-11-15",
  application: null,
  created: 1_234_567_890,
  deleted: undefined,
  description: null,
  enabled_events: ["customer.created", "customer.updated"],
  livemode: false,
  metadata: {},
  secret: "whsec_test123",
  status: "enabled",
  url: "https://example.com/webhook",
  ...overrides,
});

// Mock payment method factory
export const createMockPaymentMethod = (
  overrides: Partial<Stripe.PaymentMethod> = {}
): Stripe.PaymentMethod =>
  ({
    id: "pm_test123",
    object: "payment_method",
    billing_details: {
      address: {
        city: null,
        country: null,
        line1: null,
        line2: null,
        postal_code: null,
        state: null,
      },
      email: null,
      name: null,
      phone: null,
    },
    card: {
      brand: "visa",
      checks: null,
      country: "US",
      display_brand: "visa",
      exp_month: 12,
      exp_year: 2030,
      fingerprint: "abc123",
      funding: "credit",
      generated_from: null,
      last4: "4242",
      networks: null,
      three_d_secure_usage: null,
      wallet: null,
    },
    created: 1_234_567_890,
    customer: null,
    livemode: false,
    metadata: {},
    type: "card",
    ...overrides,
  }) as Stripe.PaymentMethod;

// Create a mock Stripe list response
export const createMockListResponse = <T>(
  data: T[],
  hasMore = false
): Stripe.ApiList<T> => ({
  object: "list",
  data,
  has_more: hasMore,
  url: "/v1/test",
});

// Create a mock Stripe instance
export const createMockStripe = () => {
  const mockStripe = {
    products: {
      list: vi.fn(),
      create: vi.fn(),
    },
    plans: {
      list: vi.fn(),
      create: vi.fn(),
    },
    coupons: {
      list: vi.fn(),
      create: vi.fn(),
    },
    customers: {
      list: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    subscriptions: {
      list: vi.fn(),
      create: vi.fn(),
    },
    webhookEndpoints: {
      list: vi.fn(),
      create: vi.fn(),
    },
    paymentMethods: {
      list: vi.fn(),
    },
  };

  return mockStripe as unknown as Stripe & typeof mockStripe;
};

// Console mock helpers
export const mockConsole = () => {
  const consoleSpy = {
    log: vi.spyOn(console, "log").mockImplementation(() => {
      // Intentionally empty to suppress console output during tests
    }),
  };
  return consoleSpy;
};
