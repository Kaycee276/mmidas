jest.mock('../src/config/prisma', () => {
  const mockStudent = {
    id: 'test-student-id-123',
    email: 'kene.econ@unn.edu.ng',
    full_name: 'Kenechukwu Eze',
    wallet_balance: 50000,
  };

  const mockTxn = {
    id: 'txn-123',
    student_id: 'test-student-id-123',
    amount: 5000,
    payment_reference: 'dep_mock_123',
    status: 'pending',
    balance_before: 50000,
    balance_after: 50000,
    metadata: {
      provider: 'bachs',
      currency: 'NGN',
      amount_str: '5000.00',
    },
  };
  const mockMerchantTxn = {
    id: 'merchant-txn-123',
    merchant_id: 'test-merchant-id-123',
    amount: 5000,
    payment_reference: 'mdep_mock_123',
    status: 'pending',
    balance_before: 20000,
    balance_after: 20000,
    metadata: { provider: 'bachs', account_type: 'merchant' },
  };
  const mockMerchant = {
    id: 'test-merchant-id-123',
    email: 'merchant@example.com',
    business_name: 'Demo Merchant',
    wallet_balance: 20000,
  };

  return {
    student: {
      findUnique: jest.fn().mockResolvedValue(mockStudent),
      findFirst: jest.fn().mockResolvedValue(mockStudent),
      update: jest.fn().mockResolvedValue({ ...mockStudent, wallet_balance: 55000 }),
    },
    merchant: {
      findUnique: jest.fn().mockResolvedValue(mockMerchant),
      update: jest.fn().mockResolvedValue({ ...mockMerchant, wallet_balance: 25000 }),
    },
    walletTransaction: {
      create: jest.fn().mockResolvedValue(mockTxn),
      findFirst: jest.fn().mockResolvedValue(mockTxn),
      findUnique: jest.fn().mockResolvedValue(mockTxn),
      update: jest.fn().mockResolvedValue({
        ...mockTxn,
        status: 'completed',
        balance_after: 55000,
      }),
    },
    merchantWalletTransaction: {
      create: jest.fn().mockResolvedValue(mockMerchantTxn),
      findFirst: jest.fn().mockResolvedValue(mockMerchantTxn),
      findUnique: jest.fn().mockResolvedValue(mockMerchantTxn),
      update: jest.fn().mockResolvedValue({
        ...mockMerchantTxn,
        status: 'completed',
        balance_after: 25000,
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn(async (cb) =>
      cb({
        walletTransaction: {
          findUnique: jest.fn().mockResolvedValue(mockTxn),
          update: jest.fn().mockResolvedValue({
            ...mockTxn,
            status: 'completed',
            balance_after: 55000,
          }),
        },
        student: {
          findUnique: jest.fn().mockResolvedValue(mockStudent),
          update: jest.fn().mockResolvedValue({ ...mockStudent, wallet_balance: 55000 }),
        },
        merchantWalletTransaction: {
          findUnique: jest.fn().mockResolvedValue(mockMerchantTxn),
          update: jest.fn().mockResolvedValue({
            ...mockMerchantTxn,
            status: 'completed',
            balance_after: 25000,
          }),
        },
        merchant: {
          findUnique: jest.fn().mockResolvedValue(mockMerchant),
          update: jest.fn().mockResolvedValue({ ...mockMerchant, wallet_balance: 25000 }),
        },
      })
    ),
  };
});

const prisma = require('../src/config/prisma');
const bachsService = require('../src/services/bachs.service');
const { WALLET_TRANSACTION_STATUS } = require('../src/types/enums');

describe('Bachs Payment Integration Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a checkout session with decimal string amount and pending transaction', async () => {
    const checkout = await bachsService.createWalletFundingCheckout({
      studentId: 'test-student-id-123',
      amount: 5000,
      origin: 'http://localhost:5173',
    });

    expect(checkout.reference).toMatch(/^dep_/);
    expect(checkout.checkout_id).toBeDefined();
    expect(checkout.checkout_url).toBeDefined();

    expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          student_id: 'test-student-id-123',
          amount: 5000,
          status: WALLET_TRANSACTION_STATUS.PENDING,
          metadata: expect.objectContaining({
            currency: 'NGN',
            amount_str: '5000.00',
          }),
        }),
      })
    );
  });

  it('rejects deposit amount under minimum ₦100', async () => {
    await expect(
      bachsService.createWalletFundingCheckout({
        studentId: 'test-student-id-123',
        amount: 50,
      })
    ).rejects.toThrow('Minimum deposit amount is ₦100');
  });

  it('creates a pending merchant wallet checkout', async () => {
    const checkout = await bachsService.createMerchantWalletFundingCheckout({
      merchantId: 'test-merchant-id-123',
      amount: 5000,
      origin: 'http://localhost:5173',
    });

    expect(checkout.reference).toMatch(/^mdep_/);
    expect(checkout.is_simulated).toBe(true);
    expect(prisma.merchantWalletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          merchant_id: 'test-merchant-id-123',
          type: 'deposit',
          amount: 5000,
          status: WALLET_TRANSACTION_STATUS.PENDING,
          metadata: expect.objectContaining({ account_type: 'merchant', currency: 'NGN' }),
        }),
      })
    );
  });

  it('credits a merchant wallet once when its checkout completes', async () => {
    const result = await bachsService.handleWebhookEvent({
      id: 'evt_merchant_123',
      type: 'checkout.completed',
      data: { reference: 'mdep_mock_123', checkout_id: 'chk_mock_merchant' },
    });

    expect(result.handled).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('fulfils checkout.completed webhook atomically and credits student balance', async () => {
    const webhookEvent = {
      id: 'evt_test_123',
      type: 'checkout.completed',
      created_at: new Date().toISOString(),
      data: {
        reference: 'dep_mock_123',
        checkout_id: 'chk_mock_123',
        amount: '5000.00',
        currency: 'NGN',
        status: 'completed',
      },
    };

    const result = await bachsService.handleWebhookEvent(webhookEvent);
    expect(result.handled).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('protects against duplicate delivery (idempotency)', async () => {
    // Return transaction already marked COMPLETED
    prisma.walletTransaction.findFirst.mockResolvedValueOnce({
      id: 'txn-123',
      student_id: 'test-student-id-123',
      amount: 5000,
      payment_reference: 'dep_mock_123',
      status: WALLET_TRANSACTION_STATUS.COMPLETED,
    });

    const webhookEvent = {
      id: 'evt_duplicate_456',
      type: 'collection.succeeded',
      created_at: new Date().toISOString(),
      data: {
        reference: 'dep_mock_123',
        checkout_id: 'chk_mock_123',
        amount: '5000.00',
        currency: 'NGN',
        status: 'completed',
      },
    };

    const result = await bachsService.handleWebhookEvent(webhookEvent);
    expect(result.handled).toBe(true);
    expect(result.reason).toBe('already_completed');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
