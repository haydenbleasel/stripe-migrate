# stripe-migrate

A Node-based CLI tool to migrate content from between Stripe accounts.

1. Copy PAN data across Stripe accounts in UI.
   1. This copies Customers, Cards, Sources, Payment Methods, Bank Accounts.
   2. Source: https://support.stripe.com/questions/copy-existing-account-data-to-a-new-stripe-account
   3. Customer ids are the same
2. stripe-migrate
   1. Recreate plans: specify the same ids
   2. Recreate coupons: specify the same ids
   3. recreate subscriptions
      1. force the billing period of subscriptions on the new account by setting a custom trial end date when you create them.
3. Generate new Stripe API keys
   1. https://support.stripe.com/questions/checklist-for-recreating-settings-in-a-new-stripe-account
4. Add to Vercel
5. Redeploy
6. Export Invoices CSV (can build legacy UI viewer if needed)
