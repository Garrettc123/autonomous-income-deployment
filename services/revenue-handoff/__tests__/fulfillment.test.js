'use strict';

jest.mock('../idempotency');
jest.mock('../customer');
jest.mock('../access');
jest.mock('../email');
jest.mock('../linear');

const { isDuplicate } = require('../idempotency');
const { upsertCustomer } = require('../customer');
const { generateApiAccess } = require('../access');
const { sendOnboardingEmail } = require('../email');
const { logFulfillmentEvidence } = require('../linear');
const { processCheckoutSession } = require('../fulfillment');

const mockEvent = {
  id: 'evt_test_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      customer: 'cus_test_1',
      amount_total: 4700,
      currency: 'usd',
      customer_details: { email: 'buyer@example.com', name: 'Buyer' },
    },
  },
};

describe('processCheckoutSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDuplicate.mockReturnValue(false);
    upsertCustomer.mockResolvedValue({ id: 'cus_test_1', email: 'buyer@example.com', name: 'Buyer', amountTotal: 4700, currency: 'USD' });
    generateApiAccess.mockResolvedValue({ apiKey: 'abc123', sessionId: 'cs_test_1', createdAt: '2026-01-01T00:00:00.000Z' });
    sendOnboardingEmail.mockResolvedValue();
    logFulfillmentEvidence.mockResolvedValue();
  });

  test('runs full pipeline for a new event', async () => {
    await processCheckoutSession(mockEvent);

    expect(isDuplicate).toHaveBeenCalledWith('evt_test_1');
    expect(upsertCustomer).toHaveBeenCalled();
    expect(generateApiAccess).toHaveBeenCalledWith('cs_test_1', expect.any(Object));
    expect(sendOnboardingEmail).toHaveBeenCalled();
    expect(logFulfillmentEvidence).toHaveBeenCalled();
  });

  test('skips pipeline for a duplicate event', async () => {
    isDuplicate.mockReturnValue(true);

    await processCheckoutSession(mockEvent);

    expect(upsertCustomer).not.toHaveBeenCalled();
    expect(generateApiAccess).not.toHaveBeenCalled();
    expect(sendOnboardingEmail).not.toHaveBeenCalled();
    expect(logFulfillmentEvidence).not.toHaveBeenCalled();
  });
});
