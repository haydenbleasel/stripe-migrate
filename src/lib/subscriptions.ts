import chalk from 'chalk';
import Stripe from 'stripe';
import crypto from 'node:crypto';

const getAnonymisedEmail = (email: string) => {
  const emailHash = crypto.createHash('md5').update(email).digest('hex');

  return `${emailHash}@example.com`;
};

export const fetchSubscriptions = async (stripe: Stripe) => {
  const subscriptions = [];

  let startingAfter: Stripe.Subscription['id'] = '';
  let hasMoreSubscriptions: boolean = true;

  while (hasMoreSubscriptions) {
    const listParams: Stripe.SubscriptionListParams = {
      limit: 100,
      expand: ['data.customer', 'data.default_payment_method'],
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

export const migrateSubscriptions = async (
  oldStripe: Stripe,
  newStripe: Stripe,
  customerIds: string[],
  dryRun: boolean
) => {
  const oldSubscriptions = await fetchSubscriptions(oldStripe);
  const mockCustomers: Stripe.Customer[] = [];

  if (dryRun) {
    console.log(
      chalk.blue(
        `[Dry run] mocking ${
          customerIds.length ? `${customerIds.length} select` : '20 random'
        } customers...`
      )
    );

    const oldCustomerPromises = customerIds.length
      ? customerIds.map(async (id) => await oldStripe.customers.retrieve(id))
      : oldSubscriptions
          .map(async (sub) =>
            typeof sub.customer === 'string'
              ? await oldStripe.customers.retrieve(sub.customer)
              : sub.customer
          )
          .slice(0, 20);

    const oldCustomers = (await Promise.all(oldCustomerPromises)).filter(
      (customer) => !customer.deleted
    ) as Stripe.Customer[];

    const newCustomers = await Promise.all(
      oldCustomers.map(async (customer) => {
        const newCustomer = await newStripe.customers.create({
          email: customer.email
            ? getAnonymisedEmail(customer.email)
            : undefined,
          name: customer.name ?? undefined,
          payment_method: 'pm_card_visa',
        });

        console.log(
          chalk.blue(
            `[Dry run] mocked customer ${newCustomer.email} (${newCustomer.id})...`
          )
        );

        return newCustomer;
      })
    );

    mockCustomers.push(...newCustomers);
  }

  const promises = oldSubscriptions

    // Only migrate active subscriptions
    .filter((subscription) => subscription.status === 'active')
    .filter((subscription) => !subscription.cancel_at_period_end)
    .filter((subscription) => !subscription.cancel_at)

    .map(async (subscription) => {
      let customerId: Stripe.SubscriptionCreateParams['customer'] =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

      let default_payment_method: Stripe.SubscriptionCreateParams['default_payment_method'] =
        typeof subscription.default_payment_method === 'string'
          ? subscription.default_payment_method
          : subscription.default_payment_method?.id;

      let automatic_tax: Stripe.SubscriptionCreateParams['automatic_tax'] =
        subscription.automatic_tax;

      if (dryRun) {
        const oldCustomer =
          typeof subscription.customer === 'string'
            ? await oldStripe.customers.retrieve(subscription.customer)
            : subscription.customer;

        if (!oldCustomer || oldCustomer.deleted) {
          return;
        }

        const mockCustomer = mockCustomers.find(({ email }) =>
          oldCustomer.email
            ? email === getAnonymisedEmail(oldCustomer.email)
            : null
        );

        if (!mockCustomer) {
          return;
        }

        console.log(
          chalk.blue(
            `[Dry run] found mock customer ${mockCustomer.email} (${mockCustomer.id})...`
          )
        );

        const paymentMethod = await newStripe.paymentMethods.list({
          customer: mockCustomer.id,
          type: 'card',
        });

        if (!paymentMethod.data[0]) {
          throw new Error('Failed to find payment method on mock customer');
        }

        customerId = mockCustomer.id;
        default_payment_method = paymentMethod.data[0].id;
        automatic_tax = undefined;
      } else if (customerIds.length && !customerIds.includes(customerId)) {
        return;
      }

      const billing_thresholds: Stripe.SubscriptionCreateParams['billing_thresholds'] =
        subscription.billing_thresholds
          ? {
              amount_gte:
                subscription.billing_thresholds.amount_gte ?? undefined,
              reset_billing_cycle_anchor:
                subscription.billing_thresholds.reset_billing_cycle_anchor ??
                undefined,
            }
          : undefined;

      const default_source: Stripe.SubscriptionCreateParams['default_source'] =
        typeof subscription.default_source === 'string'
          ? subscription.default_source
          : subscription.default_source?.id;

      const application_fee_percent: Stripe.SubscriptionCreateParams['application_fee_percent'] =
        subscription.application_fee_percent ?? undefined;

      const default_tax_rates: Stripe.SubscriptionCreateParams['default_tax_rates'] =
        subscription.default_tax_rates
          ? subscription.default_tax_rates.map((rate) => rate.id)
          : undefined;

      const items: Stripe.SubscriptionCreateParams['items'] = subscription.items
        ? subscription.items.data.map((item) => ({
            billing_thresholds: item.billing_thresholds?.usage_gte
              ? {
                  usage_gte: item.billing_thresholds.usage_gte ?? undefined,
                }
              : undefined,
            metadata: item.metadata,
            // plan: item.plan.id,
            price: item.price?.id,
            price_data: undefined,
            quantity: item.quantity,
            tax_rates: item.tax_rates
              ? item.tax_rates.map((rate) => rate.id)
              : undefined,
          }))
        : undefined;

      const on_behalf_of: Stripe.SubscriptionCreateParams['on_behalf_of'] =
        typeof subscription.on_behalf_of === 'string'
          ? subscription.on_behalf_of
          : subscription.on_behalf_of?.id;

      const payment_settings: Stripe.SubscriptionCreateParams['payment_settings'] =
        subscription.payment_settings
          ? {
              payment_method_options: subscription.payment_settings
                .payment_method_options
                ? {
                    acss_debit: subscription.payment_settings
                      .payment_method_options.acss_debit
                      ? {
                          mandate_options: subscription.payment_settings
                            .payment_method_options.acss_debit.mandate_options
                            ? {
                                transaction_type:
                                  subscription.payment_settings
                                    .payment_method_options.acss_debit
                                    .mandate_options.transaction_type ??
                                  undefined,
                              }
                            : undefined,
                          verification_method:
                            subscription.payment_settings.payment_method_options
                              .acss_debit.verification_method ?? undefined,
                        }
                      : undefined,
                    bancontact:
                      subscription.payment_settings.payment_method_options
                        .bancontact ?? undefined,
                    card: subscription.payment_settings.payment_method_options
                      .card
                      ? {
                          mandate_options: subscription.payment_settings
                            .payment_method_options.card.mandate_options
                            ? {
                                amount:
                                  subscription.payment_settings
                                    .payment_method_options.card.mandate_options
                                    .amount ?? undefined,
                                amount_type:
                                  subscription.payment_settings
                                    .payment_method_options.card.mandate_options
                                    .amount_type ?? undefined,
                                description:
                                  subscription.payment_settings
                                    .payment_method_options.card.mandate_options
                                    .description ?? undefined,
                              }
                            : undefined,
                          network:
                            subscription.payment_settings.payment_method_options
                              .card.network ?? undefined,
                          request_three_d_secure:
                            subscription.payment_settings.payment_method_options
                              .card.request_three_d_secure ?? undefined,
                        }
                      : undefined,
                    customer_balance: subscription.payment_settings
                      .payment_method_options.customer_balance
                      ? {
                          bank_transfer: subscription.payment_settings
                            .payment_method_options.customer_balance
                            .bank_transfer
                            ? {
                                eu_bank_transfer:
                                  subscription.payment_settings
                                    .payment_method_options.customer_balance
                                    .bank_transfer.eu_bank_transfer ??
                                  undefined,
                                type:
                                  subscription.payment_settings
                                    .payment_method_options.customer_balance
                                    .bank_transfer.type ?? undefined,
                              }
                            : undefined,
                          funding_type:
                            subscription.payment_settings.payment_method_options
                              .customer_balance.funding_type ?? undefined,
                        }
                      : undefined,
                    konbini:
                      subscription.payment_settings.payment_method_options
                        .konbini ?? undefined,
                    us_bank_account:
                      subscription.payment_settings.payment_method_options
                        .us_bank_account ?? undefined,
                  }
                : undefined,
              payment_method_types:
                subscription.payment_settings.payment_method_types,
              save_default_payment_method:
                subscription.payment_settings.save_default_payment_method ??
                undefined,
            }
          : undefined;

      const transfer_data: Stripe.SubscriptionCreateParams['transfer_data'] =
        subscription.transfer_data
          ? {
              destination:
                typeof subscription.transfer_data.destination === 'string'
                  ? subscription.transfer_data.destination
                  : subscription.transfer_data.destination?.id,
              amount_percent:
                subscription.transfer_data.amount_percent ?? undefined,
            }
          : undefined;

      // Setting the trial_end to the current period end is important
      // for maintaining the same billing period:
      // https://support.stripe.com/questions/recreate-subscriptions-and-plans-after-moving-customer-data-to-a-new-stripe-account
      const trial_end: Stripe.SubscriptionCreateParams['trial_end'] =
        subscription.current_period_end;

      let promotion_code: Stripe.SubscriptionCreateParams['promotion_code'] =
        typeof subscription.discount?.promotion_code === 'string'
          ? subscription.discount?.promotion_code
          : subscription.discount?.promotion_code?.id;

      if (subscription.discount?.coupon) {
        promotion_code = undefined;
      }

      const pending_invoice_item_interval: Stripe.SubscriptionCreateParams['pending_invoice_item_interval'] =
        subscription.pending_invoice_item_interval;

      const newSubscription = await newStripe.subscriptions.create({
        add_invoice_items: undefined,
        application_fee_percent,
        automatic_tax,
        backdate_start_date: undefined,
        billing_cycle_anchor: undefined,
        billing_thresholds,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: subscription.cancel_at ?? undefined,
        collection_method: subscription.collection_method,
        coupon: subscription.discount?.coupon.id ?? undefined,
        currency: subscription.currency,
        customer: customerId,
        days_until_due: subscription.days_until_due ?? undefined,
        default_payment_method,
        default_source,
        default_tax_rates,
        description: subscription.description ?? undefined,
        expand: undefined,
        items,
        metadata: subscription.metadata,
        off_session: undefined,
        on_behalf_of,
        payment_behavior: undefined,
        payment_settings,
        pending_invoice_item_interval,
        promotion_code,
        proration_behavior: undefined,
        transfer_data,
        trial_end,
        trial_from_plan: undefined,
        trial_period_days: undefined,
        trial_settings: subscription.trial_settings ?? undefined,
      });

      console.log(
        `Created new subscription ${newSubscription.id} for ${newSubscription.customer}`
      );
    });

  return Promise.all(promises);
};
