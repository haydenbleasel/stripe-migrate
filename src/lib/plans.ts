import Stripe from 'stripe';

export const migratePlans = async (oldStripe: Stripe, newStripe: Stripe) => {
  const oldPlans = [];

  let startingAfter: Stripe.Plan['id'] = '';
  let hasMorePlans: boolean = true;

  while (hasMorePlans) {
    const listParams: Stripe.PlanListParams = { limit: 100 };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    const response = await oldStripe.plans.list(listParams);

    if (response.data.length > 0) {
      oldPlans.push(...response.data);
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMorePlans = false;
    }
  }

  oldPlans.forEach(async (plan) => {
    const productId =
      typeof plan.product === 'string' ? plan.product : plan.product?.id;

    const tiers: Stripe.PlanCreateParams.Tier[] | undefined = plan.tiers
      ? plan.tiers.map((oldTier) => ({
          up_to: oldTier.up_to ?? 'inf',
          flat_amount: oldTier.flat_amount ?? undefined,
          flat_amount_decimal: oldTier.flat_amount_decimal ?? undefined,
          unit_amount: oldTier.unit_amount ?? undefined,
          unit_amount_decimal: oldTier.unit_amount_decimal ?? undefined,
        }))
      : undefined;

    const newPlan = await newStripe.plans.create({
      active: plan.active,
      aggregate_usage: plan.aggregate_usage ?? undefined,
      amount_decimal: undefined, // Only one of `amount` or `amount_decimal` can be set
      amount: plan.amount ?? undefined,
      billing_scheme: plan.billing_scheme,
      currency: plan.currency,
      expand: undefined,
      id: plan.id,
      interval_count: plan.interval_count,
      interval: plan.interval,
      metadata: plan.metadata,
      nickname: plan.nickname ?? undefined,
      product: productId,
      tiers_mode: plan.tiers_mode ?? undefined,
      tiers,
      transform_usage: plan.transform_usage ?? undefined,
      trial_period_days: plan.trial_period_days ?? undefined,
      usage_type: plan.usage_type,
    });

    console.log(`Created new plan ${newPlan.nickname} (${newPlan.id})`);
  });
};
