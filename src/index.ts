import { program } from 'commander';
import pkg from '../package.json';
import chalk from 'chalk';
import { migratePlans } from './lib/plans';
import { migrateCoupons } from './lib/coupons';
import { migrateSubscriptions } from './lib/subscriptions';
import Stripe from 'stripe';
import { migrateWebhooks } from './lib/webhooks';

program
  .name('stripe-migrate')
  .description(pkg.description)
  .version(pkg.version)
  .option('--from <from>', 'Stripe secret key from the old account', undefined)
  .option('--to <to>', 'Stripe secret key from the new account', undefined)
  .action(async ({ from, to }) => {
    console.log(chalk.green('Validating Stripe keys...'));
    if (!from) {
      console.log(chalk.red('<from> argument is required'));
      return;
    }

    if (!to) {
      console.log(chalk.red('<to> argument is required'));
      return;
    }

    console.log(chalk.green('Creating Stripe instances...'));

    const oldStripe = new Stripe(from, { apiVersion: '2022-11-15' });
    const newStripe = new Stripe(to, { apiVersion: '2022-11-15' });

    try {
      console.log(chalk.green('Migrating plans...'));
      await migratePlans(oldStripe, newStripe);

      console.log(chalk.green('Migrating coupons...'));
      await migrateCoupons(oldStripe, newStripe);

      console.log(chalk.green('Migrating customers...'));
      await migrateSubscriptions(oldStripe, newStripe);

      console.log(chalk.green('Migrating webhooks...'));
      await migrateWebhooks(oldStripe, newStripe);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;

      console.log(chalk.red(message));
    }
  });

program.parse();
