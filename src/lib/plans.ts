import Stripe from 'stripe';

export const migratePlans = async (oldStripe: Stripe, newStripe: Stripe) => {
  // TODO: Rework this so it's paginated
  const oldPlans = await oldStripe.plans.list({ limit: 100 });

  oldPlans.data.forEach(async (plan) => {
    const productId =
      typeof plan.product === 'string' ? plan.product : plan.product?.id;

    const newPlan = await newStripe.plans.create({
      ...plan,
      aggregate_usage: plan.aggregate_usage ?? undefined,
      amount: plan.amount ?? undefined,
      amount_decimal: plan.amount_decimal ?? undefined,
      nickname: plan.nickname ?? undefined,
      product: productId,
      tiers: [], // TODO
      tiers_mode: undefined, // TODO
      transform_usage: plan.transform_usage ?? undefined,
      trial_period_days: plan.trial_period_days ?? undefined,
    });

    console.log(`Created new plan ${newPlan.nickname} (${newPlan.id})`);
  });
};
