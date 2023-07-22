import Stripe from 'stripe';
import { fetchSubscriptions } from './subscriptions';

export const fetchCustomers = async (stripe: Stripe) => {
  const customers = [];

  let startingAfter: Stripe.Customer['id'] = '';
  let haMoreCustomers: boolean = true;

  while (haMoreCustomers) {
    const listParams: Stripe.CustomerListParams = { limit: 100 };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    const response = await stripe.customers.list(listParams);

    if (response.data.length > 0) {
      customers.push(...response.data);
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      haMoreCustomers = false;
    }
  }

  return customers;
};

export const migrateCustomers = async (
  oldStripe: Stripe,
  newStripe: Stripe
) => {
  const oldCustomers = await fetchCustomers(oldStripe);
  const oldSubscriptions = await fetchSubscriptions(oldStripe);

  // Due to rate limiting, we'll only use 20 subscribed customers
  const newCustomers = oldCustomers
    .filter((customer) => {
      const customerSubscription = oldSubscriptions.find(
        (subscription) => subscription.customer === customer.id
      );

      return !!customerSubscription;
    })
    .slice(0, 20);

  const promises = newCustomers.map(async (customer) => {
    const newCustomer = await newStripe.customers.create({
      email: customer.email ?? undefined,
      name: customer.name ?? undefined,
    });

    console.log(
      `Created new customer ${newCustomer.name} - ${newCustomer.email} (${newCustomer.id})`
    );

    return newCustomer;
  });

  return Promise.all(promises);
};
