import Stripe from 'stripe';

export const migratePlans = async (oldStripe: Stripe, newStripe: Stripe) => {
  const oldPlans = [];

  let startingAfter: Stripe.Plan['id'] = '';
  let hasMorePlans: boolean = true;

  while (hasMorePlans) {
    const response = await oldStripe.plans.list({
      limit: 100,
      starting_after: startingAfter,
    });

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

    const newPlan = await newStripe.plans.create({
      ...plan,
      aggregate_usage: plan.aggregate_usage ?? undefined,
      amount: plan.amount ?? undefined,
      amount_decimal: plan.amount_decimal ?? undefined,
      nickname: plan.nickname ?? undefined,
      product: productId,
      tiers: plan.tiers
        ? plan.tiers.map((oldTier) => ({
            up_to: oldTier.up_to ?? 'inf',
            flat_amount: oldTier.flat_amount ?? undefined,
            flat_amount_decimal: oldTier.flat_amount_decimal ?? undefined,
            unit_amount: oldTier.unit_amount ?? undefined,
            unit_amount_decimal: oldTier.unit_amount_decimal ?? undefined,
          }))
        : undefined,
      tiers_mode: plan.tiers_mode ?? undefined,
      transform_usage: plan.transform_usage ?? undefined,
      trial_period_days: plan.trial_period_days ?? undefined,
    });

    console.log(`Created new plan ${newPlan.nickname} (${newPlan.id})`);
  });
};
