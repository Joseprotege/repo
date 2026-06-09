/**
 * StripePaymentModal — collects the lister's card details via Stripe Elements
 * and confirms the PaymentIntent created by stripe-create-payment-intent.
 *
 * Flow:
 *  1. Mount with paymentRequestId + amount + fee context for display.
 *  2. On mount, call createPaymentIntent() → receive client_secret.
 *  3. Mount <Elements> with the client_secret and a <PaymentElement>.
 *  4. On submit, stripe.confirmPayment() — Stripe authorizes the funds.
 *  5. Because the PaymentIntent uses capture_method='manual', the
 *     'amount_capturable_updated' webhook flips payment_request.status='held'.
 */
import React, { useEffect, useState } from 'react';
import { X, Loader2, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Elements, PaymentElement,
  useStripe, useElements,
} from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { getStripe } from '../../lib/stripe';
import { createPaymentIntent } from '../../services/payments';

interface Props {
  paymentRequestId: string;
  amountCents: number;
  platformFeeCents: number;
  helperPayoutCents: number;
  onClose: () => void;
  /** Called after the lister successfully authorizes the payment. */
  onAuthorized: () => void;
}

function centsToDisplay(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Inner form (must live inside <Elements>) ─────────────────────────────────

const PaymentForm: React.FC<{
  amountCents: number;
  clientSecret: string;
  onAuthorized: () => void;
}> = ({ amountCents, clientSecret, onAuthorized }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [elementReady, setElementReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !elementReady) return;
    setSubmitting(true);
    setError(null);

    // Step 1: validate the form fields before hitting Stripe's API.
    // Required for @stripe/stripe-js v3+ — calling confirmPayment directly
    // without this throws "elements should have a mounted PaymentElement".
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Card validation failed');
      setSubmitting(false);
      return;
    }

    // Step 2: authorise (not capture) the funds. capture_method='manual' means
    // the PI moves to 'requires_capture' — money is held until we explicitly
    // capture it when the task is marked complete.
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      clientSecret,
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment authorization failed');
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === 'requires_capture'
                       || paymentIntent.status === 'succeeded'
                       || paymentIntent.status === 'processing')) {
      setSucceeded(true);
      // Give the webhook a moment to flip our DB state, then notify parent
      setTimeout(() => onAuthorized(), 800);
    } else {
      setError(`Unexpected payment status: ${paymentIntent?.status ?? 'unknown'}`);
      setSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
        <p className="font-bold text-emerald-700 mb-1">Funds authorized</p>
        <p className="text-sm text-slate-500">Your payment is held safely in escrow until you mark the task complete.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} onReady={() => setElementReady(true)} />

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || !elementReady || submitting}
        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700
          disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {submitting
          ? <Loader2 size={16} className="animate-spin" />
          : !elementReady
            ? <Loader2 size={16} className="animate-spin" />
            : <Lock size={16} />}
        {elementReady ? `Authorize ${centsToDisplay(amountCents)}` : 'Loading…'}
      </button>

      <p className="text-[10px] text-slate-400 text-center leading-relaxed">
        Funds are authorized now but only captured (released to the helper) when you
        mark the task complete. Powered by Stripe — your card details never touch Foster's servers.
      </p>
    </form>
  );
};

// ── Outer modal — handles Elements setup ─────────────────────────────────────

export const StripePaymentModal: React.FC<Props> = ({
  paymentRequestId,
  amountCents,
  platformFeeCents,
  helperPayoutCents,
  onClose,
  onAuthorized,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    createPaymentIntent(paymentRequestId).then(({ clientSecret: cs, error: err }) => {
      if (!mounted) return;
      if (err || !cs) {
        setError(err ?? 'Could not start payment session');
      } else {
        setClientSecret(cs);
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [paymentRequestId]);

  const elementsOptions: StripeElementsOptions | null = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'flat',
          variables: { colorPrimary: '#0d9488' /* teal-600 */ },
        },
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="font-black text-slate-900">Fund escrow</p>
            <p className="text-xs text-slate-500 mt-0.5">Authorize {centsToDisplay(amountCents)} to start the task</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Fee summary */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>You pay</span>
            <span className="font-semibold text-slate-700">{centsToDisplay(amountCents)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Platform fee</span>
            <span>{centsToDisplay(platformFeeCents)}</span>
          </div>
          <div className="flex justify-between font-bold text-teal-700 border-t border-slate-200 pt-1">
            <span>Helper receives</span>
            <span>{centsToDisplay(helperPayoutCents)}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          )}

          {error && (
            <div className="text-center py-6">
              <AlertTriangle size={36} className="text-red-500 mx-auto mb-3" />
              <p className="font-bold text-slate-700 mb-1">Couldn't start payment</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && elementsOptions && clientSecret && (
            <Elements stripe={getStripe()} options={elementsOptions}>
              <PaymentForm amountCents={amountCents} clientSecret={clientSecret} onAuthorized={onAuthorized} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};
