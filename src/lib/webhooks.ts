import Stripe from 'stripe';

export const migrateWebhooks = async (oldStripe: Stripe, newStripe: Stripe) => {
  const oldWebhooks = [];

  let startingAfter: Stripe.Coupon['id'] = '';
  let hasMoreWebhooks: boolean = true;

  while (hasMoreWebhooks) {
    const response = await oldStripe.webhookEndpoints.list({
      limit: 100,
      starting_after: startingAfter,
    });

    if (response.data.length > 0) {
      oldWebhooks.push(...response.data);
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMoreWebhooks = false;
    }
  }

  oldWebhooks.forEach(async (webhook) => {
    const newWebhook = await newStripe.webhookEndpoints.create({
      ...webhook,
      enabled_events: webhook.enabled_events.map(
        (event) => event
      ) as Stripe.WebhookEndpointCreateParams['enabled_events'],
      api_version:
        webhook.api_version as Stripe.WebhookEndpointCreateParams['api_version'],
      description: webhook.description ?? undefined,
    });

    console.log(`Created new webhook ${newWebhook.id} (${newWebhook.url})`);
  });
};
