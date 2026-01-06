import chalk from 'chalk';
import Stripe from 'stripe';

export const createStripeInstances = (
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

  const oldStripe = new Stripe(from, {
    apiVersion: '2022-11-15',
    telemetry: false,
  });
  const newStripe = new Stripe(to, {
    apiVersion: '2022-11-15',
    telemetry: false,
  });

  return { oldStripe, newStripe };
};

export const handleError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : `${error}`;

  console.log(chalk.red(message));
};
