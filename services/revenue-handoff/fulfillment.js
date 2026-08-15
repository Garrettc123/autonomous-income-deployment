'use strict';

const crypto = require('crypto');
const { isDuplicate } = require('./idempotency');
const { upsertCustomer } = require('./customer');
const { generateApiAccess } = require('./access');
const { sendOnboardingEmail } = require('./email');
const { logFulfillmentEvidence } = require('./linear');

/**
 * Process a Stripe checkout.session.completed event end-to-end.
 *
 * @param {import('stripe').Stripe.Event} event
 */
async function processCheckoutSession(event) {
  const session = event.data.object;
  const eventId = event.id;

  // 1. Idempotency guard – skip if already processed
  if (isDuplicate(eventId)) {
    console.info(`[fulfillment] Skipping duplicate event ${eventId}`);
    return;
  }

  console.info(`[fulfillment] Processing event ${eventId}, session ${session.id}`);

  // 2. Upsert customer record
  const customer = await upsertCustomer(session);

  // 3. Generate fulfillment (API access) – idempotent by session id
  const access = await generateApiAccess(session.id, customer);

  // 4. Send onboarding email
  await sendOnboardingEmail(customer, access);

  // 5. Log evidence to Linear
  await logFulfillmentEvidence({ event, session, customer, access });

  console.info(`[fulfillment] Completed handoff for event ${eventId}`);
}

module.exports = { processCheckoutSession };
