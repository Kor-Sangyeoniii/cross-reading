import { describe, expect, it, vi } from 'vitest'
import {
  reconcilePayment,
  reconcileRefund,
  type ServerOrder,
  type VerifiedReceipt,
} from './datingProvider'
const order: ServerOrder = {
  id: 'synthetic-order',
  userId: 'synthetic-user',
  storeId: 'synthetic-store',
  amount: 3000,
  currency: 'KRW',
  paymentId: 'synthetic-payment',
}
const receipt: VerifiedReceipt = {
  paymentId: order.paymentId,
  orderId: order.id,
  customerId: order.userId,
  storeId: order.storeId,
  amount: 3000,
  currency: 'KRW',
  status: 'PAID',
  cancelledAmount: 0,
}
const setup = () => ({
  gateway: {
    retrieve: vi.fn().mockResolvedValue({ ...receipt }),
    cancel: vi.fn().mockResolvedValue(undefined),
  },
  ledger: {
    recordPayment: vi.fn().mockResolvedValue('paid'),
    recordRefund: vi.fn().mockResolvedValue(undefined),
  },
})
describe('provider receipt boundary', () => {
  it.each([
    'amount',
    'currency',
    'storeId',
    'customerId',
    'orderId',
    'paymentId',
  ] as const)('rejects mismatched %s before recording', async (key) => {
    const { gateway, ledger } = setup()
    gateway.retrieve.mockResolvedValue({
      ...receipt,
      [key]: key === 'amount' ? 1 : 'different',
    })
    await expect(reconcilePayment(order, gateway, ledger)).rejects.toThrow(
      'receipt_mismatch',
    )
    expect(ledger.recordPayment).not.toHaveBeenCalled()
  })
  it('does not treat a pending payment as success', async () => {
    const { gateway, ledger } = setup()
    gateway.retrieve.mockResolvedValue({ ...receipt, status: 'PENDING' })
    await expect(reconcilePayment(order, gateway, ledger)).rejects.toThrow(
      'payment_not_paid',
    )
  })
  it('does not mark an asynchronous cancellation complete', async () => {
    const { gateway, ledger } = setup()
    expect(await reconcileRefund(order, gateway, ledger)).toBe('pending')
    expect(ledger.recordRefund).not.toHaveBeenCalled()
    expect(gateway.cancel).toHaveBeenCalledWith(
      order.paymentId,
      'dating-refund-synthetic-order',
    )
  })
  it('does not cancel twice after a lost response when provider reports full refund', async () => {
    const { gateway, ledger } = setup()
    gateway.retrieve.mockResolvedValue({
      ...receipt,
      status: 'CANCELLED',
      cancelledAmount: 3000,
    })
    expect(await reconcileRefund(order, gateway, ledger)).toBe('refunded')
    expect(gateway.cancel).not.toHaveBeenCalled()
  })
  it('failed cancellation remains retryable', async () => {
    const { gateway, ledger } = setup()
    gateway.cancel.mockRejectedValue(new Error('timeout'))
    expect(await reconcileRefund(order, gateway, ledger)).toBe('retry')
    expect(ledger.recordRefund).toHaveBeenCalledWith(
      order.id,
      order.paymentId,
      false,
    )
  })
})
