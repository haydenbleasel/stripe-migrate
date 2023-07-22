import Stripe from 'stripe';

export const migrateCoupons = async (oldStripe: Stripe, newStripe: Stripe) => {
  const oldCoupons = [];

  let startingAfter: Stripe.Coupon['id'] = '';
  let hasMoreCoupons: boolean = true;

  while (hasMoreCoupons) {
    const listParams: Stripe.CouponListParams = { limit: 100 };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    const response = await oldStripe.coupons.list(listParams);

    if (response.data.length > 0) {
      oldCoupons.push(...response.data);
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMoreCoupons = false;
    }
  }

  const promises = oldCoupons.map(async (coupon) => {
    const newCoupon = await newStripe.coupons.create({
      amount_off: coupon.amount_off ?? undefined,
      applies_to: coupon.applies_to,
      currency_options: coupon.currency_options,
      currency: coupon.currency ?? undefined,
      duration_in_months: coupon.duration_in_months ?? undefined,
      duration: coupon.duration,
      expand: undefined,
      id: coupon.id,
      max_redemptions: coupon.max_redemptions ?? undefined,
      metadata: coupon.metadata,
      name: coupon.name ?? undefined,
      percent_off: coupon.percent_off ?? undefined,
      redeem_by: coupon.redeem_by ?? undefined,
    });

    console.log(`Created new coupon ${newCoupon.name} (${newCoupon.id})`);

    return newCoupon;
  });

  return Promise.all(promises);
};
