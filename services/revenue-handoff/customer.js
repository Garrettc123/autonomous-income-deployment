'use strict';

/**
 * Upserts a customer record from a Stripe checkout session.
 * Returns a normalised customer object for downstream steps.
 *
 * In production this should persist to PostgreSQL / Redis.
 *
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {Promise<{id: string, email: string, name: string, amountTotal: number, currency: string}>}
 */

// RFC-5322-inspired regex – intentionally permissive but rejects obviously
// malformed values (missing @, missing domain, etc.)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function upsertCustomer(session) {
  const email = session.customer_details?.email ?? session.customer_email ?? '';
  const name = session.customer_details?.name ?? '';
  const id = session.customer ?? session.id;
  const amountTotal = session.amount_total ?? 0;
  const currency = (session.currency ?? 'usd').toUpperCase();

  if (!email || !EMAIL_RE.test(email)) {
    throw new Error(`[customer] Invalid or missing email for session ${session.id}: "${email}"`);
  }

  console.info(`[customer] Upsert customer ${id} (${email}), amount: ${amountTotal} ${currency}`);

  // TODO: persist to database
  return { id, email, name, amountTotal, currency };
}

module.exports = { upsertCustomer };
