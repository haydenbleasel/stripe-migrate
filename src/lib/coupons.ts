import chalk from "chalk";
import type Stripe from "stripe";

export const fetchCoupons = async (stripe: Stripe) => {
  const coupons: Stripe.Coupon[] = [];

  let startingAfter: Stripe.Coupon["id"] = "";
  let hasMoreCoupons = true;

  while (hasMoreCoupons) {
    const listParams: Stripe.CouponListParams = { limit: 100 };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    const response = await stripe.coupons.list(listParams);

    coupons.push(...response.data);

    if (response.has_more && response.data.length > 0) {
      startingAfter = response.data.at(-1)?.id ?? "";
    } else {
      hasMoreCoupons = false;
    }
  }

  console.log(
    chalk.bgGrey(`Successfully fetched ${coupons.length} coupons...`)
  );

  return coupons;
};

export const migrateCoupons = async (oldStripe: Stripe, newStripe: Stripe) => {
  const oldCoupons = await fetchCoupons(oldStripe);

  const promises = oldCoupons

    // Only migrate non-expired coupons
    .filter(
      (coupon) =>
        coupon.redeem_by === null ||
        coupon.redeem_by > Math.floor(Date.now() / 1000)
    )
    .map(async (coupon) => {
      try {
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
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("already exists")
        ) {
          console.log(
            chalk.blue(`Coupon ${coupon.id} already exists, skipping...`)
          );
          return;
        }

        throw error;
      }
    });

  return Promise.all(promises);
};
