import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function getStripePublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || "";
}
