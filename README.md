# stripe-migrate

# WIP! Don't use this yet... unless you're gonna contribute.

A Node-based CLI tool to migrate content from between Stripe accounts.

## Usage

Before using this CLI, ensure you use the Stripe CLI to copy PAN data across Stripe accounts. This copies Customers, Cards, Sources, Payment Methods and Bank Accounts, preserving the original Customer IDs. You can learn more about that [here](https://support.stripe.com/questions/copy-existing-account-data-to-a-new-stripe-account).

Next up, run this CLI to migrate the rest of your data. It will migrate your Plans, Coupons, Subscriptions and Webhooks with maximum consistency.

```bash
# TBD, but something like this:
stripe-migrate --from sk_test_123 --to sk_test_456
```

Once your account has been migrated, simply update your API keys and redeploy your app.

## TODO

- force the billing period of subscriptions on the new account by setting a custom trial end date when you create them.

## Limitations

- This tool does not migrate anything not mentioned above.
