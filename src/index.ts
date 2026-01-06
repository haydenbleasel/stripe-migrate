import { program } from "commander";
import pkg from "../package.json";
import { migrateCoupons } from "./lib/coupons";
import { migratePlans } from "./lib/plans";
import { migrateProducts } from "./lib/products";
import {
  cancelAllSubscriptions,
  migrateSubscriptions,
} from "./lib/subscriptions";
import {
  createSingleStripeInstance,
  createStripeInstances,
  handleError,
} from "./lib/utils";
import { migrateWebhooks } from "./lib/webhooks";

program
  .name("stripe-migrate")
  .description(pkg.description)
  .version(pkg.version);

program
  .command("webhooks")
  .option("--from <from>", "Stripe secret key from the old account", undefined)
  .option("--to <to>", "Stripe secret key from the new account", undefined)
  .action(async ({ from, to }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migrateWebhooks(oldStripe, newStripe);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("products")
  .option("--from <from>", "Stripe secret key from the old account", undefined)
  .option("--to <to>", "Stripe secret key from the new account", undefined)
  .action(async ({ from, to }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migrateProducts(oldStripe, newStripe);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("plans")
  .option("--from <from>", "Stripe secret key from the old account", undefined)
  .option("--to <to>", "Stripe secret key from the new account", undefined)
  .action(async ({ from, to }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migratePlans(oldStripe, newStripe);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("coupons")
  .option("--from <from>", "Stripe secret key from the old account", undefined)
  .option("--to <to>", "Stripe secret key from the new account", undefined)
  .action(async ({ from, to }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migrateCoupons(oldStripe, newStripe);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("subscriptions")
  .option("--from <from>", "Stripe secret key from the old account", undefined)
  .option("--to <to>", "Stripe secret key from the new account", undefined)
  .option(
    "--customerIds <customerIds>",
    "Only migrate customers with these Customer IDs (comma separated)",
    ""
  )
  .option(
    "--omitCustomerIds <customerIds>",
    "Omit customers with these Customer IDs (comma separated)",
    ""
  )
  .option(
    "--dry-run",
    "Mock customers from the old account and simulate on the new",
    false
  )
  .action(async ({ from, to, customerIds, omitCustomerIds, dryRun }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migrateSubscriptions(
        oldStripe,
        newStripe,
        customerIds.split(",").filter(Boolean),
        omitCustomerIds.split(",").filter(Boolean),
        dryRun
      );
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("cancel-subscriptions")
  .description("Cancel all subscriptions in an account")
  .option("--key <key>", "Stripe secret key for the account", undefined)
  .action(async ({ key }) => {
    try {
      const stripe = createSingleStripeInstance(key);
      await cancelAllSubscriptions(stripe);
    } catch (error) {
      handleError(error);
    }
  });

program.parse();
