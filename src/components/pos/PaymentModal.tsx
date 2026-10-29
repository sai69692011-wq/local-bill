import React, { useRef, useState } from "react";
import type { PaymentMethod } from "../../../packages/pos-core/src/types";
import { formatCurrency } from "@/lib/pos";
import { t } from "@/lib/i18n";
import { useOrderPaymentStore } from "@/stores/order-payment-store";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: t.payment.methods.cash },
  { value: "transfer", label: t.payment.methods.transfer },
  { value: "card", label: t.payment.methods.card },
  { value: "other", label: t.payment.methods.other },
];
const methodLabel = (method: PaymentMethod) => PAYMENT_METHODS.find((entry) => entry.value === method)?.label ?? method;

type Receipt = { id: string; method: PaymentMethod; total: number; tender: number; change: number; timestamp: number };

export interface PaymentModalProps {
  open: boolean;
  orderTotal: number;
  onOpenChange: (open: false) => void;
  orderId?: string;
  tenantId?: string;
  staffId?: string;
  onBeforeConfirm?: () => boolean;
  /** Return false when table release or persist fails; receipt must not be shown. */
  onPaymentSuccess?: () => boolean | void | Promise<boolean | void>;
  /** Called once only when user closes a confirmed receipt. */
  onReceiptClose?: () => void;
}

const parseTender = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const tender = Number(value);
  return Number.isSafeInteger(tender) ? tender : null;
};

export function PaymentModal({ open, orderTotal, onOpenChange, orderId, tenantId, staffId, onBeforeConfirm, onPaymentSuccess, onReceiptClose }: PaymentModalProps) {
  const recordPayment = useOrderPaymentStore((state) => state.recordPayment);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [tenderInput, setTenderInput] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const receiptClosed = useRef(false);
  const tender = parseTender(tenderInput);
  const executable = Boolean(orderId && tenantId && staffId);
  const validTender = tender !== null && (selectedMethod === "cash" ? tender >= orderTotal : tender === orderTotal);
  const change = selectedMethod === "cash" && tender !== null && tender >= orderTotal ? tender - orderTotal : null;

  if (!open) return null;

  const confirm = async () => {
    if (paying || !executable || !validTender || tender === null || !orderId || !tenantId || !staffId) return;
    if (onBeforeConfirm && !onBeforeConfirm()) return;
    const timestamp = Date.now();
    const id = globalThis.crypto?.randomUUID?.() ?? `${timestamp}-${Math.random()}`;
    if (!recordPayment({ id, tenantId, orderId, amount: orderTotal, tender, method: selectedMethod, staffId, createdAt: timestamp })) return;
    setPaying(true);
    setPayError("");
    try {
      const lifecycle = await Promise.resolve(onPaymentSuccess?.());
      if (lifecycle === false) {
        setPayError(t.payment.persistError);
        return;
      }
      setReceipt({ id, method: selectedMethod, total: orderTotal, tender, change: selectedMethod === "cash" ? tender - orderTotal : 0, timestamp });
    } catch {
      setPayError(t.payment.persistError);
    } finally {
      setPaying(false);
    }
  };

  const closeReceipt = () => {
    if (!receipt || receiptClosed.current) return;
    receiptClosed.current = true;
    onReceiptClose?.();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !receipt && !paying && onOpenChange(false)}>
      <div role="dialog" aria-modal="true" aria-label={t.payment.dialogTitlePayment} className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-foreground">{receipt ? t.payment.dialogTitleReceipt : t.payment.dialogTitlePayment}</h2>
        {receipt ? (
          <section aria-label={t.payment.receiptAriaLabel} className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <p role="status" className="font-semibold text-primary">{t.payment.receiptSuccess}</p>
            <p>{t.payment.receiptPaymentId} <strong>{receipt.id}</strong></p>
            <p>{t.payment.receiptMethod} <strong>{methodLabel(receipt.method)}</strong></p>
            <p>{t.payment.receiptTotal} <strong>{formatCurrency(receipt.total)}</strong></p>
            <p>{t.payment.receiptTender} <strong>{formatCurrency(receipt.tender)}</strong></p>
            <p>{t.payment.receiptChange} <strong>{formatCurrency(receipt.change)}</strong></p>
            <p>{t.payment.receiptTime} <time dateTime={new Date(receipt.timestamp).toISOString()}>{new Date(receipt.timestamp).toLocaleString("en-US")}</time></p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => window.print()} className="rounded-lg border border-input bg-background py-2.5 font-semibold">{t.payment.printReceiptButton}</button>
              <button type="button" onClick={closeReceipt} className="rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground">{t.payment.closeReceiptButton}</button>
            </div>
          </section>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.payment.totalLabel}</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(orderTotal)}</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-foreground">{t.payment.methodHeading}</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selectedMethod === value}
                    onClick={() => setSelectedMethod(value)}
                    className={["rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors", selectedMethod === value ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted"].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {executable && (
              <div className="mt-4">
                <label htmlFor="payment-tender" className="mb-2 block text-sm font-medium text-foreground">{t.payment.tenderLabel}</label>
                <input
                  id="payment-tender"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={tenderInput}
                  onChange={(event) => setTenderInput(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5"
                />
                {change !== null && <p className="mt-2 text-sm text-muted-foreground">{t.payment.changePrefix}{formatCurrency(change)}</p>}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {executable && (
                <button
                  type="button"
                  disabled={!validTender || paying}
                  onClick={() => { void confirm(); }}
                  className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {t.payment.confirmButton}
                </button>
              )}
              <button
                type="button"
                aria-label={t.payment.cancelButton}
                disabled={paying}
                onClick={() => !paying && onOpenChange(false)}
                className="rounded-lg border border-input bg-background py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40"
              >
                {t.payment.cancelButton}
              </button>
            </div>
            {payError && <p role="alert" className="mt-2 text-sm text-destructive">{payError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
