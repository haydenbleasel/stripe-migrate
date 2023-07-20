import Stripe from 'stripe';

export const migrateCoupons = async (oldStripe: Stripe, newStripe: Stripe) => {
  // TODO: Rework this so it's paginated
  const oldCoupons = await oldStripe.coupons.list({ limit: 100 });

  oldCoupons.data.forEach(async (coupon) => {
    const newcoupon = await newStripe.coupons.create({
      ...coupon,
      amount_off: coupon.amount_off ?? undefined,
      currency: coupon.currency ?? undefined,
      duration_in_months: coupon.duration_in_months ?? undefined,
      max_redemptions: coupon.max_redemptions ?? undefined,
      name: coupon.name ?? undefined,
      percent_off: coupon.percent_off ?? undefined,
      redeem_by: coupon.redeem_by ?? undefined,
    });

    console.log(`Created new coupon ${newcoupon.name} (${newcoupon.id})`);
  });
};
