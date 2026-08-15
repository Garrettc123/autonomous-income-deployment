'use strict';

/**
 * Stripe webhook handler for GAR-474 revenue automation handoff.
 *
 * Pipeline:
 *   Stripe checkout.session.completed
 *     → idempotency guard
 *     → upsert customer record
 *     → generate fulfillment (API key)
 *     → send onboarding email
 *     → log evidence to Linear (GAR-474, GAR-477)
 */

const express = require('express');
const stripe = require('stripe');
const { processCheckoutSession } = require('./fulfillment');

const router = express.Router();

// Maximum raw body accepted from Stripe (Stripe payloads are well under 64 kb)
const STRIPE_RAW_BODY_LIMIT = '64kb';

/**
 * POST /webhook/stripe
 *
 * Receives raw body so Stripe signature verification works.
 * Mount this router BEFORE express.json() middleware.
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json', limit: STRIPE_RAW_BODY_LIMIT }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
      event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
      try {
        await processCheckoutSession(event);
        return res.status(200).json({ received: true });
      } catch (err) {
        console.error('Error processing checkout session:', err);
        return res.status(500).json({ error: 'Fulfillment error' });
      }
    }

    // Acknowledge unhandled event types without error
    return res.status(200).json({ received: true });
  }
);

module.exports = router;
