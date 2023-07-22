import Stripe from 'stripe';

export const migrateWebhooks = async (oldStripe: Stripe, newStripe: Stripe) => {
  const oldWebhooks = [];

  let startingAfter: Stripe.Coupon['id'] = '';
  let hasMoreWebhooks: boolean = true;

  while (hasMoreWebhooks) {
    const listParams: Stripe.WebhookEndpointListParams = { limit: 100 };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    const response = await oldStripe.webhookEndpoints.list(listParams);

    if (response.data.length > 0) {
      oldWebhooks.push(...response.data);
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMoreWebhooks = false;
    }
  }

  const promises = oldWebhooks.map(async (webhook) => {
    const newWebhook = await newStripe.webhookEndpoints.create({
      url: webhook.url,
      connect: undefined,
      expand: undefined,
      metadata: webhook.metadata,
      enabled_events: webhook.enabled_events.map(
        (event) => event
      ) as Stripe.WebhookEndpointCreateParams['enabled_events'],
      api_version: webhook.api_version
        ? (webhook.api_version as Stripe.WebhookEndpointCreateParams['api_version'])
        : undefined,
      description: webhook.description ?? undefined,
    });

    console.log(`Created new webhook ${newWebhook.id} (${newWebhook.url})`);

    return newWebhook;
  });

  return Promise.all(promises);
};
