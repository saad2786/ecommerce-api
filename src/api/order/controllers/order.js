'use strict'
// @ts-ignore
const stripe = require('stripe')(
  'pk_test_51OP986SAlpsqJH6IjCiZstA0cgFkk93IEh8oxLC8alPAkPJ0t6fYTh3TMwXBigfOyiTIcTTdX1ZW1p6ZQH5J8lhk00XpxIZtNf',
)

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories

// @ts-ignore
module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx) {
    // @ts-ignore
    const { product } = ctx.request.body // @ts-ignore // Assuming products is a property of the request body

    const lineItem = await Promise.all(
      product.map(async (products) => {
        const item = await strapi
          // @ts-ignore
          .service('api::product.product')
          .findOne(products.id)

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.title,
            },
            unit_amount: item.price * 100,
          },
          quantity: item.quantity,
        }
      }),
    )
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${process.env.VITE_CLIENT_URL}?success=true`,
        cancel_url: `${process.env.VITE_CLIENT_URL}?success=false`,
        line_items: lineItem,
        shipping_address_collection: { allowed_countries: ['US', 'CA'] },
        payment_method_types: ['card'],
      })
      // @ts-ignore
      await strapi.service('api::order:order').create({
        data: {
          product,
          stripeId: session.id,
        },
      })
      return { stripeSession: session }
    } catch (err) {
      ctx.response.status = 500
      return err
    }
  },
}))
