import { program } from 'commander';
import pkg from '../package.json';
import chalk from 'chalk';
import { migratePlans } from './lib/plans';
import { migrateCoupons } from './lib/coupons';
import { migrateSubscriptions } from './lib/subscriptions';
import Stripe from 'stripe';

program
  .name('stripe-migrate')
  .description(pkg.description)
  .version(pkg.version);

program
  .command('x')
  .description('y')
  .argument('<command>', 'command to generate')
  .option('--z <z>', 'z desc', 'default')
  .action(async () => {
    console.log(chalk.green('Creating Stripe instances...'));

    if (!process.env.OLD_STRIPE_SECRET_KEY) {
      throw new Error('OLD_STRIPE_SECRET_KEY is required');
    }

    if (!process.env.NEW_STRIPE_SECRET_KEY) {
      throw new Error('NEW_STRIPE_SECRET_KEY is required');
    }

    const oldStripe = new Stripe(process.env.OLD_STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
    });
    const newStripe = new Stripe(process.env.NEW_STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
    });

    console.log(chalk.green('Migrating plans...'));
    await migratePlans(oldStripe, newStripe);

    console.log(chalk.green('Migrating coupons...'));
    await migrateCoupons(oldStripe, newStripe);

    console.log(chalk.green('Migrating customers...'));
    await migrateSubscriptions(oldStripe, newStripe);
  });

program.parse();
