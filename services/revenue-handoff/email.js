'use strict';

/**
 * Sends an onboarding email to the customer after fulfillment.
 *
 * Uses an HTTP call to the configured email provider (e.g. SendGrid).
 * Set EMAIL_PROVIDER_URL and EMAIL_API_KEY environment variables.
 * If the variables are absent the function logs and skips sending.
 *
 * @param {{ email: string, name: string }} customer
 * @param {{ apiKey: string }} access
 * @returns {Promise<void>}
 */
async function sendOnboardingEmail(customer, access) {
  const providerUrl = process.env.EMAIL_PROVIDER_URL;
  const emailApiKey = process.env.EMAIL_API_KEY;
  const fromEmail = process.env.FROM_EMAIL ?? 'noreply@example.com';

  if (!providerUrl || !emailApiKey) {
    console.warn('[email] EMAIL_PROVIDER_URL or EMAIL_API_KEY not set – skipping send');
    return;
  }

  // Validate scheme to prevent SSRF
  const parsedUrl = new URL(providerUrl);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('EMAIL_PROVIDER_URL must use https');
  }

  const payload = {
    to: customer.email,
    from: fromEmail,
    subject: 'Welcome – your access is ready',
    text: [
      `Hi ${customer.name || customer.email},`,
      '',
      'Your purchase has been confirmed. Here is your API key:',
      '',
      `  ${access.apiKey}`,
      '',
      'Keep it safe – treat it like a password.',
      '',
      'If you have questions reply to this email.',
    ].join('\n'),
  };

  const response = await fetch(providerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + emailApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email send failed (${response.status}): ${text}`);
  }

  console.info(`[email] Onboarding email sent to ${customer.email}`);
}

module.exports = { sendOnboardingEmail };
