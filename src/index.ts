import { program } from 'commander';
import pkg from '../package.json';
import chalk from 'chalk';
import { migratePlans } from './lib/plans';
import { migrateCoupons } from './lib/coupons';
import { migrateSubscriptions } from './lib/subscriptions';
import Stripe from 'stripe';
import { migrateWebhooks } from './lib/webhooks';
import { migrateProducts } from './lib/products';

const createStripeInstances = (
  from?: string,
  to?: string
): {
  oldStripe: Stripe;
  newStripe: Stripe;
} => {
  if (!from) {
    throw new Error('<from> argument is required');
  }

  if (!to) {
    throw new Error('<to> argument is required');
  }

  const oldStripe = new Stripe(from, { apiVersion: '2022-11-15' });
  const newStripe = new Stripe(to, { apiVersion: '2022-11-15' });

  return { oldStripe, newStripe };
};

const handleError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : `${error}`;

  console.log(chalk.red(message));
};

program
  .name('stripe-migrate')
  .description(pkg.description)
  .version(pkg.version);

program
  .command('webhooks')
  .option('--from <from>', 'Stripe secret key from the old account', undefined)
  .option('--to <to>', 'Stripe secret key from the new account', undefined)
  .action(async ({ from, to }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migrateWebhooks(oldStripe, newStripe);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('products')
  .option('--from <from>', 'Stripe secret key from the old account', undefined)
  .option('--to <to>', 'Stripe secret key from the new account', undefined)
  .action(async ({ from, to }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migrateProducts(oldStripe, newStripe);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('plans')
  .option('--from <from>', 'Stripe secret key from the old account', undefined)
  .option('--to <to>', 'Stripe secret key from the new account', undefined)
  .action(async ({ from, to }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migratePlans(oldStripe, newStripe);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('coupons')
  .option('--from <from>', 'Stripe secret key from the old account', undefined)
  .option('--to <to>', 'Stripe secret key from the new account', undefined)
  .action(async ({ from, to }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migrateCoupons(oldStripe, newStripe);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('subscriptions')
  .option('--from <from>', 'Stripe secret key from the old account', undefined)
  .option('--to <to>', 'Stripe secret key from the new account', undefined)
  .option(
    '--customerIds <customerIds>',
    'Only migrate customers with these Customer IDs (comma separated)',
    ''
  )
  .option(
    '--dry-run',
    'Mock customers from the old account and simulate on the new',
    false
  )
  .action(async ({ from, to, customerIds, dryRun }) => {
    try {
      const { oldStripe, newStripe } = createStripeInstances(from, to);
      await migrateSubscriptions(
        oldStripe,
        newStripe,
        customerIds.split(','),
        dryRun
      );
    } catch (error) {
      handleError(error);
    }
  });

program.parse();
