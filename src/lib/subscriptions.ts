import Stripe from 'stripe';

export const migrateSubscriptions = async (
  oldStripe: Stripe,
  newStripe: Stripe
) => {
  const oldSubscriptions = [];

  let startingAfter: Stripe.Subscription['id'] = '';
  let hasMoreSubscriptions: boolean = true;

  while (hasMoreSubscriptions) {
    const response = await oldStripe.subscriptions.list({
      limit: 100,
      starting_after: startingAfter,
    });

    if (response.data.length > 0) {
      oldSubscriptions.push(...response.data);
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMoreSubscriptions = false;
    }
  }

  oldSubscriptions.forEach(async (subscription) => {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    const newSubscription = await newStripe.subscriptions.create({
      ...subscription,
      customer: customerId,
      application_fee_percent:
        subscription.application_fee_percent ?? undefined,
      billing_thresholds: undefined, // TODO
      cancel_at: subscription.cancel_at ?? undefined,
      days_until_due: subscription.days_until_due ?? undefined,
      default_payment_method: undefined, // TODO
      default_source: undefined, // TODO
      default_tax_rates: undefined, // TODO
      description: subscription.description ?? undefined,
      items: undefined, // TODO
      on_behalf_of: undefined, // TODO
      payment_settings: undefined, // TODO
      transfer_data: undefined, // TODO
      trial_end: subscription.trial_end ?? undefined,
      trial_settings: undefined, // TODO
    });

    console.log(
      `Created new subscription ${newSubscription.id} for ${newSubscription.customer}`
    );
  });
};
