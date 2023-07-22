import chalk from 'chalk';
import Stripe from 'stripe';

const fetchProducts = async (stripe: Stripe) => {
  const products = [];

  let startingAfter: Stripe.Product['id'] = '';
  let hasMoreProducts: boolean = true;

  while (hasMoreProducts) {
    const listParams: Stripe.ProductListParams = { limit: 100 };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    const response = await stripe.products.list(listParams);

    if (response.data.length > 0) {
      products.push(...response.data);
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMoreProducts = false;
    }
  }

  return products;
};

export const migrateProducts = async (oldStripe: Stripe, newStripe: Stripe) => {
  const oldProducts = await fetchProducts(oldStripe);

  const promises = oldProducts
    // Only migrate active products
    .filter((product) => product.active)
    .map(async (product) => {
      const tax_code =
        typeof product.tax_code === 'string'
          ? product.tax_code
          : product.tax_code?.id;

      try {
        const newProduct = await newStripe.products.create({
          active: product.active,
          attributes: product.attributes ?? undefined,
          caption: product.caption ?? undefined,
          deactivate_on: product.deactivate_on,
          default_price_data: undefined,
          description: product.description ?? undefined,
          expand: undefined,
          id: product.id,
          images: product.images,
          metadata: product.metadata,
          name: product.name,
          package_dimensions: product.package_dimensions ?? undefined,
          shippable: product.shippable ?? undefined,
          statement_descriptor: product.statement_descriptor ?? undefined,
          tax_code,
          type: product.type,
          unit_label: product.unit_label ?? undefined,
          url: product.url ?? undefined,
        });

        console.log(
          `Created new product ${newProduct.name} (${newProduct.id})`
        );

        return newProduct;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('already exists')
        ) {
          console.log(
            chalk.blue(`Product ${product.id} already exists, skipping...`)
          );
          return;
        }

        throw error;
      }
    });

  return Promise.all(promises);
};
