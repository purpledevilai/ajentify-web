/**
 * Transaction-type → human label map. Types are the doc 14 §3.4 enum. Sign
 * color is derived from the actual signed `amount` (not the type) because
 * `general_adjustment` can be either sign.
 */
export const TRANSACTION_LABELS: Record<string, string> = {
  starter_credit: "Starter credit",
  topup: "Top-up",
  auto_topup: "Auto top-up",
  subscription_charge: "Subscription charge",
  subscription_payment: "Subscription payment",
  allowance_grant: "Free usage grant",
  allowance_cleanup: "Free usage cleanup",
  dispute_adjustment: "Dispute adjustment",
  refund_adjustment: "Refund adjustment",
  general_adjustment: "Adjustment",
};

export function transactionLabel(type: string): string {
  return TRANSACTION_LABELS[type] ?? type;
}
