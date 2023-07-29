# stripe-migrate

A Node-based CLI tool to migrate content from between Stripe accounts. Implements some of the checklist for [recreating settings in a new Stripe account](https://support.stripe.com/questions/checklist-for-recreating-settings-in-a-new-stripe-account).

## Installation

```bash
npm install -g @beskar-labs/stripe-migrate
```

## Usage

Before using this CLI, ensure you use the Stripe CLI to copy PAN data across Stripe accounts. This copies Customers, Cards, Sources, Payment Methods and Bank Accounts, preserving the original Customer IDs. You can learn more about that [here](https://support.stripe.com/questions/copy-existing-account-data-to-a-new-stripe-account).

Next up, run this CLI to migrate the rest of your data. It will migrate your Products, Plans, Coupons, Subscriptions and Webhooks with maximum consistency.

```bash
stripe-migrate webhooks --from sk_test_123 --to sk_test_456
stripe-migrate products --from sk_test_123 --to sk_test_456
stripe-migrate plans --from sk_test_123 --to sk_test_456
stripe-migrate coupons --from sk_test_123 --to sk_test_456
stripe-migrate subscriptions --from sk_test_123 --to sk_test_456
```

You can also do a dry run of subscriptions, which anonymises and mocks 10 subscribed customers from your old account for testing. This is useful if you're running on a Test Mode account as your destination.

```bash
stripe-migrate subscriptions --from sk_test_123 --to sk_test_456 --dry-run
```

Additionally, you can pass in a list of customer IDs to migrate subscriptions for. This works with `--dry-run` too.

```bash
stripe-migrate subscriptions --from sk_test_123 --to sk_test_456 --customers cus_123,cus_456
```

Once your account has been migrated, simply update your API keys and redeploy your app.

Webhook, Product, Plan and Coupon migrations check for existing matching data and skips it if required. This means you can run it multiple times to ensure everything is migrated.

## Notes

I highly recommend testing this with a Test Mode account first as you can delete all test data and start again. Once you're happy with the results, you can run it against your Live Mode account. Also, this tool does not migrate anything not mentioned above. I take no responsibility for any data loss or corruption.

## Known Issues

- Stripe rate limits API requests to 100 per second. This tool does not currently handle this, so you may need to run it multiple times to migrate all your data.
- Can't migrate overdue subscriptions. This is because the Stripe API doesn't allow you to create a subscription with a past due date. You'll need to manually deal with these.
- Nothing to do with this repo, but I noticed Stripe's PAN copy tool doesn't capture Link payment methods.
- When migrating products, prices have an unset tax behaviour. Needs fixing.

## Other

To cancel all the subscriptions in your old account, run this:

```ts
import Stripe from 'stripe';

const stripe = new Stripe('[your secret key]', {
  apiVersion: '2022-11-15',
  telemetry: false,
});

export const fetchSubscriptions = async (stripe: Stripe) => {
  const subscriptions = [];

  let startingAfter: Stripe.Subscription['id'] = '';
  let hasMoreSubscriptions: boolean = true;

  while (hasMoreSubscriptions) {
    const listParams: Stripe.SubscriptionListParams = {
      limit: 100,
    };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    const response = await stripe.subscriptions.list(listParams);

    if (response.data.length > 0) {
      subscriptions.push(...response.data);
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMoreSubscriptions = false;
    }
  }

  return subscriptions;
};

const main = async () => {
  const subscriptions = await fetchSubscriptions(stripe);

  const promises = subscriptions.map(async (subscription) => {
    await stripe.subscriptions.del(subscription.id);
  });

  await Promise.all(promises);

  console.log('done');
};

main();
```
