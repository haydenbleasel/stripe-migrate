# stripe-migrate

# WIP! Don't use this yet... unless you're gonna contribute.

A Node-based CLI tool to migrate content from between Stripe accounts. Implements some of the checklist for [recreating settings in a new Stripe account](https://support.stripe.com/questions/checklist-for-recreating-settings-in-a-new-stripe-account).

## Usage

Before using this CLI, ensure you use the Stripe CLI to copy PAN data across Stripe accounts. This copies Customers, Cards, Sources, Payment Methods and Bank Accounts, preserving the original Customer IDs. You can learn more about that [here](https://support.stripe.com/questions/copy-existing-account-data-to-a-new-stripe-account).

Next up, run this CLI to migrate the rest of your data. It will migrate your Plans, Coupons, Subscriptions and Webhooks with maximum consistency.

```bash
stripe-migrate --from sk_test_123 --to sk_test_456
```

Once your account has been migrated, simply update your API keys and redeploy your app.

## Limitations

- This tool does not migrate anything not mentioned above.
- This is currently a "single-run" tool, though it can be modified to run multiple times by checking for existing data and updating it instead of creating it.

## Notes

I highly recommend testing this with a Test Mode account first as you can delete all test data and start again. Once you're happy with the results, you can run it against your Live Mode account.
