/** Server adapter boundary. The demo and browser never import this module.
 * Provider implementation must verify webhook signature BEFORE invoking reconciliation,
 * then query provider API with private server credentials. Client-returned objects are untrusted.
 */
export interface ServerOrder {
  id: string
  userId: string
  storeId: string
  amount: number
  currency: 'KRW'
  paymentId: string
}
export interface VerifiedReceipt {
  paymentId: string
  orderId: string
  customerId: string
  storeId: string
  amount: number
  currency: string
  status: 'PAID' | 'CANCELLED' | 'PENDING'
  cancelledAmount: number
}
export interface PaymentGateway {
  retrieve(paymentId: string): Promise<VerifiedReceipt>
  cancel(paymentId: string, idempotencyKey: string): Promise<void>
}
export interface PaymentLedger {
  recordPayment(
    orderId: string,
    paymentId: string,
    amount: number,
    currency: string,
  ): Promise<'paid' | 'refund_pending'>
  recordRefund(
    orderId: string,
    paymentId: string,
    success: boolean,
  ): Promise<void>
}
function validate(order: ServerOrder, receipt: VerifiedReceipt) {
  if (
    receipt.paymentId !== order.paymentId ||
    receipt.orderId !== order.id ||
    receipt.customerId !== order.userId ||
    receipt.storeId !== order.storeId ||
    receipt.amount !== order.amount ||
    receipt.currency !== order.currency ||
    !Number.isSafeInteger(receipt.amount) ||
    !Number.isSafeInteger(receipt.cancelledAmount) ||
    receipt.cancelledAmount < 0 ||
    receipt.cancelledAmount > receipt.amount
  )
    throw new Error('receipt_mismatch')
}
export async function reconcilePayment(
  order: ServerOrder,
  gateway: PaymentGateway,
  ledger: PaymentLedger,
) {
  const receipt = await gateway.retrieve(order.paymentId)
  validate(order, receipt)
  if (receipt.status !== 'PAID' || receipt.cancelledAmount !== 0)
    throw new Error('payment_not_paid')
  return ledger.recordPayment(
    order.id,
    order.paymentId,
    order.amount,
    order.currency,
  )
}
/** Call only for refund_pending/refund_failed rows after a durable claim/lease.
 * A cancellation response alone does not prove refund completion; retrieve again.
 * Unknown transport outcomes remain retryable, using the same idempotency key.
 */
export async function reconcileRefund(
  order: ServerOrder,
  gateway: PaymentGateway,
  ledger: PaymentLedger,
) {
  let receipt = await gateway.retrieve(order.paymentId)
  validate(order, receipt)
  if (
    receipt.status === 'CANCELLED' &&
    receipt.cancelledAmount === order.amount
  ) {
    await ledger.recordRefund(order.id, order.paymentId, true)
    return 'refunded'
  }
  if (receipt.status !== 'PAID' || receipt.cancelledAmount !== 0)
    throw new Error('manual_reconciliation_required')
  try {
    await gateway.cancel(order.paymentId, `dating-refund-${order.id}`)
  } catch {
    await ledger.recordRefund(order.id, order.paymentId, false)
    return 'retry'
  }
  receipt = await gateway.retrieve(order.paymentId)
  validate(order, receipt)
  if (
    receipt.status === 'CANCELLED' &&
    receipt.cancelledAmount === order.amount
  ) {
    await ledger.recordRefund(order.id, order.paymentId, true)
    return 'refunded'
  }
  return 'pending'
}
