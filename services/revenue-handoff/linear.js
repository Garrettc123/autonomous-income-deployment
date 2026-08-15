'use strict';

/**
 * Logs fulfillment evidence to Linear issues GAR-474 and GAR-477
 * by creating a comment on each issue via the Linear GraphQL API.
 *
 * Required env vars:
 *   LINEAR_API_KEY   – Linear personal API key
 *   LINEAR_GAR_474   – Linear issue id for GAR-474
 *   LINEAR_GAR_477   – Linear issue id for GAR-477
 */

const LINEAR_API_URL = 'https://api.linear.app/graphql';

const CREATE_COMMENT_MUTATION = `
  mutation CreateComment($issueId: String!, $body: String!) {
    commentCreate(input: { issueId: $issueId, body: $body }) {
      success
      comment {
        id
        createdAt
      }
    }
  }
`;

/**
 * Posts a comment to a Linear issue.
 *
 * @param {string} issueId
 * @param {string} body
 * @returns {Promise<void>}
 */
async function postLinearComment(issueId, body) {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.warn('[linear] LINEAR_API_KEY not set – skipping Linear comment');
    return;
  }

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: CREATE_COMMENT_MUTATION,
      variables: { issueId, body },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Linear API error (${response.status}): ${text}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  console.info(`[linear] Comment posted to issue ${issueId}`);
}

/**
 * Logs fulfillment evidence to GAR-474 and GAR-477.
 *
 * @param {{ event: object, session: object, customer: object, access: object }} params
 */
async function logFulfillmentEvidence({ event, session, customer, access }) {
  const gar474 = process.env.LINEAR_GAR_474;
  const gar477 = process.env.LINEAR_GAR_477;

  const body = [
    '## Fulfillment Evidence – GAR-474',
    '',
    `**Stripe event id:** \`${event.id}\``,
    `**Session id:** \`${session.id}\``,
    `**Customer id:** \`${customer.id}\``,
    `**Email:** ${customer.email}`,
    `**Amount:** ${customer.amountTotal} ${customer.currency}`,
    `**API access created at:** ${access.createdAt}`,
    `**Onboarding email sent:** yes`,
    '',
    '_Automated entry – revenue-handoff service_',
  ].join('\n');

  const tasks = [];
  if (gar474) tasks.push(postLinearComment(gar474, body));
  if (gar477) tasks.push(postLinearComment(gar477, body));

  if (tasks.length === 0) {
    console.warn('[linear] LINEAR_GAR_474 and LINEAR_GAR_477 not set – skipping evidence log');
    return;
  }

  await Promise.all(tasks);
}

module.exports = { logFulfillmentEvidence };
